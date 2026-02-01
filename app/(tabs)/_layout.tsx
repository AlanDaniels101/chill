import { Redirect, Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../ctx';
import LoadingScreen from '../components/LoadingScreen';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
// Android 15+ edge-to-edge often reports 0 for bottom inset; use a fallback so the tab bar sits above the system nav bar (~48dp for 3-button nav, ~24–32 for gesture)
const ANDROID_NAV_BAR_FALLBACK = 48;

export default function TabLayout() {
  const { userId, isLoading } = useAuth();
  const insets = useSafeAreaInsets();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!userId) {
    return <Redirect href="/login" />
  }

  // Use real inset or fallback on Android when edge-to-edge reports 0
  const bottomInset =
    Platform.OS === 'android'
      ? Math.max(insets.bottom, ANDROID_NAV_BAR_FALLBACK)
      : insets.bottom;

  return (
    <Tabs
      safeAreaInsets={{ bottom: bottomInset }}
      screenOptions={{
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.4)',
        headerStyle: {
          backgroundColor: '#7dacf9',
        },
        headerShadowVisible: false,
        headerTintColor: '#fff',
        tabBarStyle: {
          backgroundColor: '#7dacf9',
          borderTopWidth: 0,
          elevation: 0,
          height: TAB_BAR_HEIGHT + (Platform.OS === 'android' ? bottomInset : 0),
          paddingBottom: Platform.OS === 'ios' ? 28 : 12 + bottomInset,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -4,
          },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="(groups)"
        options={{
          title: 'Groups',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'people' : 'people-outline'} 
              color={color} 
              size={26} 
              style={{
                transform: [{ scale: focused ? 1.05 : 1 }],
                opacity: focused ? 1 : 0.6,
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? 'person' : 'person-outline'} 
              color={color} 
              size={26}
              style={{
                transform: [{ scale: focused ? 1.05 : 1 }],
                opacity: focused ? 1 : 0.6,
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          href: null
        }}
      />
    </Tabs>
  );
}