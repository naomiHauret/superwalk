import '@/globals.css'
import { RootNavigator, RootProvider } from '@/components/root'
import * as SplashScreen from 'expo-splash-screen'
import { type FC } from 'react'
import 'react-native-reanimated'
import { StatusBar } from 'expo-status-bar'
import { AutoConnect } from 'thirdweb/react'
import { client, wallets } from '@/services/thirdweb'

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync()

/**
 * Renders the base layout of our app (shared by all screen)
 */
const AppLayout: FC = () => {
  return (
    <RootProvider>
      <RootNavigator />
      <StatusBar style="dark" translucent={true} />
      <AutoConnect wallets={wallets} client={client} />
    </RootProvider>
  )
}

export default AppLayout
