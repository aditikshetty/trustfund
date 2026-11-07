use anchor_lang::prelude::*;

use crate::{
    constants::{CAMPAIGN_SEED, VAULT_SEED},
    state::Campaign,
};

#[derive(Accounts)]
pub struct Donate<'info> {
    #[account(mut)]
    pub donor: Signer<'info>,

    #[account(
        mut,
        seeds = [
            CAMPAIGN_SEED,
            campaign.owner.as_ref(),
            campaign.campaign_id.to_le_bytes().as_ref()
        ],
        bump = campaign.bump
    )]
    pub campaign: Account<'info, Campaign>,

    /// CHECK: This PDA is used only as the campaign's SOL vault.
    #[account(
        mut,
        seeds = [
            VAULT_SEED,
            campaign.key().as_ref()
        ],
        bump,
        owner = system_program::ID,
    )]
    pub vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}
pub fn handle_donate(ctx: Context<Donate>, amount: u64) -> Result<()> {
    // Donation must be positive
    require!(amount > 0, crate::error::ErrorCode::InvalidDonationAmount);

    // Campaign must still be active
    let clock = Clock::get()?;

    require!(
        clock.unix_timestamp < ctx.accounts.campaign.deadline,
        crate::error::ErrorCode::CampaignEnded
    );

    // Calculate the new total safely
    let new_raised = ctx
        .accounts
        .campaign
        .raised
        .checked_add(amount)
        .ok_or(crate::error::ErrorCode::ArithmeticOverflow)?;

    // Do not allow donations beyond the goal
    require!(
        new_raised <= ctx.accounts.campaign.goal,
        crate::error::ErrorCode::GoalExceeded
    );

    // Transfer SOL from donor to campaign vault
    let cpi_accounts = anchor_lang::system_program::Transfer {
        from: ctx.accounts.donor.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
    };

    let cpi_context = CpiContext::new(ctx.accounts.system_program.key(), cpi_accounts);

    anchor_lang::system_program::transfer(cpi_context, amount)?;

    // Update campaign's raised amount
    ctx.accounts.campaign.raised = new_raised;

    msg!("Donation received: {} lamports", amount);

    Ok(())
}
