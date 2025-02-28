import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Hangout, Group, User } from '../../../types';
import { getDatabase } from '@react-native-firebase/database';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../ctx';

export default function HangoutPage() {
    const navigation = useNavigation();
    const local = useLocalSearchParams();
    const { id, name } = local;
    const { userId } = useAuth();

    const [loadComplete, setLoadComplete] = useState(false);
    const [hangout, setHangout] = useState<Hangout>();
    const [group, setGroup] = useState<Group>();
    const [attendees, setAttendees] = useState<{ [key: string]: User }>({});

    useEffect(() => {
        setLoadComplete(false);
        navigation.setOptions({ title: `Hangout: ${name}` });

        const hangoutRef = getDatabase().ref(`/hangouts/${id}`);
        
        const onHangoutUpdate = async (snapshot: any) => {
            const hangoutData = snapshot.val();
            if (!hangoutData) return;

            const hangout = { id, ...hangoutData } as Hangout;
            setHangout(hangout);

            // Get group data
            const groupSnapshot = await getDatabase()
                .ref(`/groups/${hangout.group}`)
                .once('value');
            const groupData = groupSnapshot.val();
            if (groupData) {
                setGroup({ id: hangout.group, ...groupData });
            }

            // Get attendees data (if we add this feature later)
            setLoadComplete(true);
        };

        hangoutRef.on('value', onHangoutUpdate);

        return () => {
            hangoutRef.off('value', onHangoutUpdate);
        };
    }, [navigation, id, name]);

    if (!loadComplete) return null;

    const isAdmin = userId && group?.admins?.[userId];
    const date = new Date(hangout?.time || 0);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <MaterialIcons 
                    name="event" 
                    size={40} 
                    color="#2c3e50" 
                />
                <Text style={styles.title}>{hangout?.name}</Text>
            </View>

            <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                    <MaterialIcons name="schedule" size={24} color="#666" />
                    <Text style={styles.infoText}>
                        {date.toLocaleString()}
                    </Text>
                </View>

                <View style={styles.infoRow}>
                    <MaterialIcons name="group" size={24} color="#666" />
                    <Text style={styles.infoText}>
                        {group?.name || 'Loading...'}
                    </Text>
                </View>
            </View>

            {/* We can add more features here like:
                - Attendee list
                - RSVP functionality
                - Location details
                - Description/notes
                - Comments/chat
            */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        gap: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    infoSection: {
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        padding: 16,
        gap: 16,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoText: {
        fontSize: 16,
        color: '#2c3e50',
    },
});