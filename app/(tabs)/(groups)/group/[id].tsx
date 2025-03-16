import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useEffect, useState, useMemo } from 'react'
import { Text, View, StyleSheet, Pressable, Image, Alert, ScrollView, TextInput, Linking } from 'react-native'
import { Group, Hangout, GroupIcon, User } from '../../../../types'
import { useAuth } from '../../../../ctx'
import { getDatabase } from '@react-native-firebase/database';
import React from 'react';
import HangoutCard from '../../../components/hangoutCard';
import IconSelector from '../../../components/IconSelector';
import { MaterialIcons } from '@expo/vector-icons';
import AddMemberModal from '../../../components/AddMemberModal';
import CreateHangoutModal from '../../../components/CreateHangoutModal';
import NotificationToggle from '../../../components/NotificationToggle';

function sortHangouts(hangouts: Hangout[]) {
    const now = new Date().getTime();
    return [...hangouts].sort((a, b) => {
        const aTime = a.time;
        const bTime = b.time;
        const aIsFuture = aTime > now;
        const bIsFuture = bTime > now;

        // If both are future events or both are past events, sort by closest to now
        if (aIsFuture === bIsFuture) {
            return aIsFuture 
                ? aTime - bTime  // Future events: ascending order
                : bTime - aTime; // Past events: descending order
        }
        
        // If one is future and one is past, future comes first
        return aIsFuture ? -1 : 1;
    });
}

// URL regex pattern
const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

// Function to split text into parts with URLs
function parseTextWithUrls(text: string) {
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = URL_PATTERN.exec(text)) !== null) {
        // Add text before URL
        if (match.index > lastIndex) {
            parts.push({
                type: 'text',
                content: text.slice(lastIndex, match.index)
            });
        }
        // Add URL
        parts.push({
            type: 'url',
            content: match[0]
        });
        lastIndex = match.index + match[0].length;
    }
    // Add remaining text
    if (lastIndex < text.length) {
        parts.push({
            type: 'text',
            content: text.slice(lastIndex)
        });
    }
    return parts;
}

export default function GroupPage() {
    const navigation = useNavigation()
    const router = useRouter()
    const local = useLocalSearchParams()
    const { id, name } = local
    const { userId } = useAuth()

    const [loadComplete, setLoadComplete] = useState(false)
    const [group, setGroup] = useState<Group>()
    const [hangouts, setHangouts] = useState<Hangout[]>()
    const [isEditingIcon, setIsEditingIcon] = useState(false);
    const [users, setUsers] = useState<{ [key: string]: User }>({});
    const [isAddingMember, setIsAddingMember] = useState(false);
    const [newMemberUid, setNewMemberUid] = useState('');
    const [isCreatingHangout, setIsCreatingHangout] = useState(false);
    const [tentativeInfo, setTentativeInfo] = useState('');
    
    const sortedHangouts = useMemo(() => sortHangouts(hangouts || []), [hangouts]);
    const isAdmin = userId && group?.admins?.[userId];

    useEffect(() => {
        setLoadComplete(false)

        const groupRef = getDatabase().ref(`/groups/${id}`);
        const usersRef = getDatabase().ref('/users');

        // Set up realtime listener for group and user data
        const onGroupUpdate = async (snapshot: any) => {
            const val = snapshot.val();
            const group = { id, ...val } as Group;
            
            // Get hangouts
            const hangoutIds = Object.keys(group.hangouts || {});
            const promises = hangoutIds.map(id => getDatabase().ref(`/hangouts/${id}`).once('value'));
            const hangoutSnapshots = await Promise.all(promises);
            const hangouts = hangoutSnapshots.map(snap => ({id: snap.key, ...snap.val() } as Hangout));
            
            // Get all users who are members or admins
            const userIds = new Set([
                ...Object.keys(group.members || {}),
                ...Object.keys(group.admins || {})
            ]);
            
            const userPromises = Array.from(userIds).map(uid => 
                usersRef.child(uid).once('value')
            );
            const userSnapshots = await Promise.all(userPromises);
            const users = Object.fromEntries(
                userSnapshots.map(snap => [snap.key, { id: snap.key, ...snap.val() }])
            );

            setGroup(group);
            setHangouts(hangouts);
            setUsers(users);
            setLoadComplete(true);
            // Update navigation title with group name from database
            navigation.setOptions({ title: group.name });
        };

        // Subscribe to changes
        groupRef.on('value', onGroupUpdate);

        // Cleanup listener when component unmounts
        return () => {
            groupRef.off('value', onGroupUpdate);
        };
    }, [navigation, id]);

    const handleDeleteGroup = async () => {
        if (!group || !userId) return;
        
        Alert.alert(
            "Delete Group",
            "Are you sure you want to delete this group? This action cannot be undone.",
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
                            await getDatabase().ref(`/groups/${id}`).remove();
                            router.replace('/');
                        } catch (error) {
                            console.error('Error deleting group:', error);
                            Alert.alert('Error', 'Failed to delete the group');
                        }
                    }
                }
            ]
        );
    };

    const handleUpdateIcon = async (newIcon: GroupIcon) => {
        if (!group || !id) return;
        
        try {
            await getDatabase()
                .ref(`/groups/${id}`)
                .update({ icon: newIcon });
            setIsEditingIcon(false);
        } catch (error) {
            console.error('Error updating icon:', error);
        }
    };

    const toggleUserAdmin = async (userId: string, isCurrentlyAdmin: boolean) => {
        if (!group?.id) return;
        
        try {
            const updates: { [key: string]: any } = {};
            
            if (isCurrentlyAdmin) {
                // Remove from admins, ensure they're in members
                updates[`/groups/${group.id}/admins/${userId}`] = null;
                updates[`/groups/${group.id}/members/${userId}`] = true;
            } else {
                // Add to admins
                updates[`/groups/${group.id}/admins/${userId}`] = true;
            }
            
            await getDatabase().ref().update(updates);
        } catch (error) {
            console.error('Error toggling admin status:', error);
        }
    };

    const removeMember = async (userId: string) => {
        if (!group?.id) return;
        
        try {
            await getDatabase()
                .ref(`/groups/${group.id}/members/${userId}`)
                .remove();
        } catch (error) {
            console.error('Error removing member:', error);
        }
    };

    const addMember = async () => {
        if (!group?.id || !newMemberUid.trim()) return;
        
        try {
            // Check if user exists
            const userSnapshot = await getDatabase()
                .ref(`/users/${newMemberUid}`)
                .once('value');
            
            if (!userSnapshot.exists()) {
                Alert.alert('Error', 'User not found');
                return;
            }

            // Add user to members
            await getDatabase()
                .ref(`/groups/${group.id}/members/${newMemberUid}`)
                .set(true);
            
            setNewMemberUid('');
            setIsAddingMember(false);
        } catch (error) {
            console.error('Error adding member:', error);
            Alert.alert('Error', 'Failed to add member');
        }
    };

    const handleLeaveGroup = async () => {
        if (!group?.id || !userId) return;
        
        // Check if user is the last admin
        const isLastAdmin = isAdmin && 
            Object.keys(group.admins || {}).length === 1 && 
            group.admins[userId];

        if (isLastAdmin) {
            Alert.alert(
                "Cannot Leave Group",
                "You are the last admin. Please make another member an admin before leaving.",
                [{ text: "OK" }]
            );
            return;
        }
        
        Alert.alert(
            "Leave Group",
            "Are you sure you want to leave this group?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Leave",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Remove user from members and admins
                            const updates: { [key: string]: any } = {};
                            updates[`/groups/${group.id}/members/${userId}`] = null;
                            updates[`/groups/${group.id}/admins/${userId}`] = null;
                            
                            await getDatabase().ref().update(updates);
                            router.replace('/');
                        } catch (error) {
                            console.error('Error leaving group:', error);
                            Alert.alert('Error', 'Failed to leave the group');
                        }
                    }
                }
            ]
        );
    };

    if (!loadComplete) return null

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    {group?.icon?.type === 'material' ? (
                        <MaterialIcons 
                            name={group.icon.value as any} 
                            size={40} 
                            color="#2c3e50" 
                        />
                    ) : group?.icon?.type === 'image' ? (
                        <Image 
                            source={{ uri: group.icon.value }}
                            style={styles.headerIcon}
                        />
                    ) : (
                        <MaterialIcons 
                            name="groups" 
                            size={40} 
                            color="#2c3e50" 
                        />
                    )}
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.title}>{group?.name || name}</Text>
                    </View>
                    {isAdmin && !isEditingIcon && (
                        <Pressable 
                            style={styles.editButton}
                            onPress={() => setIsEditingIcon(true)}
                        >
                            <Text style={styles.editButtonText}>Edit</Text>
                        </Pressable>
                    )}
                </View>

                <Pressable 
                    style={styles.createEventButton}
                    onPress={() => setIsCreatingHangout(true)}
                >
                    <MaterialIcons name="add-circle" size={24} color="#fff" />
                    <Text style={styles.createEventText}>New Hangout!</Text>
                </Pressable>

                {isAdmin && isEditingIcon && (
                    <View style={styles.iconSelector}>
                        <Text style={styles.editLabel}>Group Name</Text>
                        <TextInput
                            style={styles.editInput}
                            value={group?.name || ''}
                            onChangeText={(text) => {
                                if (group) {
                                    setGroup({ ...group, name: text });
                                }
                            }}
                            placeholder="Enter group name"
                        />
                        <Text style={styles.editLabel}>Group Icon</Text>
                        <IconSelector
                            selectedIcon={group?.icon || { type: 'material', value: 'groups' }}
                            onSelect={handleUpdateIcon}
                        />
                        <Text style={styles.editLabel}>Group Info</Text>
                        <TextInput
                            style={[styles.editInput, styles.infoInput]}
                            value={tentativeInfo}
                            onChangeText={setTentativeInfo}
                            placeholder="Enter group description, links, or other information"
                            multiline
                            numberOfLines={4}
                        />
                        <View style={styles.editActions}>
                            <Pressable 
                                style={styles.cancelButton}
                                onPress={() => {
                                    setIsEditingIcon(false);
                                    // Reset group name and info if cancelled
                                    if (group) {
                                        setGroup({ ...group, name: name as string });
                                        setTentativeInfo(group.info || '');
                                    }
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </Pressable>
                            <Pressable 
                                style={styles.saveButton}
                                onPress={async () => {
                                    if (!group?.id) return;
                                    try {
                                        await getDatabase()
                                            .ref(`/groups/${group.id}`)
                                            .update({ 
                                                icon: group.icon,
                                                name: group.name,
                                                info: tentativeInfo
                                            });
                                        // Update the navigation title and group info
                                        navigation.setOptions({ title: group.name });
                                        setGroup({ ...group, info: tentativeInfo });
                                        setIsEditingIcon(false);
                                    } catch (error) {
                                        console.error('Error updating group:', error);
                                        Alert.alert('Error', 'Failed to update group');
                                    }
                                }}
                            >
                                <Text style={styles.saveButtonText}>Save</Text>
                            </Pressable>
                        </View>
                    </View>
                )}

                {group?.info && (
                    <View style={styles.infoSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Info</Text>
                            {isAdmin && (
                                <Pressable 
                                    style={styles.editButton}
                                    onPress={() => {
                                        setTentativeInfo(group.info || '');
                                        setIsEditingIcon(true);
                                    }}
                                >
                                    <Text style={styles.editButtonText}>Edit</Text>
                                </Pressable>
                            )}
                        </View>
                        <Text>
                            {parseTextWithUrls(group.info).map((part, index) => (
                                part.type === 'url' ? (
                                    <Text
                                        key={index}
                                        style={styles.linkText}
                                        onPress={() => Linking.openURL(part.content)}
                                    >
                                        {part.content}
                                    </Text>
                                ) : (
                                    <Text key={index} style={styles.infoText}>{part.content}</Text>
                                )
                            ))}
                        </Text>
                    </View>
                )}

                <Text style={styles.sectionTitle}>Hangouts</Text>
                <View style={styles.hangoutListContainer}>
                    <ScrollView style={styles.hangoutList} nestedScrollEnabled={true}>
                        {sortedHangouts.map((hangout: Hangout) => (
                            <HangoutCard key={hangout.id} hangout={hangout} />
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Members</Text>
                        {isAdmin && (
                            <Pressable 
                                style={styles.addButton}
                                onPress={() => setIsAddingMember(true)}
                            >
                                <MaterialIcons name="person-add" size={20} color="#5c8ed6" />
                                <Text style={styles.addButtonText}>Add Member</Text>
                            </Pressable>
                        )}
                    </View>
                    <View style={styles.userList}>
                        <View style={styles.userSection}>
                            <Text style={styles.userSectionTitle}>Admins</Text>
                            <ScrollView style={styles.memberList} nestedScrollEnabled={true}>
                                {group?.admins && Object.keys(group.admins).map(uid => (
                                    <View key={uid} style={styles.userItem}>
                                        <MaterialIcons 
                                            name="admin-panel-settings" 
                                            size={20} 
                                            color="#5c8ed6" 
                                            style={styles.adminIcon}
                                        />
                                        <Text style={styles.userName}>
                                            {users[uid]?.name || 'Loading...'}
                                        </Text>
                                        {isAdmin && uid !== userId && (
                                            <Pressable 
                                                style={styles.adminToggle}
                                                onPress={() => toggleUserAdmin(uid, true)}
                                            >
                                                <Text style={styles.adminToggleText}>Make Member</Text>
                                            </Pressable>
                                        )}
                                    </View>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={styles.userSection}>
                            <Text style={styles.userSectionTitle}>Members</Text>
                            <ScrollView style={styles.memberList} nestedScrollEnabled={true}>
                                {group?.members && Object.keys(group.members)
                                    .filter(uid => !group.admins?.[uid])
                                    .map(uid => (
                                        <View key={uid} style={styles.userItem}>
                                            <MaterialIcons 
                                                name="person" 
                                                size={20} 
                                                color="#666" 
                                                style={styles.memberIcon}
                                            />
                                            <Text style={styles.userName}>
                                                {users[uid]?.name || 'Loading...'}
                                            </Text>
                                            {isAdmin && (
                                                <View style={styles.actionButtons}>
                                                    <Pressable 
                                                        style={styles.adminToggle}
                                                        onPress={() => toggleUserAdmin(uid, false)}
                                                    >
                                                        <Text style={styles.adminToggleText}>Make Admin</Text>
                                                    </Pressable>
                                                    <Pressable 
                                                        style={styles.removeButton}
                                                        onPress={() => removeMember(uid)}
                                                    >
                                                        <MaterialIcons name="remove-circle-outline" size={20} color="#ff4444" />
                                                    </Pressable>
                                                </View>
                                            )}
                                        </View>
                                    ))
                                }
                            </ScrollView>
                        </View>
                    </View>
                </View>

                <NotificationToggle groupId={id as string} />
                
                {group?.members?.[userId] && (
                    <Pressable 
                        style={styles.leaveButton}
                        onPress={handleLeaveGroup}
                    >
                        <Text style={styles.leaveButtonText}>Leave Group</Text>
                    </Pressable>
                )}
                
                {isAdmin && (
                    <Pressable 
                        style={styles.deleteButton}
                        onPress={handleDeleteGroup}
                    >
                        <Text style={styles.deleteButtonText}>Delete Group</Text>
                    </Pressable>
                )}
            </ScrollView>

            <AddMemberModal 
                visible={isAddingMember}
                groupId={group?.id || ''}
                onClose={() => setIsAddingMember(false)}
            />

            <CreateHangoutModal
                visible={isCreatingHangout}
                onClose={() => setIsCreatingHangout(false)}
                groupId={id as string}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        marginBottom: 16,
    },
    hangoutListContainer: {
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        padding: 8,
        marginTop: 8,
        marginBottom: 16,
        height: 300, // Fixed height for the container
    },
    hangoutList: {
        flex: 1,
    },
    deleteButton: {
        backgroundColor: '#ff4444',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    deleteButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        minHeight: 60,
    },
    headerTextContainer: {
        flex: 1,
        marginLeft: 12,
    },
    headerIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    editButton: {
        position: 'absolute',
        right: 16,
        top: 52,
        paddingVertical: 4,
        paddingHorizontal: 12,
        backgroundColor: '#e8f0fe',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#5c8ed6',
    },
    editButtonText: {
        fontSize: 12,
        color: '#5c8ed6',
        fontWeight: '500',
    },
    iconSelector: {
        marginBottom: 20,
        padding: 16,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
    },
    editLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 8,
    },
    editInput: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
    },
    editActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 16,
    },
    cancelButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
    },
    saveButton: {
        backgroundColor: '#5c8ed6',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    section: {
        marginVertical: 24,
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
    userList: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
    },
    userSection: {
        marginBottom: 16,
    },
    userSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
        marginBottom: 4,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 8,
    },
    adminIcon: {
        marginRight: 8,
    },
    memberIcon: {
        marginRight: 8,
    },
    userName: {
        fontSize: 16,
        color: '#2c3e50',
        flex: 1,
        marginRight: 8,
    },
    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    adminToggle: {
        backgroundColor: '#f0f0f0',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        alignItems: 'center',
    },
    adminToggleText: {
        color: '#666',
        fontSize: 12,
    },
    removeButton: {
        padding: 4,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        width: '80%',
        gap: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        minWidth: 80,
        alignItems: 'center',
    },
    addMemberButton: {
        backgroundColor: '#5c8ed6',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
    createEventButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#5c8ed6',
        borderRadius: 12,
        margin: 16,
        padding: 16,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    createEventText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    memberList: {
        maxHeight: 200, // Fixed height for each member list
    },
    infoSection: {
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    infoText: {
        fontSize: 16,
        color: '#2c3e50',
        lineHeight: 24,
    },
    infoInput: {
        height: 100,
        textAlignVertical: 'top',
    },
    linkText: {
        color: '#5c8ed6',
        textDecorationLine: 'underline',
    },
    leaveButton: {
        backgroundColor: '#ff8888',
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 20,
    },
    leaveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});