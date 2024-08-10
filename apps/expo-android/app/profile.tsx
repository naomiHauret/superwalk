import { H1 } from '@/components/ui/typography'
import { type FC } from 'react'
import { ScrollView } from 'react-native'
/**
 * First screen the user will come across
 * Explains the game, and show connect buttons
 */
const ScreenProfile: FC = () => {
  return (
    <ScrollView className="py-8 grow bg-accent">
      <H1 className="mt-auto font-SatoshiBold">[Profile]</H1>
    </ScrollView>
  )
}

export { ScreenProfile }

export default ScreenProfile
