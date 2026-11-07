use {
    anchor_lang::{
        prelude::Pubkey,
        solana_program::{instruction::Instruction, system_program},
        InstructionData, ToAccountMetas,
    },
    litesvm::LiteSVM,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

#[test]
fn test_close_campaign() {
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

    svm.airdrop(&owner.pubkey(), 3_000_000_000).unwrap();
    svm.airdrop(&attacker.pubkey(), 1_000_000_000).unwrap();

    // 1. Create campaign.
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

    // 2. Donate 1 SOL.
    let donate_ix = Instruction::new_with_bytes(
        program_id,
        &trustfund::instruction::Donate {
            amount: 1_000_000_000,
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

    assert!(
        svm.send_transaction(transaction).is_ok(),
        "Campaign creation and donation failed"
    );

    println!("Campaign created and 1 SOL donated!");

    // 3. Owner tries to close while funds remain.
    let close_ix = Instruction::new_with_bytes(
        program_id,
        &trustfund::instruction::CloseCampaign {}.data(),
        trustfund::accounts::CloseCampaign {
            owner: owner.pubkey(),
            campaign,
            vault,
        }
        .to_account_metas(None),
    );

    let blockhash_2 = svm.latest_blockhash();

    let message_2 =
        Message::new_with_blockhash(&[close_ix.clone()], Some(&owner.pubkey()), &blockhash_2);

    let transaction_2 =
        VersionedTransaction::try_new(VersionedMessage::Legacy(message_2), &[&owner]).unwrap();

    let close_with_funds = svm.send_transaction(transaction_2);

    assert!(
        close_with_funds.is_err(),
        "Campaign must not close while funds remain"
    );

    println!("Closing with remaining funds rejected!");

    // 4. Attacker tries to close the campaign.

    // 4. Attacker tries to close the campaign.

    // Build a separate instruction using the attacker's public key.
    let unauthorized_close_ix = Instruction::new_with_bytes(
        program_id,
        &trustfund::instruction::CloseCampaign {}.data(),
        trustfund::accounts::CloseCampaign {
            owner: attacker.pubkey(),
            campaign,
            vault,
        }
        .to_account_metas(None),
    );

    let blockhash_3 = svm.latest_blockhash();

    let message_3 = Message::new_with_blockhash(
        &[unauthorized_close_ix],
        Some(&attacker.pubkey()),
        &blockhash_3,
    );

    let transaction_3 =
        VersionedTransaction::try_new(VersionedMessage::Legacy(message_3), &[&attacker]).unwrap();

    let unauthorized_close = svm.send_transaction(transaction_3);

    assert!(
        unauthorized_close.is_err(),
        "Attacker must not close another owner's campaign"
    );

    println!("Unauthorized campaign closure rejected!");

    // 5. Owner withdraws all remaining SOL.
    let withdraw_ix = Instruction::new_with_bytes(
        program_id,
        &trustfund::instruction::Withdraw {
            amount: 1_000_000_000,
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
        Message::new_with_blockhash(&[withdraw_ix], Some(&owner.pubkey()), &blockhash_4);

    let transaction_4 =
        VersionedTransaction::try_new(VersionedMessage::Legacy(message_4), &[&owner]).unwrap();

    assert!(
        svm.send_transaction(transaction_4).is_ok(),
        "Owner must be able to withdraw all remaining funds"
    );

    println!("All campaign funds withdrawn!");

    // 6. Owner closes the empty campaign.
    svm.expire_blockhash();

    let blockhash_5 = svm.latest_blockhash();

    let message_5 = Message::new_with_blockhash(&[close_ix], Some(&owner.pubkey()), &blockhash_5);

    let transaction_5 =
        VersionedTransaction::try_new(VersionedMessage::Legacy(message_5), &[&owner]).unwrap();

    let close_result = svm.send_transaction(transaction_5);

    assert!(
        close_result.is_ok(),
        "Owner should close campaign after withdrawing all funds: {:?}",
        close_result
    );

    println!("Campaign closed successfully!");

    // 7. Verify campaign account no longer exists.
    assert!(
        svm.get_account(&campaign).is_none(),
        "Campaign account should be closed"
    );

    println!("Campaign account successfully removed!");
    println!("All close campaign tests passed!");
}
