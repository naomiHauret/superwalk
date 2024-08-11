import { View } from 'react-native'
import { Text } from '@/components/ui/text'
import { type FC } from 'react'
import { useCurrentTurn, useLeaderboard } from '@/services'

const ScreenLeaderboard: FC = () => {
  const { currentTurn } = useCurrentTurn()
  const { queryTurnLeaderboard } = useLeaderboard(currentTurn)

  console.log(queryTurnLeaderboard.data)
  return (
    <View>
      <Text>Leaderboard screen</Text>
    </View>
  )
}

export { ScreenLeaderboard }
export default ScreenLeaderboard
