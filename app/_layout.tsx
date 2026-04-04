import { Stack } from 'expo-router';
import { AuthProvider } from '../ctx';
import FlashMessage, { showMessage } from 'react-native-flash-message';
import { useEffect } from 'react';
import { getMessaging } from '@react-native-firebase/messaging';
import { router } from 'expo-router';
import { getDatabase } from '@react-native-firebase/database';
import { getAuth } from '@react-native-firebase/auth';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  useEffect(() => {
    // Handle notifications that opened the app from background state
    getMessaging().getInitialNotification().then(remoteMessage => {
      console.log('Initial notification check:', remoteMessage);
      const notificationType = remoteMessage?.data?.type;
      if (notificationType === 'new_hangout' || notificationType === 'poll_closed') {
        console.log('Initial notification is hangout-related:', remoteMessage.data);
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
      const notificationType = remoteMessage?.data?.type;
      if (notificationType === 'new_hangout' || notificationType === 'poll_closed') {
        console.log('Background notification is hangout-related:', remoteMessage.data);
        const { groupId, hangoutId } = remoteMessage.data;
        if (groupId && hangoutId) {
          console.log('Navigating from background to:', `/(tabs)/(groups)/hangout/${hangoutId}`);
          router.push(`/(tabs)/(groups)/hangout/${hangoutId}`);
        }
      }
    });

    // Handle deep links (App Links / Universal Links and legacy chill://)
    const handleDeepLink = async (url: string) => {
      try {
        console.log('[DeepLink] Starting deep link handling for URL:', url);
        
        const currentUser = getAuth().currentUser;
        if (!currentUser) {
          console.log('[DeepLink] User not authenticated, redirecting to login');
          router.replace('/login');
          return;
        }
        
        const userId = currentUser.uid;
        console.log('[DeepLink] Current user ID:', userId);

        // Normalize path: https://chillhangouts.ca/app/hangout/123 -> hangout/123; chill://hangout/123 -> hangout/123
        let path: string;
        if (url.startsWith('chill://')) {
          path = url.slice('chill://'.length).replace(/^\/+/, '');
        } else {
          try {
            const parsed = new URL(url);
            const match = parsed.pathname.match(/\/app\/?(.*)$/);
            path = match ? match[1] || '' : parsed.pathname.replace(/^\/+/, '');
          } catch {
            console.log('[DeepLink] Invalid URL');
            return;
          }
        }

        // Handle join-group/:groupId
        const joinGroupMatch = path.match(/^join-group\/([^\/]+)/);
        if (joinGroupMatch) {
          const groupId = joinGroupMatch[1];
          console.log('[DeepLink] Join group:', groupId);
          const [groupMemberSnapshot, groupNameSnapshot] = await Promise.all([
            getDatabase().ref(`/groups/${groupId}/members/${userId}`).once('value'),
            getDatabase().ref(`/groups/${groupId}/name`).once('value'),
          ]);
          if (!groupMemberSnapshot.exists() || groupMemberSnapshot.val() !== true) {
            await Promise.all([
              getDatabase().ref(`/groups/${groupId}/members/${userId}`).set(true),
              getDatabase().ref(`/users/${userId}/groups/${groupId}`).set(true)
            ]);
            const groupName = groupNameSnapshot.val();
            showMessage({
              message: `You've been added to group: ${groupName ?? '?'}`,
              type: 'success',
              duration: 4000,
            });
          }
          router.replace('/(tabs)/(groups)');
          router.push(`/(tabs)/(groups)/group/${groupId}`);
          return;
        }

        // Handle hangout/:id
        const hangoutMatch = path.match(/^hangout\/([^\/]+)/);
        if (!hangoutMatch) {
          console.log('[DeepLink] Unknown path:', path);
          return;
        }
        
        const hangoutId = hangoutMatch[1];
        console.log('[DeepLink] Extracted hangout ID:', hangoutId);
        
        // Get the group ID from the hangout
        console.log('[DeepLink] Fetching group ID from hangout:', hangoutId);
        const hangoutGroupSnapshot = await getDatabase()
          .ref(`/hangouts/${hangoutId}/group`)
          .once('value');
        
        if (!hangoutGroupSnapshot.exists()) {
          console.log('[DeepLink] Hangout not found or no permission to read it');
          router.replace('/');
          return;
        }
        
        const groupId = hangoutGroupSnapshot.val();
        console.log('[DeepLink] Found group ID:', groupId);
        
        // Check if user is member of the group
        console.log(`[DeepLink] Checking if user ${userId} is member of group:`, groupId);
        const [groupMemberSnapshot, groupNameSnapshot] = await Promise.all([
          getDatabase().ref(`/groups/${groupId}/members/${userId}`).once('value'),
          getDatabase().ref(`/groups/${groupId}/name`).once('value'),
        ]);

        if (!groupMemberSnapshot.exists() || groupMemberSnapshot.val() !== true) {
          await Promise.all([
            getDatabase().ref(`/groups/${groupId}/members/${userId}`).set(true),
            getDatabase().ref(`/users/${userId}/groups/${groupId}`).set(true)
          ]);
          const groupName = groupNameSnapshot.val();
          showMessage({
            message: `You've been added to group: ${groupName ?? '?'}`,
            type: 'success',
            duration: 4000,
          });
        }
        
        // Navigate to the hangout with the group as the back destination.
        // replace clears the deep link loading screen from the stack, then
        // push puts the hangout on top so back returns to the group.
        console.log('[DeepLink] Navigating to hangout:', hangoutId);
        router.replace(`/(tabs)/(groups)/group/${groupId}`);
        router.push(`/(tabs)/(groups)/hangout/${hangoutId}`);
      } catch (error: any) {
        console.error('[DeepLink] Error handling deep link:', error);
        if (error.code === 'PERMISSION_DENIED') {
          console.log('[DeepLink] Permission denied, redirecting to groups page');
          // Redirect to groups page for permission errors
          router.replace('/(tabs)/(groups)');
        } else {
          console.log('[DeepLink] Other error, redirecting to root');
          // For other errors, redirect to root
          router.replace('/');
        }
      }
    };

    // Listen for deep links
    Linking.addEventListener('url', (event) => {
      console.log('Deep link received:', event.url);
      handleDeepLink(event.url);
    });

    // Check for initial deep link
    Linking.getInitialURL().then(url => {
      if (url) {
        console.log('Initial deep link:', url);
        handleDeepLink(url);
      }
    });

    return () => {
      unsubscribe();
      // Clean up deep link listener
      Linking.removeAllListeners('url');
    };
  }, []);

  return (
    <SafeAreaProvider>
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
            presentation: 'card',
            navigationBarColor: '#7dacf9',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <FlashMessage position="top" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
