
import {
  AnchorProvider,
  Program,
  type Idl,
} from '@coral-xyz/anchor'

import type { AnchorWallet } from '@solana/wallet-adapter-react'
import type { Connection } from '@solana/web3.js'

import trustfundIdl from '../idl/trustfund.json'

export const PROGRAM_ID =
  'CYyMeWq69riVG1RSHQYQArWc2TTyB7DxWBULvu2UxGF9'

export function getTrustFundProgram(
  connection: Connection,
  wallet: AnchorWallet,
) {
  const provider = new AnchorProvider(
    connection,
    wallet,
    AnchorProvider.defaultOptions(),
  )

  const program = new Program(
    trustfundIdl as Idl,
    provider,
  )

  return program
}

