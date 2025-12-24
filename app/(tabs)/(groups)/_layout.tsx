import { Stack } from 'expo-router';

export default function GroupsLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#7dacf9',
                },
                headerTintColor: '#fff',
                headerShadowVisible: false,
            }}
        >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen 
                name="group/[id]" 
                options={{ 
                    headerShown: true,
                    headerBackTitle: "Groups",
                }} 
            />
            <Stack.Screen 
                name="hangout/[id]" 
                options={{ 
                    headerShown: true,
                    headerBackTitle: "Back",
                }} 
            />
        </Stack>
    );
}