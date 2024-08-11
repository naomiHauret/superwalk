import { useQuery } from '@tanstack/react-query'
import { SUBGRAPH_ENDPOINT_URL } from '../config'

function useLeaderboard(turn: number) {
  /**
   * Get scores & steps leaderboards for a given turn
   */
  const queryTurnLeaderboard = useQuery({
    enabled: turn ? true : false,
    queryKey: ['leaderboard', turn],
    queryFn: async () => {
      const response = await fetch(SUBGRAPH_ENDPOINT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
                    query Leaderboard($turn: BigInt) {
                            scoreUpdateds(where: {
                            turnNumber: $turn
                        } orderBy: score, orderDirection: desc){
                            player
                            turnNumber
                            score
                        }
                        }`,
        }),
      })
      const data = await response.json()
      return data.scoreUpdateds
    },
  })

  return {
    queryTurnLeaderboard,
  }
}

export { useLeaderboard }
