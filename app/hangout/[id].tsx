import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { getDatabase } from '@react-native-firebase/database';
import { useAuth } from '../../ctx';

export default function HangoutHandler() {
    const { id } = useLocalSearchParams();
    const { userId } = useAuth();
    const router = useRouter();

    useEffect(() => {
        async function joinHangout() {
            try {
                // Check if hangout exists
                const hangoutSnapshot = await getDatabase()
                    .ref(`/hangouts/${id}`)
                    .once('value');

                if (!hangoutSnapshot.exists()) {
                    // Hangout doesn't exist, redirect to groups list
                    router.replace('/(tabs)/(groups)');
                    return;
                }

                const hangoutData = hangoutSnapshot.val();

                // Check if user is member of the group
                const groupMemberSnapshot = await getDatabase()
                    .ref(`/groups/${hangoutData.group}/members/${userId}`)
                    .once('value');

                if (!groupMemberSnapshot.exists()) {
                    // User is not a member of the group, join the group first
                    await getDatabase()
                        .ref(`/groups/${hangoutData.group}/members/${userId}`)
                        .set(true);
                }

                // Navigate to the hangout
                router.replace(`/(tabs)/(groups)/hangout/${id}`);
            } catch (error) {
                console.error('Error joining hangout:', error);
                // On error, redirect to groups list
                router.replace('/(tabs)/(groups)');
            }
        }

        if (id && userId) {
            joinHangout();
        }
    }, [id, userId]);

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