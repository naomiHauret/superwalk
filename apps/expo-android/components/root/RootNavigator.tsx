import { Slot, SplashScreen } from 'expo-router'
import { useEffect, type FC } from 'react'
import { View } from 'react-native'
import { useFonts } from 'expo-font'
import { useIsAutoConnecting } from 'thirdweb/react'

/**
 * Renders the different screens based on app state
 */
const RootNavigator: FC = () => {
  const isAutoConnecting = useIsAutoConnecting()

  // Load assets
  const [loaded, error] = useFonts({
    'Satoshi-Regular': require('./../../assets/fonts/Satoshi-Regular.ttf'),
    'Satoshi-Italic': require('./../../assets/fonts/Satoshi-Italic.ttf'),
    'Satoshi-Medium': require('./../../assets/fonts/Satoshi-Medium.ttf'),
    'Satoshi-MediumItalic': require('./../../assets/fonts/Satoshi-MediumItalic.ttf'),
    'Satoshi-Bold': require('./../../assets/fonts/Satoshi-Bold.ttf'),
    'Satoshi-BoldItalic': require('./../../assets/fonts/Satoshi-BoldItalic.ttf'),
    'Satoshi-Black': require('./../../assets/fonts/Satoshi-Black.ttf'),
    'Satoshi-BlackItalic': require('./../../assets/fonts/Satoshi-BlackItalic.ttf'),
  })

  useEffect(() => {
    if (loaded || error || isAutoConnecting === false) {
      SplashScreen.hideAsync()
    }
  }, [loaded, error])

  if (!loaded && !error && isAutoConnecting) {
    return null
  }

  return (
    <View className="grow bg-background">
      <Slot initialRouteName="index" />
    </View>
  )
}

export { RootNavigator }
