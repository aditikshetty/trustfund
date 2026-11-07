use anchor_lang::prelude::*;

use crate::{
    constants::{CAMPAIGN_SEED, VAULT_SEED},
    error::ErrorCode,
    state::Campaign,
};

#[derive(Accounts)]
pub struct Withdraw<'info> {
    // Only the campaign owner can authorize withdrawal.
    #[account(mut)]
    pub owner: Signer<'info>,

    // Verify that this campaign belongs to the signing owner.
    #[account(
        mut,
        has_one = owner,
        seeds = [
            CAMPAIGN_SEED,
            campaign.owner.as_ref(),
            campaign.campaign_id.to_le_bytes().as_ref()
        ],
        bump = campaign.bump
    )]
    pub campaign: Account<'info, Campaign>,

    // The program controls this PDA vault.
    /// CHECK: Address is validated using PDA seeds.
    #[account(
    mut,
    seeds = [
        VAULT_SEED,
        campaign.key().as_ref()
    ],
    bump,
    owner = system_program::ID
)]
    /// CHECK: PDA address and System Program ownership are validated.
    pub vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle_withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    // Withdrawal amount must be positive.
    require!(amount > 0, ErrorCode::InvalidWithdrawalAmount);

    // Calculate funds that have not yet been withdrawn.
    let available = ctx
        .accounts
        .campaign
        .raised
        .checked_sub(ctx.accounts.campaign.withdrawn)
        .ok_or(ErrorCode::ArithmeticOverflow)?;

    require!(amount <= available, ErrorCode::InsufficientAvailableFunds);

    // Verify the vault actually holds enough SOL.
    require!(
        ctx.accounts.vault.lamports() >= amount,
        ErrorCode::InsufficientVaultBalance
    );

    // PDA signer seeds authorize the vault transfer.
    let campaign_key = ctx.accounts.campaign.key();
    let bump = [ctx.bumps.vault];

    let vault_seeds: &[&[u8]] = &[VAULT_SEED, campaign_key.as_ref(), bump.as_ref()];

    let signer_seeds = &[vault_seeds];

    let cpi_accounts = anchor_lang::system_program::Transfer {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.owner.to_account_info(),
    };

    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.system_program.key(),
        cpi_accounts,
        signer_seeds,
    );

    anchor_lang::system_program::transfer(cpi_context, amount)?;

    // Update withdrawal history only after successful transfer.
    ctx.accounts.campaign.withdrawn = ctx
        .accounts
        .campaign
        .withdrawn
        .checked_add(amount)
        .ok_or(ErrorCode::ArithmeticOverflow)?;

    msg!("Withdrawal successful: {} lamports", amount);

    Ok(())
}
