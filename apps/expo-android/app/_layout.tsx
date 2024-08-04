import { RootNavigator, RootProvider } from '@/components'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { type FC, useEffect } from 'react'
import 'react-native-reanimated'

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync()

/**
 * Renders the base layout of our app (shared by all screen)
 */
const Layout: FC = () => {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  })

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync()
    }
  }, [loaded])

  if (!loaded) {
    return null
  }

  return (
    <RootProvider>
      <RootNavigator />
    </RootProvider>
  )
}

export default Layout
