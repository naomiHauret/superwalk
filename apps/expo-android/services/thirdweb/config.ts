import { createThirdwebClient, defineChain } from 'thirdweb'
import { baseSepolia, optimismSepolia } from 'thirdweb/chains'
import { createWallet, inAppWallet } from 'thirdweb/wallets'
import { API_URL } from '../superwalk'
import { type LoginPayload } from 'thirdweb/dist/types/auth/core/types'
import { type VerifyLoginPayloadParams } from 'thirdweb/dist/types/auth/core/verify-login-payload'
import { router } from 'expo-router'

/**
 * Thirdweb client ID
 * @see
 */
const clientId = process.env.EXPO_PUBLIC_THIRDWEB_CLIENT_ID!

if (!clientId) {
  throw new Error('Missing EXPO_PUBLIC_THIRDWEB_CLIENT_ID - make sure to set it in your .env file')
}

/**
 * Client to interact with Thirdweb services
 */
const client = createThirdwebClient({
  clientId,
})

/**
 * Chains on which the user can play
 */

// Metal L2 testnet https://docs.metall2.com/chain/networks
// Entropy is not available on this chain, but we can use it for players bets
const metalL2Testnet = defineChain({
  id: 1740,
  name: 'Metal L2 Testnet',
  rpc: 'https://testnet.rpc.metall2.com/',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  blockExplorers: [
    {
      name: 'Metal L2 Testnet explorer',
      url: 'https://testnet.explorer.metall2.com/',
      apiUrl: 'https://testnet.explorer.metall2.com/api',
    },
  ],
  testnet: true,
})

// Celo Dango L2 testnet https://docs.celo.org/cel2#getting-started-with-dango
// Entropy is not available on this chain, but we can use it for players bets
const celoL2DangoTestnet = defineChain({
  id: 44787,
  name: 'Cel2 Dango Testnet',
  rpc: 'https://forno.dango.celo-testnet.org/',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  blockExplorers: [
    {
      name: 'Metal L2 Testnet explorer',
      url: 'https://celo-dango.blockscout.com/',
      apiUrl: 'https://celo-dango.blockscout.com/api',
    },
  ],
  testnet: true,
})

/**
 * Chains available in app
 */
const availableChains = [
  baseSepolia,
  optimismSepolia,
  metalL2Testnet, // Sidenote : entropy is not available on that chain yet
  celoL2DangoTestnet, // Sidenote : entropy is not available on that chain yet
]

// Mapping to make accessing chains definition easier
const mappingChainIdToChainDefinition = {
  [baseSepolia.id]: baseSepolia,
  [optimismSepolia.id]: optimismSepolia,
  [metalL2Testnet.id]: metalL2Testnet,
  [celoL2DangoTestnet.id]: celoL2DangoTestnet,
}

/**
 * Default chain users will be connected to
 */
const chain = availableChains[0]

/**
 * Supported wallets
 */
const wallets = [
  inAppWallet({
    auth: {
      options: ['google', 'email', 'phone', 'farcaster'],
    },
    smartAccount: {
      chain,
      sponsorGas: true,
    },
  }),
  createWallet('com.coinbase.wallet'),
  createWallet('io.rabby'),
  createWallet('org.uniswap'),
  createWallet('com.trustwallet.app'),
  createWallet('io.zerion.wallet'),
  createWallet('me.rainbow'),
  createWallet('io.metamask'),
]

// Client-side authentication hooks
/**
 * Redirects the user to "game" screen when they sign in
 */
async function onConnect() {
  router.navigate('/game')
}

/**
 * Redirects the user to the default screen when they sign out
 */
function onDisconnect() {
  router.navigate('/')
}

// Backend authentication methods (using SIWE)

const AUTH_BASE_URL = `${API_URL}/_auth`

/**
 * Get login payload for a given user (currently connected user)
 */
async function getPayloadLogin(params: { address: string }): Promise<LoginPayload> {
  const raw = await fetch(
    `${AUTH_BASE_URL}/challenge?${new URLSearchParams({
      address: params.address,
      chainId: chain.id.toString(),
    })}`,
    {
      method: 'GET',
      credentials: 'include',
    },
  )
  const payload = await raw.json()
  return payload
}

/**
 * Sign the user in with their login payload
 */
async function doLogin(params: VerifyLoginPayloadParams): Promise<void> {
  await fetch(`${AUTH_BASE_URL}/login`, {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify(params),
  })
}

/**
 * Verify the user's session is valid (backend)
 */
async function isLoggedIn(): Promise<boolean> {
  const raw = await fetch(`${API_URL}/_auth/verify`, {
    credentials: 'include',
    method: 'GET',
  })
  const value = await raw.json()
  return value
}

/**
 * Signs the user out of their current session
 */
async function doLogout(): Promise<void> {
  await fetch(`${API_URL}/_auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
}

export {
  client,
  chain,
  availableChains,
  wallets,
  mappingChainIdToChainDefinition,
  getPayloadLogin,
  isLoggedIn,
  doLogin,
  onConnect,
  doLogout,
  onDisconnect,
}
