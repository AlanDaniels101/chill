import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { getDatabase } from '@react-native-firebase/database';
import { useAuth } from '../../ctx';

export default function JoinGroupHandler() {
    const { groupId } = useLocalSearchParams();
    const { userId } = useAuth();
    const router = useRouter();

    useEffect(() => {
        async function joinGroup() {
            try {
                // Check if group exists
                const groupSnapshot = await getDatabase()
                    .ref(`/groups/${groupId}`)
                    .once('value');

                if (!groupSnapshot.exists()) {
                    // Group doesn't exist, redirect to groups list
                    router.replace('/(tabs)/(groups)');
                    return;
                }

                // Add user to group members
                await getDatabase()
                    .ref(`/groups/${groupId}/members/${userId}`)
                    .set(true);

                // Navigate to the group
                router.replace(`/(tabs)/(groups)/group/${groupId}`);
            } catch (error) {
                console.error('Error joining group:', error);
                // On error, redirect to groups list
                router.replace('/(tabs)/(groups)');
            }
        }

        if (groupId && userId) {
            joinGroup();
        }
    }, [groupId, userId]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#5c8ed6" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
}); 