import { Redirect, Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../ctx';
import LoadingScreen from '../components/LoadingScreen';

export default function TabLayout() {
  const { userId, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingScreen />;
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
          title: 'Groups',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="group/[id]"
        options={{
          href: null
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          href: null
        }}
      />
      <Tabs.Screen
        name="hangout/[id]"
        options={{
          href: null
        }}
      />
    </Tabs>
  );
}