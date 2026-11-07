use anchor_lang::prelude::*;

use crate::{
    constants::{CAMPAIGN_SEED, VAULT_SEED},
    error::ErrorCode,
    state::Campaign,
};

#[derive(Accounts)]
pub struct CloseCampaign<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        close = owner,
        has_one = owner,
        seeds = [
            CAMPAIGN_SEED,
            campaign.owner.as_ref(),
            campaign.campaign_id.to_le_bytes().as_ref()
        ],
        bump = campaign.bump
    )]
    pub campaign: Account<'info, Campaign>,

    /// CHECK: PDA is validated using its seeds.
    pub vault: UncheckedAccount<'info>,
}

pub fn handle_close_campaign(ctx: Context<CloseCampaign>) -> Result<()> {
    require!(
        ctx.accounts.vault.key()
            == Pubkey::find_program_address(
                &[VAULT_SEED, ctx.accounts.campaign.key().as_ref()],
                ctx.program_id
            )
            .0,
        ErrorCode::InvalidVault
    );

    require!(
        ctx.accounts.vault.lamports() == 0,
        ErrorCode::CampaignHasRemainingFunds
    );

    msg!("Campaign closed successfully!");
    Ok(())
}
