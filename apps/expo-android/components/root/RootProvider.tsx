import { type FC } from 'react'
import { ThirdwebProvider } from 'thirdweb/react'
import { Theme, ThemeProvider } from '@react-navigation/native'
import { QueryClientProvider } from '@tanstack/react-query'
import { TamaguiProvider } from '@tamagui/core'
import {
  queryClient,
  ProviderTrackStepsMachine,
  ProviderCurrentTurn,
  ProviderAccountPlayer,
} from '@/services'
import { NAV_THEME } from '@/lib/constants'
import { tamaguiConfig } from '@/tamagui.config'
import { useColorScheme } from 'react-native'
const LIGHT_THEME: Theme = {
  dark: false,
  colors: NAV_THEME.light,
}

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
        <ProviderCurrentTurn>
          <ProviderAccountPlayer>
            <ProviderTrackStepsMachine>
              <TamaguiProvider config={tamaguiConfig} defaultTheme={colorScheme!}>
                <ThemeProvider value={LIGHT_THEME}>{props.children}</ThemeProvider>
              </TamaguiProvider>
            </ProviderTrackStepsMachine>
          </ProviderAccountPlayer>
        </ProviderCurrentTurn>
      </ThirdwebProvider>
    </QueryClientProvider>
  )
}

export { RootProvider, type RootProviderProps }
