import { type FC } from 'react'
import { ThirdwebProvider } from 'thirdweb/react'
import { DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { TamaguiProvider } from 'tamagui'
import { QueryClientProvider } from '@tanstack/react-query'
import { useColorScheme } from 'react-native'
import { queryClient } from '@/services'
import { tamaguiConfig } from '@/tamagui.config'

interface RootProviderProps {
  children?: React.ReactNode
}

/**
 * Renders our app root provider.
 * This provider initializes and enables all other providers required for the app to function properly (theme, queries, auth...)
 */
const RootProvider: FC<RootProviderProps> = (props) => {
  const colorScheme = useColorScheme()

  return (
    <QueryClientProvider client={queryClient}>
      <ThirdwebProvider>
        <TamaguiProvider config={tamaguiConfig} defaultTheme={colorScheme!}>
          <ThemeProvider value={DefaultTheme}>{props.children}</ThemeProvider>
        </TamaguiProvider>
      </ThirdwebProvider>
    </QueryClientProvider>
  )
}

export { RootProvider, type RootProviderProps }
