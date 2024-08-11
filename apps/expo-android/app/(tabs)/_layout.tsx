import { Tabs } from 'expo-router'
import React from 'react'

import { TabBarIcon } from '@/components/navigation/TabBarIcon'
import { Colors } from '@/constants/Colors'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useActiveWallet } from 'thirdweb/react'
import { YStack } from 'tamagui'

export default function TabLayout() {
  const colorScheme = useColorScheme()
  const wallet = useActiveWallet()
  return (
    <YStack f={1}>
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
            title: 'Play',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'walk-sharp' : 'walk-outline'} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="leaderboard"
          options={{
            title: 'Leaderboard',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'ribbon' : 'ribbon-outline'} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="friends"
          options={{
            title: 'Friends',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'people-sharp' : 'people-outline'} color={color} />
            ),
          }}
        />
      </Tabs>
    </YStack>
  )
}
