import { createStore } from '@xstate/store'
import { useSelector } from '@xstate/store/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createContext, useContext, type FC } from 'react'
import {
  useActiveAccount,
  useActiveWalletChain,
  useSendAndConfirmTransaction,
} from 'thirdweb/react'
import { SUBGRAPH_ENDPOINT_URL } from '../config'
import { prepareContractCall, waitForReceipt } from 'thirdweb'
import { getCompetitionSmartContract } from '../helpers'
import { client as thirdwebClient } from '../../thirdweb'

/**
 * Store for player account
 * Help us determine wheter or not the current account called `joinCompetition()`
 */
const storeIsRegisteredAsPlayer = createStore(
  {
    registered: false, // wheter or not the current account joined the competition
  },
  {
    setRegistered: {
      registered: (context, event: { isRegistered: boolean }) => event.isRegistered,
    },
  },
)

// Key to identify our query
const KEY_IS_ACCOUNT_REGISTERED_AS_PLAYER = 'start-tracker'

function useProviderValue() {
  const playerAccount = useActiveAccount()
  const activeChain = useActiveWalletChain()
  const mutationSendTransaction = useSendAndConfirmTransaction()
  const isAccountRegisteredAsPlayer = useSelector(
    storeIsRegisteredAsPlayer,
    (state) => state.context.registered,
  )

  async function _transactionJoinCompetition() {
    return await prepareContractCall({
      contract: getCompetitionSmartContract(activeChain?.id as number),
      method: 'function joinCompetition()',
      params: [],
    })
  }

  async function joinCompetition() {
    const transaction = await _transactionJoinCompetition()
    const result = await mutationSendTransaction.mutateAsync(transaction)
    return result
  }

  /**
   * Use the subgraph to get if the current account joined the competition
   */
  const queryIsAccountRegisteredAsPlayer = useQuery({
    queryKey: [KEY_IS_ACCOUNT_REGISTERED_AS_PLAYER, playerAccount?.address, activeChain],
    queryFn: async () => {
      console.log(SUBGRAPH_ENDPOINT_URL)
      const response = await fetch(SUBGRAPH_ENDPOINT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query DidAccountRegisterAsPlayer($address: String) {
              playerJoineds(first: 1,  where: { player_contains_nocase: $address }) {
                player
              }
            }
        `,
          variables: {
            address: playerAccount?.address.toLowerCase(),
          },
        }),
      })
      const result = await response.json()
      const didJoin = result?.data?.playerJoineds?.length >= 1 ?? false
      storeIsRegisteredAsPlayer.send({ type: 'setRegistered', isRegistered: didJoin })
      return didJoin
    },
    enabled: !!playerAccount?.address,
  })

  const mutationJoinCompetition = useMutation({
    mutationFn: async () => {
      if (
        queryIsAccountRegisteredAsPlayer.status === 'success' &&
        queryIsAccountRegisteredAsPlayer?.data !== true
      ) {
        mutationSendTransaction.reset()
        const { transactionHash } = await joinCompetition()
        const receipt = await waitForReceipt({
          client: thirdwebClient,
          chain: activeChain!!,
          transactionHash,
        })

        return receipt
      }
    },
    onSuccess() {
      storeIsRegisteredAsPlayer.send({ type: 'setRegistered', isRegistered: true })
    },
  })

  return {
    queryIsAccountRegisteredAsPlayer,
    mutationSendTransaction,
    mutationJoinCompetition,
    isAccountRegisteredAsPlayer,
  }
}

// Context
type AccountPlayerType = ReturnType<typeof useProviderValue>
const AccountPlayer = createContext<AccountPlayerType | undefined>(undefined)

// Provider
interface ProviderAccountPlayerProps {
  children?: React.ReactNode
}

const ProviderAccountPlayer: FC<ProviderAccountPlayerProps> = (props) => {
  const value = useProviderValue()

  return <AccountPlayer.Provider value={value}>{props.children}</AccountPlayer.Provider>
}
// Reusable hook
function useAccountPlayer() {
  const context = useContext(AccountPlayer)
  if (context === undefined) {
    throw new Error('"useAccountPlayer()" must be used within <ProviderAccountPlayer>')
  }
  return context
}

export { useAccountPlayer, ProviderAccountPlayer, type AccountPlayerType }
