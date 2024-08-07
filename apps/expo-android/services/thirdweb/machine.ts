import { assign, setup } from 'xstate'

enum StatesAuthentication {
  idle = 'User returned to Superwalk app',
  unauthenticated = 'User is unauthenticated',
  authenticated = 'User is authenticated on Superwalk',
  signingOff = 'User is signing off',
  signingIn = 'User is signing in',
  syncing = 'Verifying if user is authenticated',
  error = 'Action was unsuccessful',
}

enum EventsAuthentication {
  authenticate = 'authenticate',
  done = 'action-successful',
  error = 'action-complete',
  logout = 'logout',
  sync = 'sync-auth',
}

/**
 * Authentication SDK state machine.
 */
const machineAuthentication = setup({
  types: {
    events: {} as
      | { type: EventsAuthentication.authenticate }
      | { type: EventsAuthentication.logout }
      | { type: EventsAuthentication.done }
      | { type: EventsAuthentication.error }
      | { type: EventsAuthentication.sync },

    context: {} as {
      authenticated: boolean
      syncing: boolean
    },
  },
}).createMachine({
  id: 'authentication',
  initial: StatesAuthentication.idle,
  context: {
    authenticated: false,
    syncing: false,
  },
  states: {
    [StatesAuthentication.idle]: {
      on: {
        [EventsAuthentication.authenticate]: {
          target: StatesAuthentication.signingIn,
          actions: assign({
            syncing: true,
            authenticated: false,
          }),
        },
        [EventsAuthentication.sync]: {
          target: StatesAuthentication.syncing,
          actions: assign({
            syncing: true,
          }),
        },
        [EventsAuthentication.logout]: {
          target: StatesAuthentication.signingOff,
          actions: assign({
            syncing: true,
          }),
        },
      },
    },
    [StatesAuthentication.syncing]: {
      on: {
        [EventsAuthentication.done]: {
          target: StatesAuthentication.authenticated,
          actions: assign({
            syncing: false,
          }),
        },
        [EventsAuthentication.error]: {
          target: StatesAuthentication.error,
          actions: assign({
            syncing: false,
          }),
        },
      },
    },
    [StatesAuthentication.signingIn]: {
      on: {
        [EventsAuthentication.done]: {
          target: StatesAuthentication.authenticated,
          actions: assign({
            syncing: true,
            authenticated: true,
          }),
        },
        [EventsAuthentication.error]: {
          target: StatesAuthentication.error,
          actions: assign({
            syncing: false,
            authenticated: false,
          }),
        },
      },
    },
    [StatesAuthentication.authenticated]: {
      on: {
        [EventsAuthentication.logout]: {
          target: StatesAuthentication.signingOff,
          actions: assign({
            syncing: true,
          }),
        },
        [EventsAuthentication.sync]: {
          target: StatesAuthentication.syncing,
          actions: assign({
            syncing: true,
          }),
        },
      },
    },
    [StatesAuthentication.signingOff]: {
      on: {
        [EventsAuthentication.done]: {
          target: StatesAuthentication.unauthenticated,
          actions: assign({
            syncing: true,
            authenticated: false,
          }),
        },
        [EventsAuthentication.error]: {
          target: StatesAuthentication.error,
          actions: assign({
            syncing: false,
          }),
        },
      },
    },
    [StatesAuthentication.unauthenticated]: {
      on: {
        [EventsAuthentication.authenticate]: {
          target: StatesAuthentication.signingIn,
          actions: assign({
            syncing: true,
          }),
        },
      },
    },
  },
})

export { machineAuthentication, EventsAuthentication, StatesAuthentication }
