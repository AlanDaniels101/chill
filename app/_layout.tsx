import { Stack } from 'expo-router';
import { AuthProvider } from '../ctx';
import FlashMessage from 'react-native-flash-message';
import { useEffect } from 'react';
import { getMessaging } from '@react-native-firebase/messaging';
import { router } from 'expo-router';

export default function RootLayout() {
  useEffect(() => {
    // Handle notifications that opened the app from background state
    getMessaging().getInitialNotification().then(remoteMessage => {
      console.log('Initial notification check:', remoteMessage);
      if (remoteMessage?.data?.type === 'new_hangout') {
        console.log('Initial notification is new_hangout:', remoteMessage.data);
        const { groupId, hangoutId } = remoteMessage.data;
        if (groupId && hangoutId) {
          console.log('Navigating from killed state to:', `/(tabs)/(groups)/hangout/${hangoutId}`);
          router.push(`/(tabs)/(groups)/hangout/${hangoutId}`);
        }
      }
    });

    // Handle notifications when app is in background
    const unsubscribe = getMessaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Background notification opened:', remoteMessage);
      if (remoteMessage?.data?.type === 'new_hangout') {
        console.log('Background notification is new_hangout:', remoteMessage.data);
        const { groupId, hangoutId } = remoteMessage.data;
        if (groupId && hangoutId) {
          console.log('Navigating from background to:', `/(tabs)/(groups)/hangout/${hangoutId}`);
          router.push(`/(tabs)/(groups)/hangout/${hangoutId}`);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#7dacf9',
          },
          headerTintColor: '#fff',
          headerShadowVisible: false,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          animation: 'slide_from_right',
          presentation: 'card'
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <FlashMessage position="top" />
    </AuthProvider>
  );
}
