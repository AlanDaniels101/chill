import { Stack } from 'expo-router';
import { AuthProvider } from '../ctx';
import FlashMessage from 'react-native-flash-message';
import { useEffect } from 'react';
import { getMessaging } from '@react-native-firebase/messaging';
import { router } from 'expo-router';
import { getDatabase } from '@react-native-firebase/database';
import { getAuth } from '@react-native-firebase/auth';
import { Linking } from 'react-native';

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

    // Handle deep links
    const handleDeepLink = async (url: string) => {
      try {
        console.log('[DeepLink] Starting deep link handling for URL:', url);
        
        // Get current user from Firebase auth
        const currentUser = getAuth().currentUser;
        if (!currentUser) {
          console.log('[DeepLink] User not authenticated, redirecting to login');
          router.replace('/login');
          return;
        }
        
        const userId = currentUser.uid;
        console.log('[DeepLink] Current user ID:', userId);

        // Parse the URL to get the hangout ID
        const match = url.match(/hangout\/([^\/]+)/);
        if (!match) {
          console.log('[DeepLink] No hangout ID found in URL');
          return;
        }
        
        const hangoutId = match[1];
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
        const groupMemberSnapshot = await getDatabase()
          .ref(`/groups/${groupId}/members/${userId}`)
          .once('value');

        console.log('[DeepLink] Member snapshot:', groupMemberSnapshot.val());
        
        // Log all group members
        const groupMembersSnapshot = await getDatabase()
          .ref(`/groups/${groupId}/members`)
          .once('value');
        console.log('[DeepLink] Group members:', groupMembersSnapshot.val());
        
        if (!groupMemberSnapshot.exists() || groupMemberSnapshot.val() !== true) {
          console.log('[DeepLink] User not a member, adding to group');
          // User is not a member of the group, join the group first
          await Promise.all([
            // Add user to group's members
            getDatabase()
              .ref(`/groups/${groupId}/members/${userId}`)
              .set(true),
            // Add group to user's groups
            getDatabase()
              .ref(`/users/${userId}/groups/${groupId}`)
              .set(true)
          ]);
          console.log('[DeepLink] Successfully added user to group');
          
          // Log updated group members
          const updatedGroupMembersSnapshot = await getDatabase()
            .ref(`/groups/${groupId}/members`)
            .once('value');
          console.log('[DeepLink] Updated group members:', updatedGroupMembersSnapshot.val());
        } else {
          console.log('[DeepLink] User is already a member of the group');
        }
        
        // Navigate to the hangout
        console.log('[DeepLink] Navigating to hangout:', hangoutId);
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
  );
}
