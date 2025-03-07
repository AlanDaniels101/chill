import { router } from 'expo-router';
import { useContext, createContext, type PropsWithChildren, useEffect, useState } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';

import { getAuth } from '@react-native-firebase/auth'
import { getDatabase } from '@react-native-firebase/database';
import { getMessaging, AuthorizationStatus } from '@react-native-firebase/messaging';

const requestNotificationPermission = async () => {
  try {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      // For iOS, use Firebase Messaging's permission request
      const authStatus = await getMessaging().requestPermission();
      return (
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL
      );
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

const checkNotificationPermission = async () => {
  try {
    if (Platform.OS === 'android') {
      return await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
    } else {
      // For iOS, use Firebase Messaging's permission check
      const authStatus = await getMessaging().hasPermission();
      return (
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL
      );
    }
  } catch (error) {
    console.error('Error checking notification permission:', error);
    return false;
  }
};

const AuthContext = createContext(
  {
    signIn: async () => {},
    signOut: async () => {},
    userId: '',
    isLoading: true,
    notificationsEnabled: false,
    toggleNotifications: async (groupId: string, enabled: boolean): Promise<boolean> => false,
    checkNotificationStatus: async (groupId: string): Promise<boolean> => false,
  }
)

export const AuthProvider = ({ children }: PropsWithChildren) => {
    const [userId, setUserId] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [notificationsEnabled, setNotificationsEnabled] = useState(false)

    const signIn = async () => {
      try {
        setIsLoading(true)
        const result = await getAuth().signInWithPhoneNumber('+16505554948')
        await result.confirm('123321')
      } catch (e) {
        console.log(e)
      }
    }

    const signOut = async () => {
      try {
        await getAuth().signOut()
      } catch (e) {
        console.log(e)
      }
    }

    const toggleNotifications = async (groupId: string, enabled: boolean): Promise<boolean> => {
      try {
        if (!userId) return false;

        if (enabled) {
          // Check/request permissions if enabling
          const hasPermission = await checkNotificationPermission();
          if (!hasPermission) {
            const granted = await requestNotificationPermission();
            if (!granted) {
              console.log('Notification permission denied');
              return false;
            }
          }
        }

        // Subscribe/unsubscribe from the group topic
        const topic = `group_${groupId}`;
        if (enabled) {
          await getMessaging().subscribeToTopic(topic);
        } else {
          await getMessaging().unsubscribeFromTopic(topic);
        }

        // Update user's notification preferences in the database
        await getDatabase()
            .ref(`/users/${userId}/notificationPreferences/${groupId}`)
            .set(enabled);

        return true;
      } catch (error) {
        console.error('Error toggling notifications:', error);
        return false;
      }
    };

    const checkNotificationStatus = async (groupId: string): Promise<boolean> => {
      try {
        if (!userId) return false;

        const snapshot = await getDatabase()
            .ref(`/users/${userId}/notificationPreferences/${groupId}`)
            .once('value');

        return snapshot.val() ?? true; // Default to true for new groups
      } catch (error) {
        console.error('Error checking notification status:', error);
        return false;
      }
    };

    // Handle FCM setup and token refresh
    useEffect(() => {
      const setupNotifications = async () => {
        try {
          // Check if we already have permission
          const hasPermission = await checkNotificationPermission();
          
          // If we don't have permission, request it
          if (!hasPermission) {
            const permissionGranted = await requestNotificationPermission();
            if (!permissionGranted) {
              console.log('Notification permission denied');
              setNotificationsEnabled(false);
              return;
            }
          }

          setNotificationsEnabled(true);

          if (userId) {
            // Get the token and update it in the database
            const fcmToken = await getMessaging().getToken();
            await getDatabase()
                .ref(`/users/${userId}`)
                .update({ fcmToken });

            // Set up token refresh listener
            return getMessaging().onTokenRefresh(async (newToken) => {
              if (userId) {
                await getDatabase()
                    .ref(`/users/${userId}`)
                    .update({ fcmToken: newToken });
              }
            });
          }
        } catch (error) {
          console.error('Error setting up notifications:', error);
          setNotificationsEnabled(false);
        }
      };

      let setupPromise: Promise<(() => void) | undefined> | undefined;
      
      if (userId) {
        setupPromise = setupNotifications();
      }

      return () => {
        // When unmounting, wait for setup to complete then cleanup
        setupPromise?.then(unsubscribe => unsubscribe?.());
      };
    }, [userId]);

    useEffect(() => {
      const unsubscribe = getAuth().onAuthStateChanged((user) => {
        setUserId(user?.uid ?? '')
        setIsLoading(false)
        if (user) {
          router.push('/')
        }
      })
      return unsubscribe
    }, [])
  
    return (
      <AuthContext.Provider
        value={{
          signIn,
          signOut,
          userId,
          isLoading,
          notificationsEnabled,
          toggleNotifications,
          checkNotificationStatus,
        }}>
        {children}
      </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext)