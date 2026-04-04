import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';

/**
 * Handles the bare /app path (https://chillhangouts.ca/app).
 * The custom deep link handler in _layout.tsx takes over navigation.
 * This screen just shows a spinner so Expo Router doesn't flash +not-found.
 */
export default function AppRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#5c8ed6" />
      </View>
    </>
  );
}
