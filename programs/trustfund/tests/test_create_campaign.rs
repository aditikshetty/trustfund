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
fn test_create_campaign() {
    let program_id = trustfund::id();
    let owner = Keypair::new();

    let campaign_id = 1u64;

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

    svm.airdrop(&owner.pubkey(), 1_000_000_000).unwrap();

    let instruction = Instruction::new_with_bytes(
        program_id,
        &trustfund::instruction::CreateCampaign {
            campaign_id,
            title: "Help Rural Students".to_string(),
            description: "Supporting education for students".to_string(),
            goal: 5_000_000_000,
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

    let blockhash = svm.latest_blockhash();

    let message = Message::new_with_blockhash(&[instruction], Some(&owner.pubkey()), &blockhash);

    let transaction =
        VersionedTransaction::try_new(VersionedMessage::Legacy(message), &[&owner]).unwrap();

    let result = svm.send_transaction(transaction);

    assert!(result.is_ok(), "Campaign creation failed: {:?}", result);

    let account = svm.get_account(&campaign).unwrap();

    let mut data: &[u8] = &account.data;

    let campaign_state = trustfund::state::Campaign::try_deserialize(&mut data).unwrap();

    assert_eq!(campaign_state.owner, owner.pubkey());
    assert_eq!(campaign_state.campaign_id, campaign_id);
    assert_eq!(campaign_state.title, "Help Rural Students");
    assert_eq!(campaign_state.goal, 5_000_000_000);
    assert_eq!(campaign_state.raised, 0);
    assert_eq!(campaign_state.withdrawn, 0);

    println!("Campaign creation test passed!");
}
