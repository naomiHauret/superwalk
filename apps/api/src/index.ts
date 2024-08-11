import { Elysia, t } from 'elysia'
import { createAuth } from 'thirdweb/auth'
import { privateKeyToAccount } from 'thirdweb/wallets'
import { supabase } from './libs/supabase'
import { thirdwebClient } from './libs/thirdweb'
import { cors } from '@elysiajs/cors'
import { jwtDecode } from 'jwt-decode'
import { baseSepolia } from 'thirdweb/chains'
import {
  batchUpdateAllPlayersStepsCount,
  StepCountReportSource,
  RecordLastStepsCount,
  endTurn,
  batchUpdateAllPlayersScores,
  calculateScores,
} from './libs/superwalk'
import { getCurrentTurn, getTurnActions } from './libs/subgraph'

/**
 * Authentication via Thirdweb + SIWE
 * @see  https://portal.thirdweb.com/typescript/v5/auth
 */
const thirdwebAuth = createAuth({
  domain: process.env.CLIENT_DOMAIN!,
  client: thirdwebClient,
  adminAccount: privateKeyToAccount({
    client: thirdwebClient,
    privateKey: process.env.BACKEND_WALLET_PK!,
  }),
})

/**
 * Superwalk backend
 * Handles :
 * - (/_auth/*): Backend authentication via Thirdweb Connect + SIWE
 * - (/api/*) Authenticated API calls (eg: only connected users can call the route that register their steps in the database)
 */
const app = new Elysia()
  // Cors
  .use(
    cors({
      origin: `${process.env.NODE_ENV === 'development' ? 'http' : 'https'}://${
        process.env.CLIENT_DOMAIN
      }`,
      credentials: true,
    }),
  )
  // Error handling
  .onError(({ code, error }) => {
    return new Response(error.toString())
  })

  /**
   * Thirdweb auth SIWE challenge generation
   */
  .get(
    '/_auth/challenge',
    async ({ query }) => {
      const address = query.address
      const chainId = query.chainId as string | undefined
      const payload = await thirdwebAuth.generatePayload({
        address,
        chainId: chainId ? parseInt(chainId) : undefined,
      })
      return payload
    },
    {
      query: t.Object({
        address: t.String(),
        chainId: t.String(),
      }),
    },
  )
  /**
   * Thirdweb auth backend login
   */
  .post(
    '/_auth/login',
    async ({ body, cookie }) => {
      //@ts-ignore
      const verifiedPayload = await thirdwebAuth.verifyPayload(body)
      if (verifiedPayload.valid) {
        const jwt = await thirdwebAuth.generateJWT({
          payload: verifiedPayload.payload,
        })
        // set jwt cookie
        cookie.jwt.value = jwt

        return { token: jwt }
      }

      throw new Error('Failed to login')
    },
    {
      type: 'json',
    },
  )
  /**
   * Thirdweb auth backend JWT validity check
   */
  .get('/_auth/verify', async ({ cookie }) => {
    const jwt = cookie?.jwt

    if (!jwt) {
      return false
    }

    const authResult = await thirdwebAuth.verifyJWT({ jwt: `${jwt}` })

    if (!authResult.valid) {
      return false
    }

    return true
  })
  /**
   * Thirdweb auth backend logout
   */

  .post(
    '/_auth/logout',
    ({ cookie }) => {
      delete cookie.jwt
      return true
    },
    {
      type: 'json',
    },
  )
  /**
   * Batch update all players steps onchain (triggered via Supabase cron job)
   * This route should be protected by a JWT or headers or something but it's not the case here
   * (although it really should)
   */
  .post('/api/steps-report', async ({ body, headers }) => {
    console.log('reporting steps onchain ...')
    // uses a view function that returns the last (most recent) steps report of each player today
    const { data, error } = await supabase
      .from('most_recent_steps_per_player_today')
      .select('player,updated_count')
    if ((data?.length ?? 0) > 0) {
      const tx = await batchUpdateAllPlayersStepsCount(
        data as Array<RecordLastStepsCount>,
        baseSepolia.id,
      )
      console.log('tx steps update', tx)
    } else {
      console.log('no update to perform')
    }
  })
  /**
   * Record scores & Advance to next turn (triggered via Supabase cron job)
   */
  .post('/api/turn', async ({ body, headers }) => {
    // Get current turn
    const turn = await getCurrentTurn()
    // Get list of actions that happened during this turn
    const data = await getTurnActions(turn)
    const playerToTurnDataMapping = calculateScores(data)

    // Calculate scores & batch update scores
    if (Object.keys(playerToTurnDataMapping)?.length > 0) {
      const txScoresBatch = await batchUpdateAllPlayersScores(
        playerToTurnDataMapping,
        baseSepolia.id,
      )
    }

    const txEndTurn = await endTurn(baseSepolia.id)
  })
  .guard(
    {
      // Ensure only connected players can log their steps
      async beforeHandle({ set, body, cookie: { jwt } }) {
        if (!jwt.value) {
          return (set.status = 'Unauthorized')
        }
        const authResult = await thirdwebAuth.verifyJWT({ jwt: `${jwt.value}` })

        if (!authResult.valid) {
          return (set.status = 'Unauthorized')
        }
      },
    },
    (app) =>
      app

        /**
         * Record player's steps in the database
         * This is called in the background in the app by a finite state machine (not user triggered but still client triggered anyway)
         */
        .post(
          '/api/player/steps',
          async ({ body: { count }, cookie, headers }) => {
            //@ts-ignore
            const decodedJwt = jwtDecode(cookie.jwt.value)
            //@ts-ignore
            const player = decodedJwt.sub
            const { data, error } = await supabase
              .from('StepsReports')
              .insert([{ player, updated_count: count, source: StepCountReportSource.self }])
              .select()

            return {
              data,
              error,
            }
          },
          {
            type: 'json',
            body: t.Object({
              count: t.Integer({ minimum: 0 }),
            }),
          },
        ),
  )

  .listen(3000)

console.log(`🦊 Elysia is running at -- ${app.server?.hostname}:${app.server?.port}`)
