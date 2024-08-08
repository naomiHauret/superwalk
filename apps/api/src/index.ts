import { Elysia, t } from 'elysia'
import { createAuth } from 'thirdweb/auth'
import { privateKeyToAccount } from 'thirdweb/wallets'
import { supabase } from './libs/supabase'
import { thirdwebClient } from './libs/thirdweb'
import { cors } from '@elysiajs/cors'
import { jwtDecode } from 'jwt-decode'

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
  // Authentication via Thirdweb
  // - SIWE
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
  .post(
    '/_auth/login',
    async ({ body, cookie }) => {
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
  // Verify if JWT is valid
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
  // Logout
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
  // App routes
  // Player
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
        // Record player's steps in the database
        .post(
          '/api/player/steps',
          async ({ body: { count }, cookie, headers }) => {
            console.log('Synchronizing at ', new Date())
            const decodedJwt = jwtDecode(cookie.jwt.value)
            const player = decodedJwt.sub
            const { data, error } = await supabase
              .from('StepsReports')
              .insert([{ player, updated_count: count, source: StepCountReportSource.self }])
              .select()

            console.log('inserted ', data, error)
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
