use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Only the counter authority can update this counter")]
    Unauthorized,

    #[msg("Counter has reached the maximum value")]
    CounterOverflow,

    #[msg("Campaign title cannot be empty or exceed 50 characters")]
    InvalidTitle,

    #[msg("Campaign description cannot be empty or exceed 280 characters")]
    InvalidDescription,

    #[msg("Campaign goal must be greater than zero")]
    InvalidGoal,

    #[msg("Campaign deadline must be in the future")]
    InvalidDeadline,

    #[msg("Donation amount must be greater than zero")]
    InvalidDonationAmount,
    #[msg("Campaign deadline has passed")]
    CampaignEnded,
    #[msg("Donation would exceed the campaign goal")]
    GoalExceeded,
    #[msg("Donation amount calculation overflowed")]
    ArithmeticOverflow,
    #[msg("Withdrawal amount must be greater than zero")]
    InvalidWithdrawalAmount,

    #[msg("Withdrawal exceeds available campaign funds")]
    InsufficientAvailableFunds,

    #[msg("Vault does not contain enough SOL")]
    InsufficientVaultBalance,
    #[msg("Campaign vault must be empty before closing")]
    CampaignHasRemainingFunds,

    #[msg("Invalid campaign vault")]
    InvalidVault,
}
