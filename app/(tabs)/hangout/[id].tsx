import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View, StyleSheet, Pressable } from 'react-native';
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

            // Get attendees data
            if (hangout.attendees) {
                const attendeeIds = Object.keys(hangout.attendees);
                const attendeePromises = attendeeIds.map(uid => 
                    getDatabase().ref(`/users/${uid}`).once('value')
                );
                const attendeeSnapshots = await Promise.all(attendeePromises);
                const attendeeData = Object.fromEntries(
                    attendeeSnapshots.map(snap => [snap.key, { id: snap.key, ...snap.val() }])
                );
                setAttendees(attendeeData);
            }

            setLoadComplete(true);
        };

        hangoutRef.on('value', onHangoutUpdate);

        return () => {
            hangoutRef.off('value', onHangoutUpdate);
        };
    }, [navigation, id, name]);

    if (!loadComplete) return null;

    const date = new Date(hangout?.time || 0);
    const isPast = date < new Date();

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

            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Attendees</Text>
                    {!isPast && (
                        <Pressable 
                            style={styles.addButton}
                            onPress={() => {/* Add invite functionality */}}
                        >
                            <MaterialIcons name="person-add" size={20} color="#5c8ed6" />
                            <Text style={styles.addButtonText}>Invite</Text>
                        </Pressable>
                    )}
                </View>
                <View style={styles.attendeeList}>
                    {Object.values(attendees).map(user => (
                        <View key={user.id} style={styles.attendeeItem}>
                            <MaterialIcons name="person" size={20} color="#666" style={styles.attendeeIcon} />
                            <Text style={styles.attendeeName}>{user.name}</Text>
                        </View>
                    ))}
                    {Object.keys(attendees).length === 0 && (
                        <Text style={styles.emptyText}>No attendees yet</Text>
                    )}
                </View>
            </View>

            {/* We can add more features here like:
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
    section: {
        marginTop: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
    },
    addButtonText: {
        color: '#5c8ed6',
        fontSize: 14,
        fontWeight: '500',
    },
    attendeeList: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
    },
    attendeeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 8,
    },
    attendeeIcon: {
        marginRight: 12,
    },
    attendeeName: {
        fontSize: 16,
        color: '#2c3e50',
    },
    emptyText: {
        color: '#666',
        textAlign: 'center',
        padding: 16,
    },
});