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
const storeCurrentTurn = createStore(
  {
    currentTurn: 0,
  },
  {
    setCurrentTurn: {
      currentTurn: (context, event: { turn: number }) => event.turn,
    },
  },
)

// Key to identify our query
const KEY_TURN = 'turn'

function useProviderValue() {
  const currentTurn = useSelector(storeCurrentTurn, (state) => state.context.currentTurn)

  /**
   * Use the subgraph to get if the current turn
   */
  const queryCurrentTurn = useQuery({
    queryKey: [KEY_TURN, currentTurn],
    queryFn: async () => {
      const response = await fetch(SUBGRAPH_ENDPOINT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query CurrentTurn {
            turnEndeds(first: 1, orderBy: timestamp_, orderDirection: desc) {
                turnNumber
            }
        }`,
        }),
      })
      const data = await response.json()
      storeCurrentTurn.send({
        type: 'setCurrentTurn',
        turn: +data.data?.turnEndeds[0]?.turnNumber ?? 0,
      })
      return +data.data?.turnEndeds[0]?.turnNumber
    },
  })

  return {
    queryCurrentTurn,
    currentTurn,
  }
}

// Context
type CurrentTurnType = ReturnType<typeof useProviderValue>
const CurrentTurn = createContext<CurrentTurnType | undefined>(undefined)

// Provider
interface ProviderCurrentTurnProps {
  children?: React.ReactNode
}

const ProviderCurrentTurn: FC<ProviderCurrentTurnProps> = (props) => {
  const value = useProviderValue()

  return <CurrentTurn.Provider value={value}>{props.children}</CurrentTurn.Provider>
}
// Reusable hook
function useCurrentTurn() {
  const context = useContext(CurrentTurn)
  if (context === undefined) {
    throw new Error('"useCurrentTurn()" must be used within <ProviderCurrentTurn>')
  }
  return context
}

export { useCurrentTurn, ProviderCurrentTurn, type CurrentTurnType }
