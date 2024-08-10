import { type FC } from 'react'
import { ThirdwebProvider } from 'thirdweb/react'
import { Theme, ThemeProvider } from '@react-navigation/native'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient, ProviderTrackStepsMachine, ProviderAccountPlayer } from '@/services'
import { NAV_THEME } from '@/lib/constants'

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
  return (
    <QueryClientProvider client={queryClient}>
      <ThirdwebProvider>
        <ThemeProvider value={LIGHT_THEME}>
          <ProviderAccountPlayer>
            <ProviderTrackStepsMachine>{props.children}</ProviderTrackStepsMachine>
          </ProviderAccountPlayer>
        </ThemeProvider>
      </ThirdwebProvider>
    </QueryClientProvider>
  )
}

export { RootProvider, type RootProviderProps }
