
import { useEffect, useMemo, useState } from 'react'
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
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { getTrustFundProgram } from './lib/anchor'

type CampaignView = {
  address: string
  owner: string
  campaignId: string
  category: string
  title: string
  description: string
  raised: number
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
    goal: 4,
    deadline: 0,
    image:
      'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=85',
  },
]

const DEFAULT_CAMPAIGN_IMAGE =
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=900&q=85'

// Converts Anchor BN/u64 values into JavaScript numbers.
function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0

  return Number(value.toString())
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [liveCampaigns, setLiveCampaigns] =
    useState<CampaignView[] | null>(null)
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [campaignError, setCampaignError] = useState('')

  // Wallet connection
  const { publicKey, connected, disconnect } = useWallet()
  const { setVisible } = useWalletModal()
  const anchorWallet = useAnchorWallet()
  const { connection } = useConnection()

  const walletAddress = publicKey?.toBase58()

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
    : ''

  // Create Anchor program client
  const program = useMemo(
    () =>
      anchorWallet
        ? getTrustFundProgram(connection, anchorWallet)
        : null,
    [connection, anchorWallet],
  )

  // Fetch real campaigns from Solana Devnet
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
        // Fetch all Campaign accounts owned by the TrustFund program.
        const accounts = await (
          program!.account as any
        ).campaign.all()

        const mappedCampaigns: CampaignView[] = accounts.map(
          (item: {
            publicKey: PublicKey
            account: {
              owner: PublicKey
              campaignId: unknown
              title: string
              description: string
              goal: unknown
              raised: unknown
              deadline: unknown
            }
          }) => {
            const account = item.account

            return {
              address: item.publicKey.toBase58(),
              owner: account.owner.toBase58(),
              campaignId: String(account.campaignId),
              category: 'Community',
              title: account.title,
              description: account.description,
              goal: toNumber(account.goal) / LAMPORTS_PER_SOL,
              raised: toNumber(account.raised) / LAMPORTS_PER_SOL,
              deadline: toNumber(account.deadline),
              image: DEFAULT_CAMPAIGN_IMAGE,
            }
          },
        )

        if (!cancelled) {
          setLiveCampaigns(mappedCampaigns)
        }
      } catch (error) {
        console.error('Failed to fetch TrustFund campaigns:', error)

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

  // Show real campaigns when connected.
  // Demo campaigns are only shown when disconnected.
  const displayedCampaigns = connected
    ? liveCampaigns ?? []
    : DEMO_CAMPAIGNS

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

  const handleRefresh = () => {
    if (connected && program) {
      setLiveCampaigns(null)
      setCampaignError('')

      // The wallet/program effect will fetch again when its dependencies change.
      // A page reload is not needed for normal campaign updates.
      void (async () => {
        try {
          setLoadingCampaigns(true)

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
              deadline: toNumber(item.account.deadline),
              image: DEFAULT_CAMPAIGN_IMAGE,
            }),
          )

          setLiveCampaigns(mapped)
        } catch (error) {
          console.error(error)
          setCampaignError('Unable to refresh campaigns.')
        } finally {
          setLoadingCampaigns(false)
        }
      })()
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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 text-sm text-[#174c3b]">
          <span>{notice}</span>

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
                  disabled={loadingCampaigns}
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

                    <div className="mt-2 text-right text-xs font-medium text-[#399b7b]">
                      {Math.round(percentage)}% funded
                    </div>

                    <button
                      onClick={() =>
                        setNotice(
                          connected
                            ? 'Campaign donations will be enabled in the next integration step.'
                            : 'Connect your Phantom wallet to interact with live campaigns.',
                        )
                      }
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#174c3b] py-3 text-sm font-semibold text-white transition hover:bg-[#23644d]"
                    >
                      Support this cause <ArrowUpRight size={17} />
                    </button>
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
