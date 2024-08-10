import { Tabs } from 'expo-router'
import React from 'react'

import { TabBarIcon } from '@/components/navigation/TabBarIcon'
import { Colors } from '@/constants/Colors'
import { useColorScheme } from '@/hooks/useColorScheme'
import { Text } from '@/components/ui/text'
import { View } from 'react-native'
import { useActiveWallet, useWalletImage } from 'thirdweb/react'

export default function TabLayout() {
  const colorScheme = useColorScheme()
  const wallet = useActiveWallet()
  const image = useWalletImage(wallet?.id)
  return (
    <View className="grow bg-transparent">
      <View className="grow bg-transparent">
        <View className="px-2 items-start bg-transparent justify-between pt-4 pb-2">
          <Text>Avatar goes here</Text>
        </View>
        <Tabs
          initialRouteName="game"
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          }}
        >
          <Tabs.Screen
            name="game"
            options={{
              tabBarIcon: ({ color, focused }) => (
                <TabBarIcon name={focused ? 'wallet' : 'wallet-outline'} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="leaderboard"
            options={{
              title: 'Leaderboard',
              tabBarIcon: ({ color, focused }) => (
                <TabBarIcon name={focused ? 'reader' : 'reader-outline'} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="friends"
            options={{
              title: 'Friends',
              tabBarIcon: ({ color, focused }) => (
                <TabBarIcon name={focused ? 'code-slash' : 'code-slash-outline'} color={color} />
              ),
            }}
          />
        </Tabs>
      </View>
    </View>
  )
}
