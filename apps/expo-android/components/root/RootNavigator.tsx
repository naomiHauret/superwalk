import { Stack } from 'expo-router'
import { type FC } from 'react'

/**
 * Renders the different screens based on app state
 */
const RootNavigator: FC = () => {
  return (
    <>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  )
}

export { RootNavigator }
