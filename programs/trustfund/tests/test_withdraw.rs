use {
    anchor_lang::{
        prelude::Pubkey,
        solana_program::{instruction::Instruction, system_program},
        AccountDeserialize, InstructionData, ToAccountMetas,
    },
    litesvm::LiteSVM,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

#[test]
fn test_withdraw() {
    let program_id = trustfund::id();
    let owner = Keypair::new();
    let attacker = Keypair::new();

    let campaign_id = 1u64;

    // Derive campaign PDA.
    let campaign = Pubkey::find_program_address(
        &[
            b"campaign",
            owner.pubkey().as_ref(),
            &campaign_id.to_le_bytes(),
        ],
        &program_id,
    )
    .0;

    // Derive vault PDA.
    let vault = Pubkey::find_program_address(&[b"vault", campaign.as_ref()], &program_id).0;

    let mut svm = LiteSVM::new();

    let bytes = include_bytes!(concat!(
        env!("CARGO_TARGET_TMPDIR"),
        "/../deploy/trustfund.so"
    ));

    svm.add_program(program_id, bytes).unwrap();

    // Fund owner and attacker wallets.
    svm.airdrop(&owner.pubkey(), 2_000_000_000).unwrap();
    svm.airdrop(&attacker.pubkey(), 1_000_000_000).unwrap();

    // --------------------------------------------------
    // 1. Create campaign.
    // --------------------------------------------------

    let create_ix = Instruction::new_with_bytes(
        program_id,
        &trustfund::instruction::CreateCampaign {
            campaign_id,
            title: "Help Students".to_string(),
            description: "Supporting education".to_string(),
            goal: 2_000_000_000,
            deadline: 2_000_000_000,
        }
        .data(),
        trustfund::accounts::CreateCampaign {
            owner: owner.pubkey(),
            campaign,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    // --------------------------------------------------
    // 2. Donate 1 SOL.
    // --------------------------------------------------

    let donation_amount = 1_000_000_000u64;

    let donate_ix = Instruction::new_with_bytes(
        program_id,
        &trustfund::instruction::Donate {
            amount: donation_amount,
        }
        .data(),
        trustfund::accounts::Donate {
            donor: owner.pubkey(),
            campaign,
            vault,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    let blockhash = svm.latest_blockhash();

    let message =
        Message::new_with_blockhash(&[create_ix, donate_ix], Some(&owner.pubkey()), &blockhash);

    let transaction =
        VersionedTransaction::try_new(VersionedMessage::Legacy(message), &[&owner]).unwrap();

    let result = svm.send_transaction(transaction);

    assert!(result.is_ok(), "Create or donation failed: {:?}", result);

    println!("Campaign created and 1 SOL donated!");

    // --------------------------------------------------
    // 3. Owner withdraws 0.5 SOL successfully.
    // --------------------------------------------------

    let withdrawal_amount = 500_000_000u64;

    let withdraw_ix = Instruction::new_with_bytes(
        program_id,
        &trustfund::instruction::Withdraw {
            amount: withdrawal_amount,
        }
        .data(),
        trustfund::accounts::Withdraw {
            owner: owner.pubkey(),
            campaign,
            vault,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    let blockhash_2 = svm.latest_blockhash();

    let message_2 =
        Message::new_with_blockhash(&[withdraw_ix], Some(&owner.pubkey()), &blockhash_2);

    let transaction_2 =
        VersionedTransaction::try_new(VersionedMessage::Legacy(message_2), &[&owner]).unwrap();

    let withdraw_result = svm.send_transaction(transaction_2);

    assert!(
        withdraw_result.is_ok(),
        "Withdrawal failed: {:?}",
        withdraw_result
    );

    println!("Owner withdrawal successful!");

    // --------------------------------------------------
    // 4. Attacker attempts unauthorized withdrawal.
    // --------------------------------------------------

    let unauthorized_ix = Instruction::new_with_bytes(
        program_id,
        &trustfund::instruction::Withdraw {
            amount: 100_000_000,
        }
        .data(),
        trustfund::accounts::Withdraw {
            owner: attacker.pubkey(),
            campaign,
            vault,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    let blockhash_3 = svm.latest_blockhash();

    let message_3 =
        Message::new_with_blockhash(&[unauthorized_ix], Some(&attacker.pubkey()), &blockhash_3);

    let transaction_3 =
        VersionedTransaction::try_new(VersionedMessage::Legacy(message_3), &[&attacker]).unwrap();

    let unauthorized_result = svm.send_transaction(transaction_3);

    assert!(
        unauthorized_result.is_err(),
        "Unauthorized wallet must not withdraw campaign funds"
    );

    println!("Unauthorized withdrawal rejected!");

    // --------------------------------------------------
    // 5. Owner attempts to withdraw more than available.
    // Remaining balance is only 0.5 SOL.
    // --------------------------------------------------

    let over_withdraw_ix = Instruction::new_with_bytes(
        program_id,
        &trustfund::instruction::Withdraw {
            amount: 600_000_000,
        }
        .data(),
        trustfund::accounts::Withdraw {
            owner: owner.pubkey(),
            campaign,
            vault,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    let blockhash_4 = svm.latest_blockhash();

    let message_4 =
        Message::new_with_blockhash(&[over_withdraw_ix], Some(&owner.pubkey()), &blockhash_4);

    let transaction_4 =
        VersionedTransaction::try_new(VersionedMessage::Legacy(message_4), &[&owner]).unwrap();

    let over_withdraw_result = svm.send_transaction(transaction_4);

    assert!(
        over_withdraw_result.is_err(),
        "Owner must not withdraw more than available funds"
    );

    println!("Over-withdrawal rejected!");

    // --------------------------------------------------
    // 6. Owner attempts to withdraw zero SOL.
    // --------------------------------------------------

    let zero_ix = Instruction::new_with_bytes(
        program_id,
        &trustfund::instruction::Withdraw { amount: 0 }.data(),
        trustfund::accounts::Withdraw {
            owner: owner.pubkey(),
            campaign,
            vault,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    let blockhash_5 = svm.latest_blockhash();

    let message_5 = Message::new_with_blockhash(&[zero_ix], Some(&owner.pubkey()), &blockhash_5);

    let transaction_5 =
        VersionedTransaction::try_new(VersionedMessage::Legacy(message_5), &[&owner]).unwrap();

    let zero_result = svm.send_transaction(transaction_5);

    assert!(zero_result.is_err(), "Zero withdrawal must fail");

    println!("Zero withdrawal rejected!");

    // --------------------------------------------------
    // 7. Verify campaign withdrawal history.
    // --------------------------------------------------

    let account = svm.get_account(&campaign).unwrap();
    let mut data: &[u8] = &account.data;

    let campaign_state = trustfund::state::Campaign::try_deserialize(&mut data).unwrap();

    assert_eq!(campaign_state.raised, 1_000_000_000);
    assert_eq!(campaign_state.withdrawn, 500_000_000);

    // --------------------------------------------------
    // 8. Verify remaining vault balance.
    // --------------------------------------------------

    let vault_account = svm.get_account(&vault).unwrap();

    assert_eq!(vault_account.lamports, 500_000_000);

    println!("All withdrawal tests passed!");
    println!("Remaining vault balance: 0.5 SOL");
}
