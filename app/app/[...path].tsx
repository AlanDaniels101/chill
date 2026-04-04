import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';

/**
 * Catch-all for /app/* paths (e.g. /app/join-group/:id, /app/hangout/:id).
 * The actual navigation is handled by the custom deep link handler in _layout.tsx.
 * This screen just shows a spinner so Expo Router doesn't flash +not-found.
 */
export default function AppDeepLinkCatchAll() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#5c8ed6" />
      </View>
    </>
  );
}
