# TrustFund — Transparent Crowdfunding on Solana

TrustFund is a decentralized crowdfunding application built on Solana. It enables campaign creators to raise SOL transparently, allows contributors to donate directly to campaign vaults, and gives campaign owners controlled access to withdraw funds.

**Built with:** Rust · Anchor · Solana · React · TypeScript · Vite

## Overview

Traditional crowdfunding platforms often rely on centralized payment processing and fund management. TrustFund uses Solana smart contracts to make campaign funding and withdrawals verifiable on-chain.

Every campaign has an owner, a funding goal, a deadline, and an associated vault PDA. Donations and withdrawals are processed through the Anchor program.

## Features

- **Create campaigns:** Set a title, description, funding goal, and deadline.
- **Wallet integration:** Connect using Phantom.
- **SOL donations:** Contribute directly to campaigns on Solana Devnet.
- **Progress tracking:** View funds raised, funding percentage, and remaining goal.
- **Owner-only withdrawals:** Only the campaign owner can withdraw available funds.
- **Withdrawal accounting:** Track the amount raised and withdrawn separately.
- **Campaign updates:** Campaign owners can update campaign information.
- **Campaign closure:** Close eligible campaigns after the required funds have been withdrawn.

## Technology Stack

| Layer | Technology |
|---|---|
| Blockchain | Solana Devnet |
| Smart contracts | Rust, Anchor |
| Frontend | React 19, TypeScript |
| Build tooling | Vite |
| Wallet | Phantom |
| Solana integration | Solana Web3.js |
| Program integration | Anchor TypeScript client |
| Styling | Tailwind CSS |

## Architecture

```text
                  USER
                   |
                   v
             React Frontend
             (TypeScript)
                   |
                   v
           Phantom Wallet
                   |
                   v
          Solana Wallet Adapter
                   |
                   v
             Anchor Client
                   |
                   v
          TrustFund Program
              (Rust)
                   |
          +--------+--------+
          |        |        |
          v        v        v
       Campaign  Donate  Withdraw
        PDA      SOL      SOL
          |        |        |
          +--------+--------+
                   |
                   v
             Vault PDA
                   |
                   v
              Solana
               Devnet
```

## Smart Contract

**Program ID**

`CYyMeWq69riVG1RSHQYQArWc2TTyB7DxWBULvu2UxGF9`

**Network:** Solana Devnet

[View TrustFund on Solana Explorer](https://explorer.solana.com/address/CYyMeWq69riVG1RSHQYQArWc2TTyB7DxWBULvu2UxGF9?cluster=devnet)

### On-chain instructions

| Instruction | Description |
|---|---|
| `create_campaign` | Creates a campaign account. |
| `donate` | Transfers SOL into the campaign vault. |
| `withdraw` | Allows the campaign owner to withdraw available funds. |
| `update_campaign` | Updates campaign title and description. |
| `close_campaign` | Closes an eligible campaign account. |

### Campaign account

Each campaign stores:

- Owner public key
- Campaign ID
- Title
- Description
- Funding goal
- Total amount raised
- Total amount withdrawn
- Deadline
- PDA bump

Campaign and vault accounts use Program Derived Addresses (PDAs).

## Security

TrustFund enforces important restrictions inside the on-chain program:

- Only the campaign owner can withdraw.
- Withdrawals must be greater than zero.
- Withdrawals cannot exceed available funds.
- Available funds are calculated using `raised - withdrawn`.
- The vault PDA is validated using its seeds.
- Campaign ownership is checked during owner-authorized operations.
- Campaign closure is restricted when funds remain.

The frontend also hides withdrawal controls from non-owner wallets. However, the actual authorization is enforced by the smart contract, not just the frontend.

**Current limitation:** The application does not implement donor refunds or individual donor contribution records. Donations should be treated as contributions to the campaign.

## Project Structure

```text
trustfund/
│
├── app/
│   ├── src/
│   │   ├── App.tsx
│   │   └── lib/
│   ├── package.json
│   └── vite.config.ts
│
├── programs/
│   └── trustfund/
│       ├── src/
│       │   ├── instructions/
│       │   │   ├── create_campaign.rs
│       │   │   ├── donate.rs
│       │   │   ├── withdraw.rs
│       │   │   ├── update_campaign.rs
│       │   │   └── close_campaign.rs
│       │   ├── constants.rs
│       │   ├── error.rs
│       │   ├── instructions.rs
│       │   ├── lib.rs
│       │   └── state.rs
│       └── tests/
│
├── Anchor.toml
├── Cargo.toml
└── Cargo.lock
```

## Getting Started

### Prerequisites

Install the following tools:

- Rust and Cargo
- Solana CLI
- Anchor CLI
- Node.js and npm
- Phantom Wallet browser extension

### 1. Clone the repository

```bash
git clone https://github.com/aditikshetty/trustfund.git
cd trustfund
```

### 2. Build the Solana program

```bash
anchor build
```

### 3. Run the Rust tests

```bash
cargo test -p trustfund
```

### 4. Install frontend dependencies

```bash
cd app
npm install
```

### 5. Start the frontend

```bash
npm run dev
```

Open the local URL displayed by Vite in your browser.

Connect Phantom using the Solana Devnet network.

## Testing

The project includes integration tests using LiteSVM.

The test suite covers:

- Program initialization
- Campaign creation
- SOL donations
- Campaign updates
- Owner withdrawals
- Campaign closure

### Withdrawal security tests

The withdrawal integration test verifies:

1. The campaign owner can withdraw 0.5 SOL.
2. An unauthorized wallet cannot withdraw.
3. The owner cannot withdraw more than the available amount.
4. A zero-value withdrawal is rejected.
5. Campaign withdrawal accounting remains correct.
6. The remaining vault balance is correct.

**Latest test result:** 6 integration tests passed, 0 failed.

```bash
cargo test -p trustfund
```

## Production Build

Build the frontend:

```bash
cd app
npm run build
```

Preview the production build locally:

```bash
npm run preview -- --host 0.0.0.0
```

## Repository

[GitHub — aditikshetty/trustfund](https://github.com/aditikshetty/trustfund)

## Future Improvements

- Individual donor contribution records.
- Donor refund mechanisms.
- Campaign activity and transaction history.
- Improved campaign discovery and filtering.
- More comprehensive automated security tests.

---

**TrustFund — Making crowdfunding more transparent, accessible, and verifiable through Solana.**
