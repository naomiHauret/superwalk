import { useMutation, useQuery } from '@tanstack/react-query'
import { useMachine } from '@xstate/react'
import { machineTrackSteps as machine, EventsTrackSteps } from './machine'
import { createContext, useContext, type FC } from 'react'
import { Pedometer } from 'expo-sensors'
import { useActiveAccount } from 'thirdweb/react'
import { useAccountPlayer } from '../player'
// Key to identify our query
const KEY_START_TRACKER = 'start-tracker'

function useProviderValue() {
  const { isAccountRegisteredAsPlayer } = useAccountPlayer()
  const playerAccount = useActiveAccount()
  const machineTrackSteps = useMachine(machine)
  const [state, send] = machineTrackSteps

  const queryStartTrackerSteps = useQuery({
    queryKey: [KEY_START_TRACKER, playerAccount?.address],
    queryFn: async () => {
      send({ type: EventsTrackSteps.startTracking })
      const subscribe = await Pedometer.watchStepCount((result) => {
        send({ type: EventsTrackSteps.updateSteps, updated: result.steps })
      })
      return subscribe
    },
    enabled:
      isAccountRegisteredAsPlayer === true &&
      !!playerAccount?.address &&
      state.context.canAccessStepTracker &&
      state.context.tracking === false,
  })

  const mutationRequestPermissionAccess = useMutation({
    mutationFn: async () => send({ type: EventsTrackSteps.requestPermission }),
  })
  return {
    machineTrackSteps,
    queryStartTrackerSteps,
    mutationRequestPermissionAccess,
  }
}

// Context
type MachineTrackStepsType = ReturnType<typeof useProviderValue>
const MachineTrackSteps = createContext<MachineTrackStepsType | undefined>(undefined)

// Provider
interface ProviderTrackStepsMachineProps {
  children?: React.ReactNode
}

const ProviderTrackStepsMachine: FC<ProviderTrackStepsMachineProps> = (props) => {
  const value = useProviderValue()

  return <MachineTrackSteps.Provider value={value}>{props.children}</MachineTrackSteps.Provider>
}
// Reusable hook
function useSyncTrackSteps() {
  const context = useContext(MachineTrackSteps)
  if (context === undefined) {
    throw new Error('"useSyncTrackSteps()" must be used within <ProviderTrackStepsMachine>')
  }
  return context
}

export { useSyncTrackSteps, ProviderTrackStepsMachine, type MachineTrackStepsType }
