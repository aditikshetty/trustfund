pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("CYyMeWq69riVG1RSHQYQArWc2TTyB7DxWBULvu2UxGF9");

#[program]
pub mod trustfund {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        crate::instructions::initialize::handle_initialize(ctx)
    }

    pub fn increment(ctx: Context<Increment>) -> Result<()> {
        crate::instructions::increment::handle_increment(ctx)
    }
    pub fn create_campaign(
        ctx: Context<CreateCampaign>,
        campaign_id: u64,
        title: String,
        description: String,
        goal: u64,
        deadline: i64,
    ) -> Result<()> {
        crate::instructions::create_campaign::handle_create_campaign(
            ctx,
            campaign_id,
            title,
            description,
            goal,
            deadline,
        )
    }
    pub fn donate(ctx: Context<Donate>, amount: u64) -> Result<()> {
        crate::instructions::donate::handle_donate(ctx, amount)
    }
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        crate::instructions::withdraw::handle_withdraw(ctx, amount)
    }
    pub fn update_campaign(
        ctx: Context<UpdateCampaign>,
        title: String,
        description: String,
    ) -> Result<()> {
        crate::instructions::update_campaign::handle_update_campaign(ctx, title, description)
    }
    pub fn close_campaign(ctx: Context<CloseCampaign>) -> Result<()> {
        crate::instructions::close_campaign::handle_close_campaign(ctx)
    }
}
