import {
  availableChains,
  client,
  doLogin,
  doLogout,
  getPayloadLogin,
  isLoggedIn,
  onConnect,
  onDisconnect,
  wallets,
} from '@/services/thirdweb/config'
import React, { type FC } from 'react'
import { ConnectButton } from 'thirdweb/react'
import { YStack, H6, H2, Paragraph, Button } from 'tamagui'
/**
 * First screen the user will come across
 * Explains the game, and show connect buttons
 */
const ScreenStart: FC = () => {
  return (
    <YStack theme="blue" gap="$3" py="$4" px="$3" jc="flex-end" ai="center" f={1}>
      <H6>Mario Party meets Fitbit</H6>
      <H2 ta="center" fontWeight="bold">
        Mix fit with fun on Superwalk !
      </H2>
      <Paragraph py="$3">
        Superwalk is a fun step tracker game that lets you compete against friends and strangers.
        Walk, use items, bribe other players and defend yourself to win !
      </Paragraph>
      <Paragraph size="$6" ta="center" pb="$3" fontWeight="semibold">
        What are you waiting to get started ?
      </Paragraph>
      <ConnectButton
        auth={{
          getLoginPayload: getPayloadLogin,
          doLogin: doLogin,
          isLoggedIn: isLoggedIn,
          doLogout: doLogout,
        }}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        theme="light"
        client={client}
        wallets={wallets}
        chains={availableChains}
        connectButton={{
          label: 'Join & start playing',
        }}
        signInButton={{
          label: 'Continue',
        }}
        connectModal={{
          title: 'Sign-in to use Superwalk',
          showThirdwebBranding: false,
        }}
      />
      <Button chromeless fontWeight="semibold">
        Tell me more first
      </Button>
    </YStack>
  )
}

export { ScreenStart }

export default ScreenStart
