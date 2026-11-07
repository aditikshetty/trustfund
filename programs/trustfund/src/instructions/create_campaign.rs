use anchor_lang::prelude::*;

use crate::{constants::*, error::ErrorCode, state::Campaign};

#[derive(Accounts)]
#[instruction(campaign_id: u64)]
pub struct CreateCampaign<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        space = 8 + Campaign::INIT_SPACE,
        seeds = [
            CAMPAIGN_SEED,
            owner.key().as_ref(),
            campaign_id.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub campaign: Account<'info, Campaign>,

    pub system_program: Program<'info, System>,
}

pub fn handle_create_campaign(
    ctx: Context<CreateCampaign>,
    campaign_id: u64,
    title: String,
    description: String,
    goal: u64,
    deadline: i64,
) -> Result<()> {
    require!(
        !title.trim().is_empty() && title.len() <= MAX_TITLE_LENGTH,
        ErrorCode::InvalidTitle
    );

    require!(
        !description.trim().is_empty() && description.len() <= MAX_DESCRIPTION_LENGTH,
        ErrorCode::InvalidDescription
    );

    require!(goal > 0, ErrorCode::InvalidGoal);

    let clock = Clock::get()?;

    require!(deadline > clock.unix_timestamp, ErrorCode::InvalidDeadline);

    let campaign = &mut ctx.accounts.campaign;

    campaign.owner = ctx.accounts.owner.key();
    campaign.campaign_id = campaign_id;
    campaign.title = title;
    campaign.description = description;
    campaign.goal = goal;
    campaign.raised = 0;
    campaign.withdrawn = 0;
    campaign.deadline = deadline;
    campaign.bump = ctx.bumps.campaign;

    msg!("TrustFund campaign created successfully!");

    Ok(())
}
