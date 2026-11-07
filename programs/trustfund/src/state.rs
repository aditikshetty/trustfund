use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Counter {
    pub count: u64,
    pub authority: Pubkey,
}

#[account]
#[derive(InitSpace)]
pub struct Campaign {
    pub owner: Pubkey,
    pub campaign_id: u64,

    #[max_len(50)]
    pub title: String,

    #[max_len(280)]
    pub description: String,

    pub goal: u64,
    pub raised: u64,
    pub withdrawn: u64,
    pub deadline: i64,
    pub bump: u8,
}
