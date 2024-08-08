/**
 * Code below is sadly not going to be used for the following reason :
 * Although HealthConnect includes a way to filter out manually added data in its documentation,
 * currently all records added to HealthConnect return "UNKNOWN" as their recording method, even when the record was added manually
 * This seems to be bug that was not fixed yet
 * @see - https://support.google.com/android/thread/267781075/health-connect-reading-data-showing-recording-method-of-all-records-as-unknown?hl=en
 * @see - https://github.com/matinzd/react-native-health-connect/issues/51#issuecomment-2231091383
 *
 * We could manually filter by app source, but it would end up making the step tracking feature more complicated to implement and not accurate anyway (since the pedometer can't run as a background task in android)
 * So instead, we'll just _painfully_ track by hand
 * This is far from being ideal, as expo-sensor Pedometer does not support background fetch
 * and the Android version can't fetch activity between 2 given timestamp
 * which means the app needs to be running all the time.
 * Regardless, enjoy this _beautiful_ state machine !
 */
import { assign, fromPromise, setup } from 'xstate'
import {
  getGrantedPermissions,
  openHealthConnectDataManagement,
  openHealthConnectSettings,
  getSdkStatus,
  initialize,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect'
import { type Permission } from 'react-native-health-connect/lib/typescript/types'

/**
 * Check if the HealthConnect SDK was initialized properly
 */
const initializeHealthConnectSDK = fromPromise(async () => {
  return await initialize()
})

/**
 * Get the availability of the HealthConnect SDK on the current device (available, update needed, unavailable)
 */
const getHealthConnectAvailabilitySDKStatus = fromPromise(async () => {
  return await getSdkStatus()
})

/**
 * Get the list of permissions the user granted for the app to access from the HealthConnect SDK
 * NOT to be mistaken with react-native `Permission`
 * @see `react-native-health-connect` documentation for list of available permissions https://matinzd.github.io/react-native-health-connect/docs/permissions#complete-list-of-permissions
 */
const getGrantedPermissionsList = fromPromise(async () => {
  return await getGrantedPermissions()
})

/**
 * Request read steps & write steps permissions from the HealthConnect SDK
 *  NOT to be mistaken with react-native `Permission`
 * @see `react-native-health-connect` documentation for list of available permissions https://matinzd.github.io/react-native-health-connect/docs/permissions#complete-list-of-permissions
 */
const requestPermissions = fromPromise(async () => {
  const requests = await requestPermission([
    {
      accessType: 'read',
      recordType: 'Steps',
    },
    {
      accessType: 'write',
      recordType: 'Steps',
    },
  ])
  return requests as Array<Permission>
})

/**
 * Opens HealthConnect data management screen app.
 */
const openExternalScreenDataManagement = fromPromise(async () => {
  await openHealthConnectDataManagement()
})

/**
 * Opens HealthConnect settings screen app.
 */
const openExternalScreenSettings = fromPromise(async () => {
  await openHealthConnectSettings()
})

enum StatesHealthConnectSdk {
  idle = 'User returned from HealthConnect external screen',
  sdkNotInitialized = 'HealthConnect SDK not initialized',
  initializingSdk = 'initializing HealthConnect SDK',
  sdkInitialized = 'HealthConnect SDK initialized',
  verifyingSdkStatus = 'verifying the availability of HealthConnect SDK',
  sdkUpdateRequired = 'HealthConnect SDK requires an update',
  sdkUnavailable = 'HealthConnect SDK is unavailable',
  sdkAvailable = 'HealthConnect SDK is available',
  listGrantedPermissions = 'Get the list of granted permissions ',
  waitingForPermissionsGrantRequest = 'Waiting for permissions request',
  requestingGrantPermissions = 'Requesting permissions',
  grantingPermissionsFailed = 'Granting permissions failed',
  permissionsDenied = 'Permissions denied',
  synced = 'HealthConnect and Superwalk are synced',
  notSynced = 'HealthConnect and Superwalk are not synced',
  initializationFailed = 'SDK Initialization failed',
  showingExternalScreenDataManagement = 'Showing HealthConnect data management screen',
  showingExternalScreenSettings = 'Showing HealthConnect settings screen',
}

enum ActorsHealthConnectSdk {
  initialize = 'Initialize HealthConnect SDK',
  getGrantedPermissions = 'Get the list of granted permissions for the app',
  getSDKAvailablityStatus = 'Get the availability status of the HealthConnect SDK',
  requestPermissions = 'Request permissions for the app to read and write steps to HealthConnect SDK',
  showingExternalScreenDataManagement = 'Showing "Data management" screen in HealthConnect',
  showingExternalScreenSettings = 'Showing "Settings" screen in HealthConnect',
}

enum EventsHealthConnectSdk {
  requestPermissions = 'request-permissions',
  verifyGrantedPermissions = 'verify-granted-permissions',
  checkSdkAvailability = 'check-sdk-availability',
  openDataManagementScreen = 'open-data-management-screen',
  openSettings = 'open-settings-screen',
}

/**
 * HealthConnect SDK state machine.
 * It verifies that:
 * - the user has HealthConnect on their device
 * - the HealthConnect SDK can be used (no update required)
 * - Verify that the user granted Superwalk access to the following Healthconnect permissions :
 * 1. Read steps
 * 2. Write steps
 * - Enable the user to toggle those permissions via HealthConnect directly
 */
const machineHealthConnectSdk = setup({
  types: {
    events: {} as
      | { type: EventsHealthConnectSdk.checkSdkAvailability }
      | { type: EventsHealthConnectSdk.openDataManagementScreen }
      | { type: EventsHealthConnectSdk.openSettings }
      | { type: EventsHealthConnectSdk.requestPermissions }
      | { type: EventsHealthConnectSdk.verifyGrantedPermissions },

    context: {} as {
      initialized: boolean
      sdkAvailabilityStatus: number
      canReadSteps: boolean
    },
  },
  actors: {
    [ActorsHealthConnectSdk.initialize]: initializeHealthConnectSDK,
    [ActorsHealthConnectSdk.getSDKAvailablityStatus]: getHealthConnectAvailabilitySDKStatus,
    [ActorsHealthConnectSdk.getGrantedPermissions]: getGrantedPermissionsList,
    [ActorsHealthConnectSdk.requestPermissions]: requestPermissions,
    [ActorsHealthConnectSdk.showingExternalScreenDataManagement]: openExternalScreenDataManagement,
    [ActorsHealthConnectSdk.showingExternalScreenSettings]: openExternalScreenSettings,
  },
}).createMachine({
  id: 'healthconnect-sdk-sync',
  initial: StatesHealthConnectSdk.sdkNotInitialized,
  context: {
    initialized: false,
    sdkAvailabilityStatus: SdkAvailabilityStatus.SDK_UNAVAILABLE,
    canReadSteps: false,
  },

  states: {
    // Context: HealthConnect SDK is not initialized
    [StatesHealthConnectSdk.sdkNotInitialized]: {
      invoke: {
        // Initialize it
        src: ActorsHealthConnectSdk.initialize,
        // When finished, if the SDK was initialized successfully, check its availability status
        onDone: {
          // When finished, if the SDK was initialized successfully
          guard: (context: { event: { output: boolean } }) => context.event.output === true,
          // 1. update the content to reflect this change
          actions: assign({
            initialized: ({ event }) => event.output,
          }),
          // 2. Start verifying the availability of HealthConnect SDK
          target: StatesHealthConnectSdk.verifyingSdkStatus,
        },
        // However, if the SDK Initialization failed, move to this specific flow
        onError: StatesHealthConnectSdk.initializationFailed,
      },
    },
    // SDK Initialization failed
    [StatesHealthConnectSdk.initializationFailed]: {
      // After 1s, try initializing it again
      after: {
        1000: {
          target: StatesHealthConnectSdk.sdkNotInitialized,
        },
      },
    },
    // HealthConnect SDK is initialized, now let's verify the availability status of the SDK
    [StatesHealthConnectSdk.verifyingSdkStatus]: {
      invoke: {
        // Get the availability status of the HealthConnect SDK
        src: ActorsHealthConnectSdk.getSDKAvailablityStatus,
        // Once this is done, 3 different scenarios :
        onDone: [
          {
            // Case 1 - The SDK is available
            guard: (context: { event: { output: number } }) =>
              context.event.output === SdkAvailabilityStatus.SDK_AVAILABLE,
            // Update the context slice
            actions: assign({
              sdkAvailabilityStatus: ({ event }) => event.output,
            }),
            // Get the list of permissions the user granted to the app
            target: StatesHealthConnectSdk.listGrantedPermissions,
          },
          {
            // Case 2 - The SDK is available but require an update
            guard: (context: { event: { output: number } }) =>
              context.event.output ===
              SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED,
            // Update the context slice
            actions: assign({
              sdkAvailabilityStatus: ({ event }) => event.output,
            }),
            // Move to this flow
            target: StatesHealthConnectSdk.sdkUpdateRequired,
          },
          {
            // Case 2 - The SDK is available but require an update
            guard: (context: { event: { output: number } }) =>
              context.event.output === SdkAvailabilityStatus.SDK_UNAVAILABLE,
            // Update the context slice
            actions: assign({
              sdkAvailabilityStatus: ({ event }) => event.output,
            }),
            // Move to this flow
            target: StatesHealthConnectSdk.sdkUnavailable,
          },
        ],
        onError: StatesHealthConnectSdk.sdkUnavailable,
      },
      entry: () => console.log('verifying sdk...'),
    },
    // HealthConnect SDK is not available on the device => end flow
    [StatesHealthConnectSdk.sdkUnavailable]: {
      type: 'final',
      entry: () => console.error('SDK unavailable'),
    },
    // HealthConnect SDK is not available on the device, but an update is required => end flow
    [StatesHealthConnectSdk.sdkUpdateRequired]: {
      type: 'final',
      entry: () => console.error('update sdk required'),
    },
    // HealthConnect SDK is available on the device => check the list of granted permissions
    [StatesHealthConnectSdk.listGrantedPermissions]: {
      invoke: {
        // Get the list of HealthConnect permissions the user granted to this app
        src: ActorsHealthConnectSdk.getGrantedPermissions,

        // Once this is done, 3 different scenarios :
        onDone: [
          {
            // Case 1 - all permissions are granted (read steps & write steps)
            guard: (context: {
              event: {
                output: Array<{
                  accessType: 'read' | 'write'
                  recordType: string
                }>
              }
            }) =>
              context.event.output.filter((permission) => permission.recordType === 'Steps')
                .length >= 1,
            // Update the context slice
            actions: assign({
              canReadSteps: ({ event }) => true,
            }),
            target: StatesHealthConnectSdk.synced,
          },
          {
            // Case 2 - partial permissions granted
            guard: (context: {
              event: {
                output: Array<{
                  accessType: 'read' | 'write'
                  recordType: string
                }>
              }
            }) =>
              context.event.output.filter((permission) => permission.recordType === 'Steps')
                .length < 1,
            // Update the context slice
            actions: assign({
              canReadSteps: ({ event }) =>
                event.output.findIndex(
                  (permission: Permission) =>
                    permission.recordType === 'Steps' && permission.accessType === 'read',
                ) !== -1,
            }),
            target: StatesHealthConnectSdk.notSynced,
          },
          {
            // Case 3 - no permissions granted
            guard: (context: {
              event: {
                output: Array<{
                  accessType: 'read' | 'write'
                  recordType: string
                }>
              }
            }) =>
              context.event.output.filter((permission) => permission.recordType === 'Steps')
                .length === 0,
            // Update the context slice
            actions: assign({
              canReadSteps: ({ event }) => false,
            }),
            target: StatesHealthConnectSdk.notSynced,
          },
        ],
        onError: StatesHealthConnectSdk.grantingPermissionsFailed,
      },
    },
    // Granting permissions failed
    [StatesHealthConnectSdk.grantingPermissionsFailed]: {
      on: {
        [EventsHealthConnectSdk.requestPermissions]: {
          target: StatesHealthConnectSdk.requestingGrantPermissions,
        },
      },
    },
    // User is requesting to grant access to Healthconnect SDK permissions
    [StatesHealthConnectSdk.requestingGrantPermissions]: {
      invoke: {
        // Request access to the read & write steps permissions from HealthConnect SDK
        src: ActorsHealthConnectSdk.requestPermissions,
        onDone: [
          {
            // Case 1 - all requested permissions granted (read steps & write steps)
            guard: (context: {
              event: {
                output: Array<{
                  accessType: 'read' | 'write'
                  recordType: string
                }>
              }
            }) =>
              context.event.output.filter((permission) => permission.recordType === 'Steps')
                .length === 2,
            // Update the context slice
            actions: assign({
              canReadSteps: ({ event }) => true,
            }),
            target: StatesHealthConnectSdk.synced,
          },
          {
            // Case 2 - request permissions partially granted (read steps OR write steps)
            guard: (context: {
              event: {
                output: Array<{
                  accessType: 'read' | 'write'
                  recordType: string
                }>
              }
            }) =>
              context.event.output.filter((permission) => permission.recordType === 'Steps')
                .length === 1,
            // Update the context slice
            actions: assign({
              canReadSteps: ({ event }) =>
                event.output.findIndex(
                  (permission: Permission) =>
                    permission.recordType === 'Steps' && permission.accessType === 'read',
                ) !== -1,
            }),
            target: StatesHealthConnectSdk.notSynced,
          },
          {
            // Case 3 - request permission not granted
            guard: (context: {
              event: {
                output: Array<{
                  accessType: 'read' | 'write'
                  recordType: string
                }>
              }
            }) =>
              context.event.output.filter((permission) => permission.recordType === 'Steps')
                .length === 0,
            // Update the context slice
            actions: assign({
              canReadSteps: ({ event }) => false,
            }),
            target: StatesHealthConnectSdk.notSynced,
          },
        ],
        onError: {},
      },
    },
    // All required permissions are granted
    [StatesHealthConnectSdk.synced]: {
      on: {
        [EventsHealthConnectSdk.verifyGrantedPermissions]: {
          target: StatesHealthConnectSdk.listGrantedPermissions,
        },
        [EventsHealthConnectSdk.checkSdkAvailability]: {
          target: StatesHealthConnectSdk.verifyingSdkStatus,
        },
        [EventsHealthConnectSdk.openDataManagementScreen]: {
          target: StatesHealthConnectSdk.showingExternalScreenDataManagement,
        },
        [EventsHealthConnectSdk.openSettings]: {
          target: StatesHealthConnectSdk.showingExternalScreenSettings,
        },
      },
    },
    // Healthconnect and Superwalk app aren't synced (permissions not granted)
    [StatesHealthConnectSdk.notSynced]: {
      on: {
        [EventsHealthConnectSdk.requestPermissions]: {
          target: StatesHealthConnectSdk.requestingGrantPermissions,
        },
        [EventsHealthConnectSdk.verifyGrantedPermissions]: {
          target: StatesHealthConnectSdk.listGrantedPermissions,
        },
        [EventsHealthConnectSdk.openDataManagementScreen]: {
          target: StatesHealthConnectSdk.showingExternalScreenDataManagement,
        },
        [EventsHealthConnectSdk.openSettings]: {
          target: StatesHealthConnectSdk.showingExternalScreenSettings,
        },
      },
    },
    // Back to Superwalk app after being on external Healthconnect screens
    [StatesHealthConnectSdk.idle]: {
      on: {
        [EventsHealthConnectSdk.requestPermissions]: {
          target: StatesHealthConnectSdk.requestingGrantPermissions,
        },
        [EventsHealthConnectSdk.verifyGrantedPermissions]: {
          target: StatesHealthConnectSdk.listGrantedPermissions,
        },
        [EventsHealthConnectSdk.openDataManagementScreen]: {
          target: StatesHealthConnectSdk.showingExternalScreenDataManagement,
        },
        [EventsHealthConnectSdk.openSettings]: {
          target: StatesHealthConnectSdk.showingExternalScreenSettings,
        },
      },
    },
    // External screen HealthConnect Data management showing
    [StatesHealthConnectSdk.showingExternalScreenDataManagement]: {
      invoke: {
        src: ActorsHealthConnectSdk.showingExternalScreenDataManagement,
        onDone: {
          target: StatesHealthConnectSdk.idle,
        },
      },
    },
    // External screen HealthConnect Settings showing
    [StatesHealthConnectSdk.showingExternalScreenSettings]: {
      invoke: {
        src: ActorsHealthConnectSdk.showingExternalScreenSettings,
        onDone: {
          target: StatesHealthConnectSdk.idle,
        },
      },
    },
  },
})

export { machineHealthConnectSdk, StatesHealthConnectSdk, EventsHealthConnectSdk }
