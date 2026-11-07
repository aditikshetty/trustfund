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
fn test_donate() {
    let program_id = trustfund::id();
    let donor = Keypair::new();

    let campaign_id = 1u64;

    let campaign = Pubkey::find_program_address(
        &[
            b"campaign",
            donor.pubkey().as_ref(),
            &campaign_id.to_le_bytes(),
        ],
        &program_id,
    )
    .0;

    let vault = Pubkey::find_program_address(&[b"vault", campaign.as_ref()], &program_id).0;

    let mut svm = LiteSVM::new();

    let bytes = include_bytes!(concat!(
        env!("CARGO_TARGET_TMPDIR"),
        "/../deploy/trustfund.so"
    ));

    svm.add_program(program_id, bytes).unwrap();

    svm.airdrop(&donor.pubkey(), 2_000_000_000).unwrap();

    // 1. Create campaign with a goal of 1.5 SOL.
    let create_ix = Instruction::new_with_bytes(
        program_id,
        &trustfund::instruction::CreateCampaign {
            campaign_id,
            title: "Help Students".to_string(),
            description: "Supporting education".to_string(),
            goal: 1_500_000_000,
            deadline: 2_000_000_000,
        }
        .data(),
        trustfund::accounts::CreateCampaign {
            owner: donor.pubkey(),
            campaign,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    // 2. Create two valid donation instructions.
    let amount = 1_000_000_000u64;
    let second_amount = 500_000_000u64;

    let donate_ix = Instruction::new_with_bytes(
        program_id,
        &trustfund::instruction::Donate { amount }.data(),
        trustfund::accounts::Donate {
            donor: donor.pubkey(),
            campaign,
            vault,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    let donate_ix_2 = Instruction::new_with_bytes(
        program_id,
        &trustfund::instruction::Donate {
            amount: second_amount,
        }
        .data(),
        trustfund::accounts::Donate {
            donor: donor.pubkey(),
            campaign,
            vault,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    // 3. Execute campaign creation and valid donations.
    let blockhash = svm.latest_blockhash();

    let message = Message::new_with_blockhash(
        &[create_ix, donate_ix, donate_ix_2],
        Some(&donor.pubkey()),
        &blockhash,
    );

    let transaction =
        VersionedTransaction::try_new(VersionedMessage::Legacy(message), &[&donor]).unwrap();

    let result = svm.send_transaction(transaction);

    assert!(result.is_ok(), "Donation failed: {:?}", result);

    println!("Valid donations successful!");

    // 4. Try donating 1 extra lamport after reaching the goal.
    let third_amount = 1u64;

    let donate_ix_3 = Instruction::new_with_bytes(
        program_id,
        &trustfund::instruction::Donate {
            amount: third_amount,
        }
        .data(),
        trustfund::accounts::Donate {
            donor: donor.pubkey(),
            campaign,
            vault,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    let blockhash_2 = svm.latest_blockhash();

    let message_2 =
        Message::new_with_blockhash(&[donate_ix_3], Some(&donor.pubkey()), &blockhash_2);

    let transaction_2 =
        VersionedTransaction::try_new(VersionedMessage::Legacy(message_2), &[&donor]).unwrap();

    let result_2 = svm.send_transaction(transaction_2);

    assert!(
        result_2.is_err(),
        "Donation should fail because it exceeds the campaign goal"
    );

    println!("Over-goal donation rejected!");

    // 5. Try a zero-amount donation.
    let zero_amount = 0u64;

    let zero_donate_ix = Instruction::new_with_bytes(
        program_id,
        &trustfund::instruction::Donate {
            amount: zero_amount,
        }
        .data(),
        trustfund::accounts::Donate {
            donor: donor.pubkey(),
            campaign,
            vault,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    let blockhash_3 = svm.latest_blockhash();

    let message_3 =
        Message::new_with_blockhash(&[zero_donate_ix], Some(&donor.pubkey()), &blockhash_3);

    let transaction_3 =
        VersionedTransaction::try_new(VersionedMessage::Legacy(message_3), &[&donor]).unwrap();

    let result_3 = svm.send_transaction(transaction_3);

    assert!(result_3.is_err(), "Zero-amount donation should be rejected");

    println!("Zero-amount donation rejected!");

    // 6. Verify campaign balance is still 1.5 SOL.
    let account = svm.get_account(&campaign).unwrap();
    let mut data: &[u8] = &account.data;

    let campaign_state = trustfund::state::Campaign::try_deserialize(&mut data).unwrap();

    assert_eq!(campaign_state.raised, amount + second_amount);

    // 7. Verify vault balance is still 1.5 SOL.
    let vault_account = svm.get_account(&vault).unwrap();

    assert_eq!(vault_account.lamports, amount + second_amount);

    println!("Campaign balance and vault balance verified!");
    println!("All donation tests passed!");
}
