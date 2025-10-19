import { router } from 'expo-router';
import { useContext, createContext, type PropsWithChildren, useEffect, useState } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { MaterialIcons } from '@expo/vector-icons';

import { getAuth } from '@react-native-firebase/auth'
import { getDatabase } from '@react-native-firebase/database';
import { getMessaging, AuthorizationStatus } from '@react-native-firebase/messaging';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

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

export const generateRandomDefaultName = (userId: string) => {
  const funNames = [
    'Mysterious Person', 'Secret Friend', 'Cool Cat', 'Mystery Guest',
    'Anonymous Buddy', 'The Enigma', 'Ghost User', 'Incognito Friend',
    'Mystery Member', 'Secret Agent', 'Anonymous Andy', 'Cool Stranger',
    'Hidden Hero', 'Silent Ninja', 'Stealth Buddy'
  ];
  
  // Use user ID to consistently pick the same name and numbers
  const hash = userId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const nameIndex = Math.abs(hash) % funNames.length;
  const selectedName = funNames[nameIndex];
  
  // Generate consistent 4-digit number
  const numberHash = Math.abs(hash * 7) % 10000;
  const fourDigitNumber = numberHash.toString().padStart(4, '0');
  
  return `${selectedName} (${fourDigitNumber})`;
};

const AuthContext = createContext(
  {
    verifyPhoneNumber: async (phoneNumber: string) => Promise.resolve<FirebaseAuthTypes.ConfirmationResult | null>(null),
    confirmVerificationCode: async (confirmationResult: any, code: string) => {},
    signOut: async () => {},
    deleteAccount: async () => {},
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

    const verifyPhoneNumber = async (phoneNumber: string) => {
      try {
        setIsLoading(true)
        const result = await getAuth().signInWithPhoneNumber(phoneNumber, true)
        return result
      } catch (e) {
        console.log(e)
        return null
      } finally {
        setIsLoading(false)
      }
    }

    const confirmVerificationCode = async (confirmationResult: any, code: string) => {
      try {
        setIsLoading(true)
        await confirmationResult.confirm(code)
        const user = getAuth().currentUser
        if (user) {
          const db = getDatabase();
          const userRef = db.ref('users').child(user.uid);
          
          // Check if user already exists
          const snapshot = await userRef.once('value');
          if (!snapshot.exists()) {
            // Generate random name for new users
            const randomName = generateRandomDefaultName(user.uid);
            
            // Only create new profile if user doesn't exist
            await userRef.set({
              phoneNumber: user.phoneNumber,
              name: randomName,  // Store the random name
              createdAt: new Date().toISOString(),
              lastActive: new Date().toISOString(),
            });
            // Redirect new users to profile page
            router.replace('/(tabs)/profile');
          } else {
            // Check if existing user needs a random name (migration)
            const userData = snapshot.val();
            if (!userData.name) {
              const randomName = generateRandomDefaultName(user.uid);
              await userRef.update({
                name: randomName,
                lastActive: new Date().toISOString()
              });
            } else {
              // Update lastActive for existing user
              await userRef.update({
                lastActive: new Date().toISOString()
              });
            }
          }
        }
      } catch (e) {
        console.log(e)
      } finally {
        setIsLoading(false)
      }
    }

    const signOut = async () => {
      try {
        await getAuth().signOut()
      } catch (e) {
        console.log(e)
      }
    }

    const deleteAccount = async () => {
      try {
        const user = getAuth().currentUser;
        if (!user) return;

        await getDatabase().ref(`/users/${user.uid}`).remove();
        await user.delete();
      } catch (e) {
        console.error('Error deleting account:', e);
        throw e;
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

      // Set up foreground notification handler
      const unsubscribeMessage = getMessaging().onMessage(async (remoteMessage) => {
        console.log('Foreground FCM message received:', remoteMessage);
              
        // Handle the notification based on its type
        if (remoteMessage.data?.type === 'new_hangout') {
          const { groupId, hangoutId } = remoteMessage.data;
          const { title, body } = remoteMessage.notification || {};

          if (!groupId || !hangoutId || !title || !body) {
            console.error('Missing required notification data:', { groupId, hangoutId, title, body });
            return;
          }
          
          showMessage({
            message: title,
            description: body + '\n\nTap to view',
            type: 'default',
            backgroundColor: '#2c3e50',
            color: '#ffffff',
            duration: 4000,
            icon: 'none',
            style: {
              borderRadius: 12,
              marginTop: 8,
              marginHorizontal: 8,
              borderLeftColor: '#7dacf9',
              borderLeftWidth: 4,
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: 2,
              },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            },
            titleStyle: {
              fontSize: 16,
              fontWeight: '600',
            },
            textStyle: {
              fontSize: 14,
            },
            renderCustomContent: () => (
              <MaterialIcons 
                name="chevron-right" 
                size={24} 
                color="#ffffff" 
                style={{ position: 'absolute', right: 12, top: '50%', transform: [{ translateY: -12 }] }}
              />
            ),
            onPress: () => {
              router.push(`/(tabs)/(groups)/hangout/${hangoutId}`);
            },
          });
        }
      });

      let setupPromise: Promise<(() => void) | undefined> | undefined;
      
      if (userId) {
        setupPromise = setupNotifications();
      }

      return () => {
        // When unmounting, wait for setup to complete then cleanup
        setupPromise?.then(unsubscribe => unsubscribe?.());
        unsubscribeMessage(); // Clean up the message listener
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
          verifyPhoneNumber,
          confirmVerificationCode,
          signOut,
          deleteAccount,
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