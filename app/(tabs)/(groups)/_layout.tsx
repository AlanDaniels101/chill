import { Stack } from 'expo-router';

export default function GroupsLayout() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="group/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="hangout/[id]" options={{ headerShown: false }} />
        </Stack>
    );
}