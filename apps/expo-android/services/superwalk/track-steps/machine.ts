import {
  addMinutes,
  differenceInMilliseconds,
  isToday,
  millisecondsToMinutes,
  setMilliseconds,
  setMinutes,
  setSeconds,
} from 'date-fns'
import { Pedometer } from 'expo-sensors'
import { fromPromise, assign, createMachine } from 'xstate'
import { API_URL } from '../config'

/**
 * Helper function to calculate the distance in ms between the current date and the next 10-minute mark
 * A 10 min mark is : 2:00, 2:10, 2:20...
 * For instance, calling this function at 4:32 will return the difference in milliseconds between 4:32 and 4:40
 */
function calculateNextBoundary(): number {
  const now = new Date()

  // Round to the nearest past 10-minute mark
  const tenPeriodStart = Math.floor(now.getMinutes() / 10) * 10

  // Create the next target time by setting the minutes to the next 10-minute mark
  let next = setMinutes(now, tenPeriodStart + 10)
  next = setSeconds(next, 0)
  next = setMilliseconds(next, 0)

  // If the current time is already at a 10-minute mark, adjust to the next one
  if (next <= now) {
    next = addMinutes(next, 10)
  }

  // Return the delay in milliseconds
  const delay = differenceInMilliseconds(next, now)

  console.log(`Next boundary in ${delay} ms (${millisecondsToMinutes(delay)} minutes) ; (${next})`)
  return delay
}

/**
 * Verifies that the app got permission to access the pedometer of the device
 * @return wheter or not the permission was granted
 */
async function canAccessPedometer(): Promise<boolean> {
  const canAccess = await Pedometer.getPermissionsAsync()
  return canAccess.granted
}

/**
 * Request permission for the app to get access to the pedometer of the device
 * @return wheter or not the permission was granted
 */
async function requestPedometerAccess(): Promise<boolean> {
  await Pedometer.requestPermissionsAsync()
  const canAccess = await canAccessPedometer()
  return canAccess
}

/**
 * Synchronize the last update step count of the day with the database
 * @param count - number of steps the player did during the day
 * (Authorized API call - if the user is not identified, this won't work)
 * @return wheter or not the permission was granted
 */
async function syncStepCount(count: number) {
  const logs = await fetch(`${API_URL}/api/player/steps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      count,
    }),
  })
  const result = await logs.json()
  return result
}

enum StatesTrackSteps {
  idle = 'App is idle',
  verifyingPermission = 'Verifying pedometer access permission',
  requestingPermission = 'Requesting permission to access',
  tracking = 'App is tracking steps',
  syncing = 'App is syncing step count with the database',
  ready = 'App is ready to track steps',
}

enum EventsTrackSteps {
  startTracking = 'start-tracking',
  verifyPermission = 'verify-permission',
  requestPermission = 'request-permission',
  updateSteps = 'update-step-count',
}

enum ActorsStepTracker {
  verifyPermission = 'verify',
  requestPermissionAccess = 'request',
  syncStepCount = 'sync',
}

/**
 * State machine to track steps using Expo-sensor pedometer.
 * It performs the following :
 * - verify wheter or not the user granted Superwalk the permission to access the pedometer of their device
 * - let the user grant Superwalk permission to access the pedometer of their device
 * - count steps since app boot
 * - synchronize step count with the database every 10 minutes (on every 10 mark, eg 1:00, 1:10, 1:20, 1:30 etc)
 * - reset the tracker to 1 when a new day starts (at 00:00 local time)
 */
const machineTrackSteps = createMachine(
  {
    id: 'step-tracker',
    initial: StatesTrackSteps.verifyingPermission,
    context: {
      tracking: false,
      canAccessStepTracker: false,
      stepsCountSinceAppBooted: 0,
      lastSyncedAt: new Date(),
      nextSync: calculateNextBoundary(),
      lastStepCountRecorded: {
        count: 0,
        timestamp: new Date(),
      },
    },
    states: {
      // App is waiting for request
      [StatesTrackSteps.idle]: {
        on: {
          [EventsTrackSteps.requestPermission]: {
            target: StatesTrackSteps.requestingPermission,
          },
        },
      },
      // App is requesting to get access to the pedometer data
      [StatesTrackSteps.requestingPermission]: {
        invoke: {
          src: ActorsStepTracker.requestPermissionAccess,
          onDone: [
            {
              guard: (context: { event: { output: boolean } }) => context.event.output === true,
              actions: assign({
                canAccessStepTracker: ({ event }) => event.output,
              }),
              target: StatesTrackSteps.ready,
            },
            {
              guard: (context: { event: { output: boolean } }) => context.event.output === false,
              actions: assign({
                canAccessStepTracker: ({ event }) => event.output,
              }),
              target: StatesTrackSteps.idle,
            },
          ],
        },
      },
      // App is ready to track steps
      [StatesTrackSteps.ready]: {
        on: {
          [EventsTrackSteps.requestPermission]: {
            target: StatesTrackSteps.requestingPermission,
          },
          [EventsTrackSteps.startTracking]: {
            target: StatesTrackSteps.tracking,
            actions: assign({
              tracking: true,
              nextSync: calculateNextBoundary(),
            }),
          },
        },
      },
      // App is verifying it can access pedometer data
      [StatesTrackSteps.verifyingPermission]: {
        invoke: {
          src: ActorsStepTracker.verifyPermission,
          onDone: [
            {
              guard: (context: { event: { output: boolean } }) => context.event.output === true,
              actions: assign({
                canAccessStepTracker: ({ event }) => event.output,
              }),
              target: StatesTrackSteps.ready,
            },
            {
              guard: (context: { event: { output: boolean } }) => context.event.output === false,
              actions: assign({
                canAccessStepTracker: ({ event }) => event.output,
              }),
              target: StatesTrackSteps.idle,
            },
          ],
        },
      },
      // App is tracking steps
      [StatesTrackSteps.tracking]: {
        entry: () => console.log('currently tracking... ,', calculateNextBoundary()),
        after: {
          tenMark: StatesTrackSteps.syncing,
        },
        on: {
          [EventsTrackSteps.updateSteps]: {
            actions: assign({
              stepsCountSinceAppBooted: ({ context, event }) => event.updated,
              lastStepCountRecorded: ({ context, event }) => {
                let newCount = 1
                if (isToday(context.lastStepCountRecorded.timestamp)) {
                  // If today, continue adding to the step count
                  newCount =
                    event.updated -
                    context.lastStepCountRecorded.count +
                    context.stepsCountSinceAppBooted
                }
                return {
                  count: newCount,
                  timestamp: new Date(),
                }
              },
            }),
          },
        },
      },
      // App is sending user's last step count to the database
      [StatesTrackSteps.syncing]: {
        on: {
          [EventsTrackSteps.requestPermission]: {
            target: StatesTrackSteps.requestingPermission,
          },
        },
        invoke: {
          src: ActorsStepTracker.syncStepCount,
          input: ({ context, event }) => ({
            count: context.lastStepCountRecorded.count,
          }),
          onDone: {
            actions: assign({
              lastSyncedAt: () => new Date(),
              nextSync: calculateNextBoundary(),
            }),
            target: StatesTrackSteps.tracking,
          },
        },
      },
    },
  },
  {
    delays: {
      tenMark: () => calculateNextBoundary(),
    },
    actors: {
      [ActorsStepTracker.verifyPermission]: fromPromise(canAccessPedometer),
      [ActorsStepTracker.requestPermissionAccess]: fromPromise(requestPedometerAccess),
      [ActorsStepTracker.syncStepCount]: fromPromise(
        async ({ input }: { input: { count: number } }) => {
          return await syncStepCount(input.count)
        },
      ),
    },
  },
)

export { machineTrackSteps, StatesTrackSteps, EventsTrackSteps }
