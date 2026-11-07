use {
    anchor_lang::{
        prelude::Pubkey, solana_program::instruction::Instruction, AccountDeserialize,
        InstructionData, ToAccountMetas,
    },
    litesvm::LiteSVM,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

#[test]
fn test_update_campaign() {
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

    let mut svm = LiteSVM::new();

    let bytes = include_bytes!(concat!(
        env!("CARGO_TARGET_TMPDIR"),
        "/../deploy/trustfund.so"
    ));

    svm.add_program(program_id, bytes).unwrap();

    svm.airdrop(&owner.pubkey(), 2_000_000_000).unwrap();
    svm.airdrop(&attacker.pubkey(), 1_000_000_000).unwrap();

    // 1. Create campaign.
    let create_ix = Instruction::new_with_bytes(
        program_id,
        &trustfund::instruction::CreateCampaign {
            campaign_id,
            title: "Original Title".to_string(),
            description: "Original Description".to_string(),
            goal: 2_000_000_000,
            deadline: 2_000_000_000,
        }
        .data(),
        trustfund::accounts::CreateCampaign {
            owner: owner.pubkey(),
            campaign,
            system_program: anchor_lang::solana_program::system_program::ID,
        }
        .to_account_metas(None),
    );

    let blockhash = svm.latest_blockhash();

    let message = Message::new_with_blockhash(&[create_ix], Some(&owner.pubkey()), &blockhash);

    let transaction =
        VersionedTransaction::try_new(VersionedMessage::Legacy(message), &[&owner]).unwrap();

    let create_result = svm.send_transaction(transaction);

    assert!(
        create_result.is_ok(),
        "Campaign creation failed: {:?}",
        create_result
    );

    // 2. Owner updates campaign details.
    let update_ix = Instruction::new_with_bytes(
        program_id,
        &trustfund::instruction::UpdateCampaign {
            title: "Updated Title".to_string(),
            description: "Updated Description".to_string(),
        }
        .data(),
        trustfund::accounts::UpdateCampaign {
            owner: owner.pubkey(),
            campaign,
        }
        .to_account_metas(None),
    );

    let blockhash_2 = svm.latest_blockhash();

    let message_2 = Message::new_with_blockhash(&[update_ix], Some(&owner.pubkey()), &blockhash_2);

    let transaction_2 =
        VersionedTransaction::try_new(VersionedMessage::Legacy(message_2), &[&owner]).unwrap();

    let update_result = svm.send_transaction(transaction_2);

    assert!(
        update_result.is_ok(),
        "Campaign update failed: {:?}",
        update_result
    );

    // 3. Verify updated campaign details.
    let account = svm.get_account(&campaign).unwrap();
    let mut data: &[u8] = &account.data;

    let campaign_state = trustfund::state::Campaign::try_deserialize(&mut data).unwrap();

    assert_eq!(campaign_state.title, "Updated Title");
    assert_eq!(campaign_state.description, "Updated Description");

    // 4. Attacker attempts to update campaign.
    let unauthorized_ix = Instruction::new_with_bytes(
        program_id,
        &trustfund::instruction::UpdateCampaign {
            title: "Hacked Title".to_string(),
            description: "Unauthorized update".to_string(),
        }
        .data(),
        trustfund::accounts::UpdateCampaign {
            owner: attacker.pubkey(),
            campaign,
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
        "Attacker must not update another owner's campaign"
    );

    // 5. Verify attacker did not change campaign details.
    let account_after_attack = svm.get_account(&campaign).unwrap();
    let mut data_after_attack: &[u8] = &account_after_attack.data;

    let final_state = trustfund::state::Campaign::try_deserialize(&mut data_after_attack).unwrap();

    assert_eq!(final_state.title, "Updated Title");
    assert_eq!(final_state.description, "Updated Description");

    println!("Owner update successful!");
    println!("Unauthorized update rejected!");
    // 6. Owner attempts to update with an empty title.
    let empty_title_ix = Instruction::new_with_bytes(
        program_id,
        &trustfund::instruction::UpdateCampaign {
            title: "".to_string(),
            description: "Valid description".to_string(),
        }
        .data(),
        trustfund::accounts::UpdateCampaign {
            owner: owner.pubkey(),
            campaign,
        }
        .to_account_metas(None),
    );

    let blockhash_4 = svm.latest_blockhash();

    let message_4 =
        Message::new_with_blockhash(&[empty_title_ix], Some(&owner.pubkey()), &blockhash_4);

    let transaction_4 =
        VersionedTransaction::try_new(VersionedMessage::Legacy(message_4), &[&owner]).unwrap();

    let empty_title_result = svm.send_transaction(transaction_4);

    assert!(
        empty_title_result.is_err(),
        "Empty campaign title must be rejected"
    );

    println!("Empty title rejected!");
    // 7. Owner attempts to use a title longer than 50 characters.
    let long_title_ix = Instruction::new_with_bytes(
        program_id,
        &trustfund::instruction::UpdateCampaign {
            title: "A".repeat(51),
            description: "Valid description".to_string(),
        }
        .data(),
        trustfund::accounts::UpdateCampaign {
            owner: owner.pubkey(),
            campaign,
        }
        .to_account_metas(None),
    );

    let blockhash_5 = svm.latest_blockhash();

    let message_5 =
        Message::new_with_blockhash(&[long_title_ix], Some(&owner.pubkey()), &blockhash_5);

    let transaction_5 =
        VersionedTransaction::try_new(VersionedMessage::Legacy(message_5), &[&owner]).unwrap();

    let long_title_result = svm.send_transaction(transaction_5);

    assert!(
        long_title_result.is_err(),
        "Title longer than 50 characters must be rejected"
    );

    println!("Long title rejected!");
    // 8. Owner attempts to update with an empty description.
    let empty_description_ix = Instruction::new_with_bytes(
        program_id,
        &trustfund::instruction::UpdateCampaign {
            title: "Valid Title".to_string(),
            description: "".to_string(),
        }
        .data(),
        trustfund::accounts::UpdateCampaign {
            owner: owner.pubkey(),
            campaign,
        }
        .to_account_metas(None),
    );

    let blockhash_6 = svm.latest_blockhash();

    let message_6 =
        Message::new_with_blockhash(&[empty_description_ix], Some(&owner.pubkey()), &blockhash_6);

    let transaction_6 =
        VersionedTransaction::try_new(VersionedMessage::Legacy(message_6), &[&owner]).unwrap();

    let empty_description_result = svm.send_transaction(transaction_6);

    assert!(
        empty_description_result.is_err(),
        "Empty campaign description must be rejected"
    );

    println!("Empty description rejected!");
    // 9. Owner attempts to use a description longer than 280 characters.
    let long_description_ix = Instruction::new_with_bytes(
        program_id,
        &trustfund::instruction::UpdateCampaign {
            title: "Valid Title".to_string(),
            description: "A".repeat(281),
        }
        .data(),
        trustfund::accounts::UpdateCampaign {
            owner: owner.pubkey(),
            campaign,
        }
        .to_account_metas(None),
    );

    let blockhash_7 = svm.latest_blockhash();

    let message_7 =
        Message::new_with_blockhash(&[long_description_ix], Some(&owner.pubkey()), &blockhash_7);

    let transaction_7 =
        VersionedTransaction::try_new(VersionedMessage::Legacy(message_7), &[&owner]).unwrap();

    let long_description_result = svm.send_transaction(transaction_7);

    assert!(
        long_description_result.is_err(),
        "Description longer than 280 characters must be rejected"
    );

    println!("Long description rejected!");
    // 10. Verify invalid updates did not modify campaign data.
    let final_account = svm.get_account(&campaign).unwrap();
    let mut final_data: &[u8] = &final_account.data;

    let final_campaign = trustfund::state::Campaign::try_deserialize(&mut final_data).unwrap();

    assert_eq!(final_campaign.title, "Updated Title");
    assert_eq!(final_campaign.description, "Updated Description");

    println!("Campaign data remained unchanged after invalid updates!");
    println!("All update campaign security tests passed!");
}
