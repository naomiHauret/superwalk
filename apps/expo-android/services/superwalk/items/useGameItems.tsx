import { useQuery } from '@tanstack/react-query'
import { SUBGRAPH_ENDPOINT_URL } from '../config'
import { useActiveWalletChain } from 'thirdweb/react'

enum GameItemEffectTypes {
  OFFENSIVE = 0,
  DEFENSIVE = 1,
  BOOST = 2,
}

enum EffectValueType {
  PERCENT = 0,
  ABSOLUTE = 1,
}

type GameItem = {
  name: string
  effectType: GameItemEffectTypes
  effectValue: number
  effectValueType: EffectValueType
  cooldownValue: number
}

// Key to identify our query
const KEY_GAME_ITEMS = 'game-items'

/**
 * Use the subgraph to get the list of in-game items
 */
function useGameItems() {
  const activeChain = useActiveWalletChain()
  const queryListInGameItems = useQuery({
    queryKey: [KEY_GAME_ITEMS, activeChain],
    queryFn: async () => {
      const response = await fetch(SUBGRAPH_ENDPOINT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query GameItems {
              gameItemCreateds {
                name
                effectType
                effectValue
                effectValueType
                cooldownValue   
              }
            }
        `,
        }),
      })
      const result = await response.json()
      const items: Array<{
        name: string
        effectType: string
        effectValue: string
        effectValueType: string
        cooldownValue: string
      }> = result?.data?.gameItemCreateds
      return items
    },
    select(data): Array<GameItem> {
      return data.map((item) => ({
        ...item,
        effectType: +item.effectType,
        effectValue: +item.effectValue,
        effectValueType: +item.effectValueType,
        cooldownValue: +item.cooldownValue,
      }))
    },
  })
  return {
    queryListInGameItems,
  }
}

export { useGameItems, type GameItem }
