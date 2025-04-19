import React from 'react';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View, StyleSheet, Pressable, Alert, Share, ScrollView, TextInput, Image } from 'react-native';
import { Hangout, Group, User } from '../../../../types';
import { getDatabase } from '@react-native-firebase/database';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../../ctx';
import Linkify from 'react-native-linkify';

export default function HangoutPage() {
    const navigation = useNavigation();
    const router = useRouter();
    const local = useLocalSearchParams();
    const { id, name } = local;
    const { userId } = useAuth();

    const [loadComplete, setLoadComplete] = useState(false);
    const [hangout, setHangout] = useState<Hangout | null>(null);
    const [group, setGroup] = useState<Group | null>(null);
    const [attendees, setAttendees] = useState<{ [key: string]: User }>({});
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [tentativeInfo, setTentativeInfo] = useState('');

    const handleDecline = async () => {
        if (!hangout) return;
        
        Alert.alert(
            "Decline Event",
            "Are you sure you don't want to attend this event?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Decline",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Update local state immediately
                            const newAttendees = { ...attendees };
                            delete newAttendees[userId];
                            setAttendees(newAttendees);
                            
                            // Update Firebase
                            await getDatabase().ref(`/hangouts/${id}/attendees/${userId}`).set(null);
                        } catch (error) {
                            Alert.alert("Error", "Failed to decline the event. Please try again.");
                        }
                    }
                }
            ]
        );
    };

    const handleRSVP = async () => {
        if (!hangout) return;
        
        try {
            await getDatabase().ref(`/hangouts/${id}/attendees/${userId}`).set(true);
        } catch (error) {
            Alert.alert("Error", "Failed to join the event. Please try again.");
        }
    };

    const handleDelete = async () => {
        if (!hangout) return;
        
        Alert.alert(
            "Delete Hangout",
            "Are you sure you want to delete this hangout?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Remove from group's hangouts list first
                            if (hangout.group) {
                                await getDatabase().ref(`/groups/${hangout.group}/hangouts/${id}`).remove();
                            }
                            // Then remove the hangout itself
                            await getDatabase().ref(`/hangouts/${id}`).remove();
                            router.back();
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete the hangout. Please try again.");
                        }
                    }
                }
            ]
        );
    };

    const handleShare = async () => {
        try {
            const appLink = `chill://hangout/${id}`;
            const message = `Join our hangout "${hangout?.name}" on Chill!\n\n` +
                `Open in the Chill app: chill://hangout/${id}`;
            
            await Share.share({
                message,
                url: appLink,
                title: `Join ${hangout?.name} on Chill`
            });
        } catch (error) {
            console.error('Error sharing:', error);
            Alert.alert('Error', 'Could not share the invitation');
        }
    };

    const handleUpdateInfo = async () => {
        if (!id) return;
        try {
            await getDatabase()
                .ref(`/hangouts/${id}/info`)
                .set(tentativeInfo);
            setHangout(prev => prev ? { ...prev, info: tentativeInfo } : null);
            setIsEditingInfo(false);
        } catch (error) {
            console.error('Error updating info:', error);
            Alert.alert('Error', 'Failed to update info. Please try again.');
        }
    };

    useEffect(() => {
        setLoadComplete(false);
        navigation.setOptions({
            title: `Hangout: ${name}`,
            headerBackTitle: "Back to Group"
        });

        const hangoutRef = getDatabase().ref(`/hangouts/${id}`);
        
        const onHangoutUpdate = async (snapshot: any) => {
            try {
                const hangoutData = snapshot.val();
                if (!hangoutData) {
                    // Hangout doesn't exist or we don't have permission to read it
                    router.replace('/(tabs)/(groups)');
                    return;
                }

                const hangout = { id, ...hangoutData } as Hangout;
                setHangout(hangout);

                // Get group data
                const groupSnapshot = await getDatabase()
                    .ref(`/groups/${hangout.group}`)
                    .once('value');
                const groupData = groupSnapshot.val();
                if (!groupData) {
                    // Group doesn't exist or we don't have permission to read it
                    router.replace('/(tabs)/(groups)');
                    return;
                }
                setGroup({ id: hangout.group, ...groupData });

                // Get attendees data
                if (hangout.attendees) {
                    const attendeeIds = Object.keys(hangout.attendees);
                    const attendeePromises = attendeeIds.map(async uid => {
                        try {
                            const nameSnapshot = await getDatabase()
                                .ref(`/users/${uid}/name`)
                                .once('value');
                            return {
                                id: uid,
                                name: nameSnapshot.val() || 'Unknown User'
                            };
                        } catch (error) {
                            console.error(`Error fetching name for attendee ${uid}:`, error);
                            return {
                                id: uid,
                                name: 'Unknown User'
                            };
                        }
                    });
                    const attendeeData = Object.fromEntries(
                        (await Promise.all(attendeePromises)).map(user => [user.id, user])
                    );
                    setAttendees(attendeeData);
                }

                setLoadComplete(true);
            } catch (error: any) {
                if (error.code === 'PERMISSION_DENIED') {
                    // Redirect to groups page for permission errors
                    router.replace('/(tabs)/(groups)');
                } else {
                    // For other errors, show error state
                    setLoadComplete(true);
                }
            }
        };

        hangoutRef.on('value', onHangoutUpdate);

        return () => {
            hangoutRef.off('value', onHangoutUpdate);
        };
    }, [id, name]);

    if (!loadComplete) return null;

    const date = new Date(hangout?.time || 0);
    const isPast = date < new Date();

    // Info section rendering
    const renderInfoSection = () => {
        if (isEditingInfo) {
            return (
                <View style={styles.infoSection}>
                    <TextInput
                        style={styles.infoInput}
                        value={tentativeInfo}
                        onChangeText={setTentativeInfo}
                        multiline
                        placeholder="Add details, links, or notes about this hangout..."
                    />
                    <View style={styles.infoEditButtons}>
                        <Pressable
                            style={[styles.infoButton, styles.cancelButton]}
                            onPress={() => {
                                setIsEditingInfo(false);
                                setTentativeInfo(hangout?.info || '');
                            }}
                        >
                            <Text style={styles.buttonText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.infoButton, styles.saveButton]}
                            onPress={handleUpdateInfo}
                        >
                            <Text style={styles.buttonText}>Save</Text>
                        </Pressable>
                    </View>
                </View>
            );
        }

        const info = hangout?.info;
        if (!info) {
            if (group?.members?.[userId]) {
                return (
                    <Pressable
                        style={styles.addInfoButton}
                        onPress={() => {
                            setTentativeInfo('');
                            setIsEditingInfo(true);
                        }}
                    >
                        <Text style={styles.addInfoText}>Add Info</Text>
                    </Pressable>
                );
            }
            return null;
        }

        return (
            <View style={styles.infoSection}>
                <View style={styles.infoContent}>
                    <Linkify 
                        linkStyle={styles.link}
                        linkDefault={true}
                    >
                        <Text style={styles.infoText}>
                            {info}
                        </Text>
                    </Linkify>
                </View>
                {group?.members?.[userId] && (
                    <Pressable
                        style={styles.editButton}
                        onPress={() => {
                            setTentativeInfo(info);
                            setIsEditingInfo(true);
                        }}
                    >
                        <MaterialIcons name="edit" size={20} color="#666" />
                    </Pressable>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
            >
                <View style={styles.content}>
                    <View style={styles.header}>
                        <MaterialIcons 
                            name="event" 
                            size={40} 
                            color="#2c3e50" 
                        />
                        <Text style={styles.title}>{hangout?.name}</Text>
                        {/*TODO: Hide the createdBy field and add another mechanism to see if the user can delete the hangout*/}
                        {hangout?.createdBy === userId && 
                         (Object.keys(attendees).length === 0 || 
                         (Object.keys(attendees).length === 1 && attendees[userId])) && (
                            <Pressable 
                                style={styles.deleteButton}
                                onPress={handleDelete}
                            >
                                <MaterialIcons name="delete" size={24} color="#e74c3c" />
                            </Pressable>
                        )}
                    </View>

                    <View style={styles.infoSection}>
                        <View style={styles.infoRow}>
                            <MaterialIcons name="schedule" size={24} color="#666" />
                            <Text style={styles.infoText}>
                                {date.toLocaleString()}
                            </Text>
                        </View>

                        <View style={styles.infoRow}>
                            {group?.icon?.type === 'material' ? (
                                <MaterialIcons 
                                    name={group.icon.value as any} 
                                    size={24} 
                                    color="#666" 
                                />
                            ) : group?.icon?.type === 'image' ? (
                                <Image 
                                    source={{ uri: group.icon.value }}
                                    style={styles.groupIconImage}
                                />
                            ) : (
                                <MaterialIcons name="group" size={24} color="#666" />
                            )}
                            <Text style={styles.infoText}>
                                {group?.name || 'Loading...'}
                            </Text>
                        </View>

                        <View style={styles.infoRow}>
                            <MaterialIcons name="people" size={24} color="#666" />
                            <Text style={styles.infoText}>
                                {Object.keys(attendees).length} / {hangout?.minAttendees || 2} - {hangout?.maxAttendees || 8} attendees
                            </Text>
                        </View>

                        {hangout?.location && (
                            <View style={styles.infoRow}>
                                <MaterialIcons name="location-on" size={24} color="#666" />
                                <Text style={styles.infoText}>
                                    {hangout.location}
                                </Text>
                            </View>
                        )}
                    </View>

                    {renderInfoSection()}

                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>{isPast ? 'Who Went?' : 'Who\'s Going?'}</Text>
                            {!isPast && (
                                <Pressable 
                                    style={styles.addButton}
                                    onPress={handleShare}
                                >
                                    <MaterialIcons name="person-add" size={20} color="#5c8ed6" />
                                    <Text style={styles.addButtonText}>Invite</Text>
                                </Pressable>
                            )}
                        </View>
                        <View style={styles.attendeeList}>
                            {hangout?.createdAnonymously && Object.keys(attendees).length < (hangout.minAttendees || 2) ? (
                                <>
                                    {attendees[userId] && (
                                        <View style={styles.attendeeItem}>
                                            <MaterialIcons name="person" size={20} color="#666" style={styles.attendeeIcon} />
                                            <Text style={styles.attendeeName}>You</Text>
                                            {!isPast && (
                                                <Pressable 
                                                    style={styles.declineButton}
                                                    onPress={handleDecline}
                                                >
                                                    <MaterialIcons name="close" size={20} color="#e74c3c" />
                                                </Pressable>
                                            )}
                                        </View>
                                    )}
                                    <View style={styles.anonymousMessage}>
                                        <MaterialIcons name="visibility-off" size={20} color="#666" />
                                        <Text style={styles.emptyText}>
                                            Visible once {(hangout.minAttendees || 2) - Object.keys(attendees).length === 1 ? '1 more person joins' : `${(hangout.minAttendees || 2) - Object.keys(attendees).length} more people join`}
                                        </Text>
                                    </View>
                                </>
                            ) : (
                                <>
                                    {Object.values(attendees).map(user => (
                                        <View key={user.id} style={styles.attendeeItem}>
                                            <MaterialIcons name="person" size={20} color="#666" style={styles.attendeeIcon} />
                                            <Text style={styles.attendeeName}>{user.id === userId ? 'You' : user.name}</Text>
                                            {user.id === userId && !isPast && (
                                                <Pressable 
                                                    style={styles.declineButton}
                                                    onPress={handleDecline}
                                                >
                                                    <MaterialIcons name="close" size={20} color="#e74c3c" />
                                                </Pressable>
                                            )}
                                        </View>
                                    ))}
                                    {Object.keys(attendees).length === 0 && (
                                        <Text style={styles.emptyText}>No attendees yet</Text>
                                    )}
                                </>
                            )}
                        </View>
                    </View>
                </View>
            </ScrollView>
            {!isPast && !attendees[userId] && (
                <View style={styles.bottomContainer}>
                    <Pressable 
                        style={styles.rsvpButton}
                        onPress={handleRSVP}
                    >
                        <MaterialIcons name="check-circle" size={24} color="#fff" />
                        <Text style={styles.rsvpButtonText}>I'm in!</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        padding: 16,
        flexGrow: 1,
    },
    content: {
        flex: 1,
        padding: 16,
        paddingTop: 8,
    },
    bottomContainer: {
        padding: 16,
        paddingBottom: 32,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
        flex: 1,
    },
    infoSection: {
        backgroundColor: '#fff',
        padding: 15,
        marginVertical: 10,
        borderRadius: 8,
        position: 'relative',
        minHeight: 50,
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
        flex: 1,
    },
    emptyText: {
        color: '#666',
        textAlign: 'center',
        padding: 16,
    },
    anonymousMessage: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 16,
    },
    declineButton: {
        padding: 4,
        marginLeft: 8,
    },
    rsvpButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        paddingHorizontal: 24,
        backgroundColor: '#5c8ed6',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    rsvpButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    deleteButton: {
        padding: 8,
    },
    infoContent: {
        paddingRight: 40,
    },
    infoInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 4,
        padding: 10,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    infoEditButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
        gap: 10,
    },
    infoButton: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 4,
    },
    cancelButton: {
        backgroundColor: '#ddd',
    },
    saveButton: {
        backgroundColor: '#4CAF50',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '500',
    },
    editButton: {
        position: 'absolute',
        top: 0,
        right: 15,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addInfoButton: {
        backgroundColor: '#f5f5f5',
        padding: 15,
        marginVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    addInfoText: {
        color: '#666',
        fontWeight: '500',
    },
    link: {
        color: '#2196F3',
        textDecorationLine: 'underline',
    },
    groupIconImage: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
}); 