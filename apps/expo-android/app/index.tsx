import { Text } from '@/components/ui/text'
import { H1 } from '@/components/ui/typography'
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
import { type FC } from 'react'
import { ScrollView } from 'react-native'
import { ConnectButton } from 'thirdweb/react'

/**
 * First screen the user will come across
 * Explains the game, and show connect buttons
 */
const ScreenStart: FC = () => {
  return (
    <ScrollView className="py-8 grow bg-accent">
      <H1 className="mt-auto font-SatoshiBold">[Headline]</H1>
      <Text>[Content]</Text>
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
      />
    </ScrollView>
  )
}

export { ScreenStart }

export default ScreenStart
