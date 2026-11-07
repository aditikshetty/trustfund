use anchor_lang::prelude::*;

use crate::{
    constants::{CAMPAIGN_SEED, MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH},
    error::ErrorCode,
    state::Campaign,
};

#[derive(Accounts)]
pub struct UpdateCampaign<'info> {
    pub owner: Signer<'info>,

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
}

pub fn handle_update_campaign(
    ctx: Context<UpdateCampaign>,
    title: String,
    description: String,
) -> Result<()> {
    // Validate title.
    require!(
        !title.trim().is_empty() && title.len() <= MAX_TITLE_LENGTH,
        ErrorCode::InvalidTitle
    );

    // Validate description.
    require!(
        !description.trim().is_empty() && description.len() <= MAX_DESCRIPTION_LENGTH,
        ErrorCode::InvalidDescription
    );

    // Update campaign details.
    ctx.accounts.campaign.title = title;
    ctx.accounts.campaign.description = description;

    msg!("Campaign details updated successfully!");

    Ok(())
}
