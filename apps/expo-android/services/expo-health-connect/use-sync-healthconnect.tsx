import { useQuery } from '@tanstack/react-query'
import { useMachine } from '@xstate/react'
import {
  machineHealthConnectSdk as machine,
  EventsHealthConnectSdk,
  StatesHealthConnectSdk,
} from './machine'
import { createContext, useContext, type FC } from 'react'

// Key to identify our query
const KEY_SYNC_HEALTHCONNECT = 'synchronize-with-healthconnect'

function useProviderValue() {
  const machineHealthConnectSdk = useMachine(machine)
  const [state, send] = machineHealthConnectSdk
  /**
   * Verify the state of granted permissions
   */
  const querySyncWithHealthConnect = useQuery({
    queryKey: [KEY_SYNC_HEALTHCONNECT],
    queryFn: () => {
      // Send the "verify granted permissions" event to our state machine
      send({ type: EventsHealthConnectSdk.verifyGrantedPermissions })
      return null
    },
    enabled: state.context.initialized,
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
    // If Healthconnect & Superwalk aren't synced, verify permissions every 10 seconds
    // Otherwise, verify every 9 minutes
    refetchInterval: state.value !== StatesHealthConnectSdk.synced ? 10000 : 540000,
  })

  return {
    machineHealthConnectSdk,
    querySyncWithHealthConnect,
  }
}

// Context
type MachineHealthConnectContextType = ReturnType<typeof useProviderValue>
const MachineHealthConnectContext = createContext<MachineHealthConnectContextType | undefined>(
  undefined,
)

// Provider
interface ProviderHealthConnectMachineProps {
  children?: React.ReactNode
}

const ProviderHealthConnectMachine: FC<ProviderHealthConnectMachineProps> = (props) => {
  const value = useProviderValue()

  return (
    <MachineHealthConnectContext.Provider value={value}>
      {props.children}
    </MachineHealthConnectContext.Provider>
  )
}
// Reusable hook
function useSyncHealthConnect() {
  const context = useContext(MachineHealthConnectContext)
  if (context === undefined) {
    throw new Error('"useSyncHealthConnect()" must be used within <ProviderHealthConnectMachine>')
  }
  return context
}

export { useSyncHealthConnect, ProviderHealthConnectMachine, type MachineHealthConnectContextType }
