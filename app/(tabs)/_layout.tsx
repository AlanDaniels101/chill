import { Redirect, Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from 'react-native';

import { useAuth } from '../../ctx';

export default function TabLayout() {
  const { userId, isLoading } = useAuth()

  if (isLoading) {
    return <Text>Loading</Text>
  }

  if (!userId) {
    return <Redirect href="/login" />
  }
  
  return (
    
    <Tabs
        screenOptions={{
            tabBarActiveTintColor: '#ffd33d',
            headerStyle: {
                backgroundColor: '#7dacf9',
              },
              headerShadowVisible: false,
              headerTintColor: '#fff',
              tabBarStyle: {
              backgroundColor: '#7dacf9',
            },
        }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home-sharp' : 'home-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: 'About',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'information-circle' : 'information-circle-outline'} color={color} size={24}/>
          ),
        }}
      />
    </Tabs>
  );
}