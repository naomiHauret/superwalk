import { type FC } from 'react'
import { View } from 'react-native'
import { useAccountPlayer, useSyncTrackSteps } from '@/services'
import { useActiveAccount } from 'thirdweb/react'
import { Button } from '@/components/ui/button'
import { P } from '@/components/ui/typography'
import { Text } from '@/components/ui/text'
import { useQuery } from '@tanstack/react-query'
import { isAddress } from 'thirdweb'

const ScreenTracker: FC = () => {
  const playerAccount = useActiveAccount()
  const {
    machineTrackSteps: [state, send],
    queryStartTrackerSteps,
    mutationRequestPermissionAccess,
  } = useSyncTrackSteps()

  const { queryIsAccountRegisteredAsPlayer, isAccountRegisteredAsPlayer, mutationJoinCompetition } =
    useAccountPlayer()

  return (
    <View>
      {queryIsAccountRegisteredAsPlayer?.status === 'pending' && (
        <>
          <Text>Getting your account back, one second...</Text>
        </>
      )}
      {queryIsAccountRegisteredAsPlayer?.status === 'success' && !isAccountRegisteredAsPlayer && (
        <>
          <Text>It seems you didn't join the competition yet.</Text>
          <Button
            onPress={async () => {
              await mutationJoinCompetition.mutateAsync()
            }}
          >
            <Text>Join now</Text>
          </Button>
          <Text>mutationJoinCompetition : {mutationJoinCompetition.status}</Text>
        </>
      )}
      {state.context.canAccessStepTracker ? (
        <>
          <P>Last updated step count: {state.context.lastStepCountRecorded.count}</P>
          <P>Last updated: {state.context.lastStepCountRecorded.timestamp.toDateString()}</P>
          <P>Total steps count since app started: {state.context.stepsCountSinceAppBooted}</P>
        </>
      ) : (
        <>
          <P>
            Superwalk needs access to the pedometer of your device to start tracking your step
            count.
          </P>
          <Button onPress={() => mutationRequestPermissionAccess.mutate()}>
            <Text>Grant access</Text>
          </Button>
        </>
      )}
    </View>
  )
}

export { ScreenTracker }
export default ScreenTracker
