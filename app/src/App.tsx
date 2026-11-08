
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import {
  ArrowRight,
  ArrowUpRight,
  Heart,
  ShieldCheck,
  Wallet,
  Menu,
  X,
  RefreshCw,
} from 'lucide-react'

import {
  useWallet,
  useConnection,
  useAnchorWallet,
} from '@solana/wallet-adapter-react'

import { useWalletModal } from '@solana/wallet-adapter-react-ui'

import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from '@solana/web3.js'

import { BN } from '@coral-xyz/anchor'
import { Buffer } from 'buffer'
import { getTrustFundProgram } from './lib/anchor'

type CampaignView = {
  address: string
  owner: string
  campaignId: string
  category: string
  title: string
  description: string
  raised: number
  withdrawn: number
  goal: number
  deadline: number
  image: string
}

const DEMO_CAMPAIGNS: CampaignView[] = [
  {
    address: 'demo-1',
    owner: '',
    campaignId: '1',
    category: 'Education',
    title: 'Help children get access to education',
    description:
      'Give children the books, supplies and opportunities they deserve.',
    raised: 3.2,
    withdrawn: 0,
    goal: 5,
    deadline: 0,
    image:
      'https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=900&q=85',
  },
  {
    address: 'demo-2',
    owner: '',
    campaignId: '2',
    category: 'Healthcare',
    title: 'Healthcare support for rural families',
    description:
      'Help families access essential medical care and treatment.',
    raised: 4.5,
    withdrawn: 0,
    goal: 6,
    deadline: 0,
    image:
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=900&q=85',
  },
  {
    address: 'demo-3',
    owner: '',
    campaignId: '3',
    category: 'Environment',
    title: 'Build a greener tomorrow',
    description:
      'Support tree planting and create a cleaner environment.',
    raised: 2.7,
    withdrawn: 0,
    goal: 4,
    deadline: 0,
    image:
      'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=85',
  },
]

const DEFAULT_CAMPAIGN_IMAGE =
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=900&q=85'

const PROGRAM_ID = new PublicKey(
  'CYyMeWq69riVG1RSHQYQArWc2TTyB7DxWBULvu2UxGF9',
)

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0
  return Number(value.toString())
}

function getLocalDateTimeMin() {
  const date = new Date(Date.now() + 60000)
  const offset = date.getTimezoneOffset()

  const localDate = new Date(
    date.getTime() - offset * 60 * 1000,
  )

  return localDate.toISOString().slice(0, 16)
}

function App() {
  // Campaign creation state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [campaignTitle, setCampaignTitle] = useState('')
  const [campaignDescription, setCampaignDescription] = useState('')
  const [campaignGoal, setCampaignGoal] = useState('')
  const [campaignDeadline, setCampaignDeadline] = useState('')
  const [creatingCampaign, setCreatingCampaign] = useState(false)

  // Donation state
  const [donationAmounts, setDonationAmounts] = useState<
    Record<string, string>
  >({})
  const [donatingCampaign, setDonatingCampaign] = useState('')

  // Withdrawal state
  const [withdrawalAmounts, setWithdrawalAmounts] = useState<
    Record<string, string>
  >({})
  const [withdrawingCampaign, setWithdrawingCampaign] = useState('')

  // General application state
  const [menuOpen, setMenuOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [liveCampaigns, setLiveCampaigns] =
    useState<CampaignView[] | null>(null)
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [campaignError, setCampaignError] = useState('')

  // Wallet
  const { publicKey, connected, disconnect } = useWallet()
  const { setVisible } = useWalletModal()
  const anchorWallet = useAnchorWallet()
  const { connection } = useConnection()

  const walletAddress = publicKey?.toBase58()

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
    : ''

  // Anchor client
  const program = useMemo(
    () =>
      anchorWallet
        ? getTrustFundProgram(connection, anchorWallet)
        : null,
    [connection, anchorWallet],
  )

  // Fetch live campaigns
  useEffect(() => {
    if (!program || !anchorWallet) {
      setLiveCampaigns(null)
      setCampaignError('')
      setLoadingCampaigns(false)
      return
    }

    let cancelled = false

    async function loadCampaigns() {
      setLoadingCampaigns(true)
      setCampaignError('')

      try {
        const accounts = await (
          program!.account as any
        ).campaign.all()

        const mappedCampaigns: CampaignView[] = accounts.map(
          (item: any) => {
            const account = item.account

            return {
              address: item.publicKey.toBase58(),
              owner: account.owner.toBase58(),
              campaignId: account.campaignId.toString(),
              category: 'Community',
              title: account.title,
              description: account.description,
              goal:
                toNumber(account.goal) /
                LAMPORTS_PER_SOL,
              raised:
                toNumber(account.raised) /
                LAMPORTS_PER_SOL,
              withdrawn:
                toNumber(account.withdrawn) /
                LAMPORTS_PER_SOL,
              deadline: toNumber(account.deadline),
              image: DEFAULT_CAMPAIGN_IMAGE,
            }
          },
        )

        if (!cancelled) {
          setLiveCampaigns(mappedCampaigns)
        }
      } catch (error) {
        console.error('Failed to fetch campaigns:', error)

        if (!cancelled) {
          setCampaignError(
            error instanceof Error
              ? error.message
              : 'Unable to load campaigns from Devnet.',
          )
          setLiveCampaigns([])
        }
      } finally {
        if (!cancelled) {
          setLoadingCampaigns(false)
        }
      }
    }

    void loadCampaigns()

    return () => {
      cancelled = true
    }
  }, [program, anchorWallet])

  const displayedCampaigns = connected
    ? liveCampaigns ?? []
    : DEMO_CAMPAIGNS

  // Wallet connect/disconnect
  const handleWalletClick = async () => {
    if (connected) {
      try {
        await disconnect()
        setNotice('Wallet disconnected.')
      } catch (error) {
        console.error(error)
        setNotice('Unable to disconnect wallet.')
      }
    } else {
      setVisible(true)
    }

    setMenuOpen(false)
  }

  // Refresh live campaigns
  const handleRefresh = async () => {
    if (!connected || !program) return

    setLoadingCampaigns(true)
    setCampaignError('')

    try {
      const accounts = await (
        program.account as any
      ).campaign.all()

      const mapped: CampaignView[] = accounts.map(
        (item: any) => ({
          address: item.publicKey.toBase58(),
          owner: item.account.owner.toBase58(),
          campaignId: item.account.campaignId.toString(),
          category: 'Community',
          title: item.account.title,
          description: item.account.description,
          goal:
            toNumber(item.account.goal) /
            LAMPORTS_PER_SOL,
          raised:
            toNumber(item.account.raised) /
            LAMPORTS_PER_SOL,
          withdrawn:
            toNumber(item.account.withdrawn) /
            LAMPORTS_PER_SOL,
          deadline: toNumber(item.account.deadline),
          image: DEFAULT_CAMPAIGN_IMAGE,
        }),
      )

      setLiveCampaigns(mapped)
    } catch (error) {
      console.error('Unable to refresh campaigns:', error)

      setCampaignError(
        error instanceof Error
          ? error.message
          : 'Unable to refresh campaigns.',
      )
    } finally {
      setLoadingCampaigns(false)
    }
  }

  // Create campaign
  const handleCreateCampaign = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (!program || !publicKey || !connected) {
      setNotice('Connect your Phantom wallet first.')
      return
    }

    if (
      creatingCampaign ||
      donatingCampaign !== '' ||
      withdrawingCampaign !== ''
    ) return

    const title = campaignTitle.trim()
    const description = campaignDescription.trim()
    const goal = Number(campaignGoal)

    const deadlineMilliseconds = new Date(
      campaignDeadline,
    ).getTime()

    const deadlineSeconds = Math.floor(
      deadlineMilliseconds / 1000,
    )

    if (!title || title.length > 50) {
      setNotice('Title must contain 1–50 characters.')
      return
    }

    if (!description || description.length > 280) {
      setNotice('Description must contain 1–280 characters.')
      return
    }

    if (!Number.isFinite(goal) || goal <= 0) {
      setNotice('Enter a valid fundraising goal in SOL.')
      return
    }

    if (
      !Number.isFinite(deadlineMilliseconds) ||
      deadlineSeconds <= Math.floor(Date.now() / 1000)
    ) {
      setNotice('Please select a future deadline.')
      return
    }

    const goalLamports = Math.round(
      goal * LAMPORTS_PER_SOL,
    )

    if (
      !Number.isSafeInteger(goalLamports) ||
      goalLamports <= 0
    ) {
      setNotice('The fundraising goal is invalid or too large.')
      return
    }

    setCreatingCampaign(true)
    setNotice('Preparing your campaign transaction...')

    try {
      const accounts = await (
        program.account as any
      ).campaign.all()

      const ownerCampaigns = accounts.filter(
        (item: any) =>
          item.account.owner.toBase58() ===
          publicKey.toBase58(),
      )

      const maxId = ownerCampaigns.reduce(
        (max: bigint, item: any) => {
          const id = BigInt(
            item.account.campaignId.toString(),
          )
          return id > max ? id : max
        },
        0n,
      )

      const nextId = maxId + 1n

      const [campaignPda] =
        PublicKey.findProgramAddressSync(
          [
            Buffer.from('campaign'),
            publicKey.toBuffer(),
            new BN(nextId.toString()).toArrayLike(
              Buffer,
              'le',
              8,
            ),
          ],
          PROGRAM_ID,
        )

      setNotice('Please approve the transaction in Phantom.')

      const signature = await (
        program.methods as any
      )
        .createCampaign(
          new BN(nextId.toString()),
          title,
          description,
          new BN(goalLamports.toString()),
          new BN(deadlineSeconds.toString()),
        )
        .accounts({
          owner: publicKey,
          campaign: campaignPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      await connection.confirmTransaction(
        signature,
        'confirmed',
      )

      setNotice(
        `Campaign created successfully! Transaction: ${signature}`,
      )

      setCampaignTitle('')
      setCampaignDescription('')
      setCampaignGoal('')
      setCampaignDeadline('')
      setShowCreateForm(false)

      await handleRefresh()
    } catch (error) {
      console.error('Campaign creation failed:', error)

      setNotice(
        error instanceof Error
          ? `Campaign creation failed: ${error.message}`
          : 'Campaign creation failed. Check the browser console.',
      )
    } finally {
      setCreatingCampaign(false)
    }
  }

  // Donate to a campaign
  const handleDonate = async (
    campaign: CampaignView,
  ) => {
    if (!program || !publicKey || !connected) {
      setNotice('Connect your Phantom wallet first.')
      return
    }

    if (
      donatingCampaign !== '' ||
      creatingCampaign ||
      withdrawingCampaign !== ''
    ) return

    const amount = Number(
      donationAmounts[campaign.address],
    )

    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice('Enter a valid donation amount in SOL.')
      return
    }

    const amountLamports = Math.round(
      amount * LAMPORTS_PER_SOL,
    )

    if (
      !Number.isSafeInteger(amountLamports) ||
      amountLamports <= 0
    ) {
      setNotice('Invalid donation amount.')
      return
    }

    const remainingGoal =
      campaign.goal - campaign.raised

    if (amountLamports > Math.round(
      Math.max(0, remainingGoal) * LAMPORTS_PER_SOL,
    )) {
      setNotice(
        `Only ${Math.max(0, remainingGoal).toFixed(6)} SOL remains to reach the goal.`,
      )
      return
    }

    if (
      campaign.deadline <=
      Math.floor(Date.now() / 1000)
    ) {
      setNotice('This campaign has already ended.')
      return
    }

    setDonatingCampaign(campaign.address)
    setNotice('Preparing your donation transaction...')

    try {
      const campaignPda = new PublicKey(
        campaign.address,
      )

      const [vaultPda] =
        PublicKey.findProgramAddressSync(
          [
            Buffer.from('vault'),
            campaignPda.toBuffer(),
          ],
          PROGRAM_ID,
        )

      setNotice('Please approve your donation in Phantom.')

      const signature = await (
        program.methods as any
      )
        .donate(new BN(amountLamports.toString()))
        .accounts({
          donor: publicKey,
          campaign: campaignPda,
          vault: vaultPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      await connection.confirmTransaction(
        signature,
        'confirmed',
      )

      setNotice(
        `Donation successful! ${amount} SOL donated. Transaction: ${signature}`,
      )

      setDonationAmounts((previous) => ({
        ...previous,
        [campaign.address]: '',
      }))

      await handleRefresh()
    } catch (error) {
      console.error('Donation failed:', error)

      setNotice(
        error instanceof Error
          ? `Donation failed: ${error.message}`
          : 'Donation failed. Check the browser console.',
      )
    } finally {
      setDonatingCampaign('')
    }
  }

  // Withdraw funds from a campaign
  const handleWithdraw = async (
    campaign: CampaignView,
  ) => {
    if (!program || !publicKey || !connected) {
      setNotice('Connect your Phantom wallet first.')
      return
    }

    if (
      withdrawingCampaign !== '' ||
      donatingCampaign !== '' ||
      creatingCampaign
    ) return

    const amount = Number(
      withdrawalAmounts[campaign.address],
    )

    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice('Enter a valid withdrawal amount in SOL.')
      return
    }

    const amountLamports = Math.round(
      amount * LAMPORTS_PER_SOL,
    )

    if (
      !Number.isSafeInteger(amountLamports) ||
      amountLamports <= 0
    ) {
      setNotice('Invalid withdrawal amount.')
      return
    }

    const availableLamports = Math.max(
      0,
      Math.round(
        (campaign.raised - campaign.withdrawn) *
          LAMPORTS_PER_SOL,
      ),
    )

    if (amountLamports > availableLamports) {
      setNotice(
        `Only ${(availableLamports / LAMPORTS_PER_SOL).toFixed(6)} SOL is available to withdraw.`,
      )
      return
    }

    if (campaign.owner !== publicKey.toBase58()) {
      setNotice('Only the campaign owner can withdraw funds.')
      return
    }

    try {
      setWithdrawingCampaign(campaign.address)
      setNotice('Preparing withdrawal transaction...')

      const campaignPda = new PublicKey(campaign.address)

      const [vaultPda] =
        PublicKey.findProgramAddressSync(
          [
            Buffer.from('vault'),
            campaignPda.toBuffer(),
          ],
          PROGRAM_ID,
        )

      setNotice('Please approve the withdrawal in Phantom.')

      const signature = await (
        program.methods as any
      )
        .withdraw(new BN(amountLamports.toString()))
        .accounts({
          owner: publicKey,
          campaign: campaignPda,
          vault: vaultPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      await connection.confirmTransaction(
        signature,
        'confirmed',
      )

      setNotice(
        `Withdrawal successful! ${amount.toFixed(6)} SOL withdrawn. Transaction: ${signature}`,
      )

      setWithdrawalAmounts((previous) => ({
        ...previous,
        [campaign.address]: '',
      }))

      await handleRefresh()
    } catch (error) {
      console.error('Withdrawal failed:', error)

      setNotice(
        error instanceof Error
          ? `Withdrawal failed: ${error.message}`
          : 'Withdrawal failed. Check the browser console.',
      )
    } finally {
      setWithdrawingCampaign('')
    }
  }

  return (
    <div className="relative isolate min-h-screen text-[#183e32]">
      {/* BACKGROUND */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center"
        style={{
          backgroundImage: `
            linear-gradient(
              rgba(250,249,243,0.84),
              rgba(250,249,243,0.88)
            ),
            url("https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=2000&q=90")
          `,
          backgroundAttachment: 'fixed',
        }}
      />

      {/* NAVIGATION */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
        <a href="#" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#174c3b] text-white">
            <Heart size={21} />
          </div>

          <span className="text-2xl font-bold tracking-tight">
            TrustFund<span className="text-[#399b7b]">.</span>
          </span>
        </a>

        <div className="hidden items-center gap-9 text-sm font-medium text-[#496458] md:flex">
          <a href="#" className="text-[#174c3b]">Home</a>
          <a href="#campaigns" className="hover:text-[#399b7b]">
            Explore causes
          </a>
          <a href="#how-it-works" className="hover:text-[#399b7b]">
            How it works
          </a>
          <a href="#about" className="hover:text-[#399b7b]">
            About us
          </a>
        </div>

        <button
          onClick={handleWalletClick}
          className="hidden items-center gap-2 rounded-lg bg-[#174c3b] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#23644d] md:flex"
        >
          <Wallet size={17} />
          {connected ? shortAddress : 'Connect Wallet'}
        </button>

        <button
          className="md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </nav>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="flex flex-col gap-4 border-t border-[#e5e6dc] px-6 py-5 md:hidden">
          <a href="#campaigns" onClick={() => setMenuOpen(false)}>
            Explore causes
          </a>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>
            How it works
          </a>
          <a href="#about" onClick={() => setMenuOpen(false)}>
            About us
          </a>

          <button
            onClick={handleWalletClick}
            className="rounded-lg bg-[#174c3b] px-5 py-3 text-white"
          >
            {connected ? shortAddress : 'Connect Wallet'}
          </button>
        </div>
      )}

      {/* NOTIFICATION */}
      {notice && (
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3 text-sm text-[#174c3b]">
          <span className="break-all">{notice}</span>

          <button
            onClick={() => setNotice('')}
            aria-label="Dismiss notification"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* WALLET STATUS */}
      {connected && (
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#e8f0e9] px-4 py-2 text-xs font-semibold text-[#287354]">
            <span className="h-2 w-2 rounded-full bg-[#399b7b]" />
            Connected to Solana Devnet · {shortAddress}
          </div>
        </div>
      )}

      <main>
        {/* HERO */}
        <section className="mx-auto max-w-7xl px-6 pb-20 pt-10 lg:px-10 lg:pt-16">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#e8f0e9] px-4 py-2 text-xs font-semibold text-[#287354]">
                <ShieldCheck size={15} />
                TRANSPARENT GIVING, POWERED BY SOLANA
              </div>

              <h1 className="max-w-xl text-5xl font-bold leading-[1.13] tracking-tight sm:text-6xl lg:text-7xl">
                Together, we can
                <span className="block text-[#399b7b]">
                  make a difference.
                </span>
              </h1>

              <p className="mt-7 max-w-lg text-base leading-8 text-[#65776d] md:text-lg">
                Every small act of kindness can change a life.
                Discover meaningful causes, support communities
                and make every contribution count with TrustFund.
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <a
                  href="#campaigns"
                  className="inline-flex items-center gap-3 rounded-lg bg-[#174c3b] px-7 py-4 text-sm font-semibold text-white transition hover:bg-[#23644d]"
                >
                  Explore campaigns <ArrowRight size={18} />
                </a>

                <a
                  href="#how-it-works"
                  className="rounded-lg border border-[#cbd8ce] px-7 py-4 text-sm font-semibold text-[#174c3b] transition hover:bg-[#eaf1e9]"
                >
                  Learn more
                </a>
              </div>

              <div className="mt-12 flex items-center gap-3">
                <div className="flex -space-x-3">
                  <img
                    className="h-10 w-10 rounded-full border-2 border-[#faf9f3] object-cover"
                    src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=100"
                    alt="Community member"
                  />
                  <img
                    className="h-10 w-10 rounded-full border-2 border-[#faf9f3] object-cover"
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100"
                    alt="Community member"
                  />
                  <img
                    className="h-10 w-10 rounded-full border-2 border-[#faf9f3] object-cover"
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"
                    alt="Community member"
                  />
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    Every contribution matters
                  </p>
                  <p className="text-xs text-[#829087]">
                    Be part of positive change
                  </p>
                </div>
              </div>
            </div>

            {/* HERO IMAGE */}
            <div className="relative">
              <div className="overflow-hidden rounded-[28px]">
                <img
                  src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1400&q=90"
                  alt="Children smiling together"
                  className="h-[420px] w-full object-cover sm:h-[520px]"
                />
              </div>

              <div className="absolute -bottom-6 left-5 right-5 rounded-2xl border border-white/70 bg-white/95 p-5 shadow-xl sm:left-10 sm:right-10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-[#829087]">
                      OUR MISSION
                    </p>
                    <p className="mt-1 text-lg font-bold">
                      Giving with trust. Changing lives.
                    </p>
                  </div>

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e8f0e9] text-[#287354]">
                    <Heart size={23} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* VALUES */}
        <section className="border-y border-white/50 bg-white/25 backdrop-blur-sm">
          <div className="mx-auto grid max-w-7xl gap-8 px-6 py-9 sm:grid-cols-3 lg:px-10">
            <div className="flex items-center gap-4">
              <ShieldCheck className="shrink-0 text-[#399b7b]" size={30} />
              <div>
                <p className="font-bold">Transparent giving</p>
                <p className="mt-1 text-sm text-[#829087]">
                  Verifiable blockchain activity
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Wallet className="shrink-0 text-[#399b7b]" size={30} />
              <div>
                <p className="font-bold">Wallet powered</p>
                <p className="mt-1 text-sm text-[#829087]">
                  Your wallet, your control
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Heart className="shrink-0 text-[#399b7b]" size={30} />
              <div>
                <p className="font-bold">Community first</p>
                <p className="mt-1 text-sm text-[#829087]">
                  Support causes that matter
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CAMPAIGNS */}
        <section
          id="campaigns"
          className="mx-auto max-w-7xl px-6 py-24 lg:px-10"
        >
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#399b7b]">
                MAKE AN IMPACT
              </p>

              <h2 className="mt-3 text-4xl font-bold tracking-tight">
                Causes that need you.
              </h2>

              <p className="mt-3 text-[#829087]">
                Find a cause close to your heart and help make it happen.
              </p>
            </div>

            <div className="flex items-center gap-4">
              {connected && (
                <button
                  onClick={handleRefresh}
                  disabled={
                    loadingCampaigns ||
                    creatingCampaign ||
                    donatingCampaign !== '' ||
                    withdrawingCampaign !== ''
                  }
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#287354] disabled:opacity-50"
                >
                  <RefreshCw
                    size={16}
                    className={loadingCampaigns ? 'animate-spin' : ''}
                  />
                  Refresh
                </button>
              )}

              <a
                href="#campaigns"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#287354]"
              >
                Explore all <ArrowRight size={17} />
              </a>
            </div>
          </div>

          {/* LIVE DATA STATUS */}
          {connected && (
            <div className="mt-6 rounded-xl border border-[#dce8dc] bg-white/65 p-4 text-sm">
              {loadingCampaigns && (
                <p className="text-[#496458]">
                  Loading campaigns from Solana Devnet...
                </p>
              )}

              {!loadingCampaigns && !campaignError && (
                <p className="text-[#287354]">
                  {liveCampaigns === null
                    ? 'Preparing blockchain connection...'
                    : `${liveCampaigns.length} campaign(s) loaded from TrustFund on Devnet.`}
                </p>
              )}

              {campaignError && (
                <p className="text-red-700">
                  Unable to load campaigns: {campaignError}
                </p>
              )}
            </div>
          )}

          {/* CREATE CAMPAIGN BUTTON */}
          {connected && (
            <div className="mt-8">
              <button
                type="button"
                onClick={() => setShowCreateForm(!showCreateForm)}
                disabled={
                  creatingCampaign ||
                  donatingCampaign !== '' ||
                  withdrawingCampaign !== ''
                }
                className="rounded-lg bg-[#174c3b] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#23644d] disabled:opacity-50"
              >
                {showCreateForm ? 'Cancel' : '+ Create a Campaign'}
              </button>
            </div>
          )}

          {/* CREATE CAMPAIGN FORM */}
          {connected && showCreateForm && (
            <form
              onSubmit={handleCreateCampaign}
              className="mt-6 max-w-2xl space-y-5 rounded-2xl border border-[#dce8dc] bg-white/85 p-6 shadow-lg"
            >
              <div>
                <h3 className="text-2xl font-bold">
                  Start a Campaign
                </h3>
                <p className="mt-2 text-sm text-[#829087]">
                  Create a fundraising campaign on Solana Devnet.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Campaign title
                </label>
                <input
                  required
                  maxLength={50}
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  placeholder="What are you raising funds for?"
                  className="w-full rounded-lg border border-[#cbd8ce] p-3 outline-none focus:border-[#399b7b]"
                />
                <p className="mt-1 text-xs text-[#829087]">
                  {campaignTitle.length}/50 characters
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Description
                </label>
                <textarea
                  required
                  maxLength={280}
                  rows={4}
                  value={campaignDescription}
                  onChange={(e) => setCampaignDescription(e.target.value)}
                  placeholder="Explain why this cause matters..."
                  className="w-full rounded-lg border border-[#cbd8ce] p-3 outline-none focus:border-[#399b7b]"
                />
                <p className="mt-1 text-xs text-[#829087]">
                  {campaignDescription.length}/280 characters
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Fundraising goal (SOL)
                </label>
                <input
                  required
                  type="number"
                  min="0.000000001"
                  step="0.000000001"
                  value={campaignGoal}
                  onChange={(e) => setCampaignGoal(e.target.value)}
                  placeholder="e.g. 2"
                  className="w-full rounded-lg border border-[#cbd8ce] p-3 outline-none focus:border-[#399b7b]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Campaign deadline
                </label>
                <input
                  required
                  type="datetime-local"
                  value={campaignDeadline}
                  onChange={(e) => setCampaignDeadline(e.target.value)}
                  min={getLocalDateTimeMin()}
                  className="w-full rounded-lg border border-[#cbd8ce] p-3 outline-none focus:border-[#399b7b]"
                />
              </div>

              <button
                type="submit"
                disabled={
                  creatingCampaign ||
                  donatingCampaign !== '' ||
                  withdrawingCampaign !== ''
                }
                className="w-full rounded-lg bg-[#174c3b] py-3 font-semibold text-white transition hover:bg-[#23644d] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creatingCampaign
                  ? 'Creating campaign...'
                  : 'Create Campaign'}
              </button>

              <p className="text-xs text-[#829087]">
                Phantom will ask you to approve the transaction.
                Devnet SOL is used for testing.
              </p>
            </form>
          )}

          {/* CAMPAIGN CARDS */}
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {displayedCampaigns.map((campaign) => {
              const percentage =
                campaign.goal > 0
                  ? Math.min(
                      (campaign.raised / campaign.goal) * 100,
                      100,
                    )
                  : 0

              const remainingGoal = Math.max(
                0,
                campaign.goal - campaign.raised,
              )

              const availableToWithdraw = Math.max(
                0,
                campaign.raised - campaign.withdrawn,
              )

              const isCampaignOwner =
                connected &&
                publicKey !== null &&
                campaign.owner === publicKey.toBase58()

              const campaignEnded =
                campaign.deadline <=
                Math.floor(Date.now() / 1000)

              return (
                <article
                  key={campaign.address}
                  className="overflow-hidden rounded-2xl border border-white/70 bg-white/75 shadow-lg backdrop-blur-md transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={campaign.image}
                      alt={campaign.title}
                      className="h-full w-full object-cover transition duration-500 hover:scale-105"
                    />

                    <span className="absolute left-4 top-4 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#287354]">
                      {campaign.category}
                    </span>
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-bold">
                      {campaign.title}
                    </h3>

                    <p className="mt-3 min-h-[48px] text-sm leading-6 text-[#829087]">
                      {campaign.description}
                    </p>

                    <div className="mt-6 flex justify-between text-sm">
                      <span className="font-bold">
                        {campaign.raised.toFixed(3)} SOL raised
                      </span>

                      <span className="text-[#829087]">
                        Goal: {campaign.goal.toFixed(3)} SOL
                      </span>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e8eee8]">
                      <div
                        className="h-full rounded-full bg-[#399b7b]"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <div className="mt-2 flex justify-between text-xs font-medium">
                      <span className="text-[#399b7b]">
                        {Math.round(percentage)}% funded
                      </span>
                      <span className="text-[#829087]">
                        {remainingGoal.toFixed(3)} SOL remaining
                      </span>
                    </div>

                    {/* DONATION INPUT */}
                    {connected && campaign.address.startsWith('demo-') ? (
                      <p className="mt-6 text-xs text-[#829087]">
                        This is a demonstration campaign. Only live
                        on-chain campaigns can receive donations.
                      </p>
                    ) : (
                      <div className="mt-6 space-y-3">
                        <label className="block text-sm font-semibold">
                          Donation amount (SOL)
                        </label>

                        <input
                          type="number"
                          min="0.000000001"
                          step="0.000000001"
                          placeholder="e.g. 0.01"
                          value={
                            donationAmounts[campaign.address] ?? ''
                          }
                          onChange={(e) =>
                            setDonationAmounts((previous) => ({
                              ...previous,
                              [campaign.address]: e.target.value,
                            }))
                          }
                          disabled={
                            !connected ||
                            donatingCampaign !== '' ||
                            creatingCampaign ||
                            withdrawingCampaign !== '' ||
                            campaignEnded ||
                            remainingGoal <= 0
                          }
                          className="w-full rounded-lg border border-[#cbd8ce] p-3 outline-none focus:border-[#399b7b] disabled:opacity-50"
                        />

                        <button
                          type="button"
                          onClick={() => void handleDonate(campaign)}
                          disabled={
                            !connected ||
                            donatingCampaign !== '' ||
                            creatingCampaign ||
                            withdrawingCampaign !== '' ||
                            campaignEnded ||
                            remainingGoal <= 0 ||
                            !donationAmounts[campaign.address]
                          }
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#174c3b] py-3 text-sm font-semibold text-white transition hover:bg-[#23644d] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {donatingCampaign === campaign.address
                            ? 'Processing donation...'
                            : campaignEnded
                              ? 'Campaign ended'
                              : remainingGoal <= 0
                                ? 'Goal reached'
                                : !connected
                                  ? 'Connect Wallet to Donate'
                                  : 'Donate SOL'}

                          <ArrowUpRight size={17} />
                        </button>
                      </div>
                    )}

                    {/* OWNER WITHDRAWAL SECTION */}
                    {isCampaignOwner && (
                      <div className="mt-6 space-y-3 rounded-xl border border-[#cbd8ce] bg-[#f3f7f1] p-4">
                        <div>
                          <h4 className="font-bold text-[#174c3b]">
                            Campaign withdrawals
                          </h4>

                          <p className="mt-2 text-sm text-[#496458]">
                            Available to withdraw:
                          </p>

                          <p className="mt-1 text-xl font-bold text-[#287354]">
                            {availableToWithdraw.toFixed(6)} SOL
                          </p>
                        </div>

                        <label className="block text-sm font-semibold">
                          Withdrawal amount (SOL)
                        </label>

                        <input
                          type="number"
                          min="0.000000001"
                          step="0.000000001"
                          placeholder="e.g. 0.01"
                          value={
                            withdrawalAmounts[campaign.address] ?? ''
                          }
                          onChange={(e) =>
                            setWithdrawalAmounts((previous) => ({
                              ...previous,
                              [campaign.address]: e.target.value,
                            }))
                          }
                          disabled={
                            withdrawingCampaign !== '' ||
                            donatingCampaign !== '' ||
                            creatingCampaign ||
                            availableToWithdraw <= 0
                          }
                          className="w-full rounded-lg border border-[#cbd8ce] bg-white p-3 outline-none focus:border-[#399b7b] disabled:opacity-50"
                        />

                        <button
                          type="button"
                          onClick={() => void handleWithdraw(campaign)}
                          disabled={
                            withdrawingCampaign !== '' ||
                            donatingCampaign !== '' ||
                            creatingCampaign ||
                            availableToWithdraw <= 0 ||
                            !withdrawalAmounts[campaign.address]
                          }
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#287354] py-3 text-sm font-semibold text-white transition hover:bg-[#174c3b] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {withdrawingCampaign === campaign.address
                            ? 'Processing withdrawal...'
                            : availableToWithdraw <= 0
                              ? 'No funds available'
                              : 'Withdraw SOL'}

                          <Wallet size={17} />
                        </button>

                        <p className="text-xs leading-5 text-[#829087]">
                          Withdrawals transfer campaign funds to the
                          campaign owner's connected wallet. Phantom
                          will ask you to approve the transaction.
                        </p>
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>

          {connected &&
            !loadingCampaigns &&
            !campaignError &&
            liveCampaigns?.length === 0 && (
              <div className="mt-12 rounded-2xl border border-dashed border-[#b9cbbd] bg-white/50 px-6 py-12 text-center">
                <Heart size={35} className="mx-auto text-[#399b7b]" />

                <h3 className="mt-4 text-xl font-bold">
                  No campaigns found yet
                </h3>

                <p className="mt-2 text-sm text-[#829087]">
                  There are currently no campaigns stored in the TrustFund
                  program on Devnet.
                </p>
              </div>
            )}

          {!connected && (
            <p className="mt-8 text-center text-xs text-[#9aa49c]">
              Demonstration campaigns. Connect your wallet to load live
              campaign information from TrustFund on Devnet.
            </p>
          )}
        </section>

        {/* HOW IT WORKS */}
        <section
          id="how-it-works"
          className="bg-[#edf2e9] px-6 py-24"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#399b7b]">
                SIMPLE AND TRANSPARENT
              </p>

              <h2 className="mt-3 text-4xl font-bold">
                How TrustFund works
              </h2>

              <p className="mt-4 leading-7 text-[#829087]">
                Three simple steps to turn generosity into real impact.
              </p>
            </div>

            <div className="mt-14 grid gap-7 md:grid-cols-3">
              {[
                [
                  '01',
                  'Connect your wallet',
                  'Connect your Solana wallet to participate in crowdfunding.',
                ],
                [
                  '02',
                  'Discover a campaign',
                  'Explore causes or create a campaign of your own.',
                ],
                [
                  '03',
                  'Make an impact',
                  'Contribute SOL and verify transactions on the blockchain.',
                ],
              ].map(([number, title, description]) => (
                <div
                  key={number}
                  className="rounded-2xl border border-white/70 bg-white/65 p-8 shadow-sm backdrop-blur-md"
                >
                  <p className="text-4xl font-bold text-[#9ac9b3]">
                    {number}
                  </p>

                  <h3 className="mt-6 text-xl font-bold">{title}</h3>

                  <p className="mt-3 text-sm leading-7 text-[#829087]">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section id="about" className="px-6 py-24">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-[#174c3b] px-8 py-16 text-center text-white md:py-20">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a8d7c0]">
              BE PART OF THE CHANGE
            </p>

            <h2 className="mx-auto mt-4 max-w-2xl text-4xl font-bold md:text-5xl">
              Small acts. Big impact. A better tomorrow.
            </h2>

            <p className="mx-auto mt-5 max-w-xl leading-7 text-[#d0e1d6]">
              Together, let's make giving more transparent and accessible
              to everyone.
            </p>

            <a
              href="#campaigns"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-7 py-4 text-sm font-bold text-[#174c3b] transition hover:bg-[#e8f0e9]"
            >
              Explore campaigns <ArrowRight size={18} />
            </a>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#e5e6dc] px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-[#829087] md:flex-row">
          <span className="text-xl font-bold text-[#174c3b]">
            TrustFund.
          </span>

          <span>Built with purpose on Solana.</span>

          <a
            href="https://github.com/aditikshetty/trustfund"
            target="_blank"
            rel="noreferrer"
            className="font-semibold hover:text-[#399b7b]"
          >
            GitHub <ArrowUpRight className="inline" size={15} />
          </a>
        </div>
      </footer>
    </div>
  )
}

export default App
