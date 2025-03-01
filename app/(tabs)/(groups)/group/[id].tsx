import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Text, View, StyleSheet, Pressable, Image, Modal, TextInput, Alert } from 'react-native'
import { Group, Hangout, GroupIcon, User } from '../../../../types'
import { useAuth } from '../../../../ctx'

import { getDatabase } from '@react-native-firebase/database';
import React from 'react';
import HangoutCard from '../../../components/hangoutCard';
import IconSelector from '../../../components/IconSelector';
import { MaterialIcons } from '@expo/vector-icons';
import AddMemberModal from '../../../components/AddMemberModal';
import CreateHangoutModal from '../../../components/CreateHangoutModal';

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
    
    useEffect(() => {
        setLoadComplete(false)
        navigation.setOptions({ title: `Group ${name}` })

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
        };

        // Subscribe to changes
        groupRef.on('value', onGroupUpdate);

        // Cleanup listener when component unmounts
        return () => {
            groupRef.off('value', onGroupUpdate);
        };
    }, [navigation, id, name]);

    const handleDeleteGroup = async () => {
        if (!group || !userId) return;
        
        try {
            await getDatabase().ref(`/groups/${id}`).remove();
            router.replace('/');
        } catch (error) {
            console.error('Error deleting group:', error);
        }
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

    if (!loadComplete) return null

    const isAdmin = userId && group?.admins?.[userId];
    
    return (
        <View style={styles.container}>
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
                <Text style={styles.title}>Group {name}</Text>
                {isAdmin && !isEditingIcon && (
                    <Pressable 
                        style={styles.editButton}
                        onPress={() => setIsEditingIcon(true)}
                    >
                        <Text style={styles.editButtonText}>Change Icon</Text>
                    </Pressable>
                )}
            </View>

            {isAdmin && isEditingIcon && (
                <View style={styles.iconSelector}>
                    <IconSelector
                        selectedIcon={group?.icon || { type: 'material', value: 'groups' }}
                        onSelect={handleUpdateIcon}
                    />
                    <Pressable 
                        style={styles.cancelButton}
                        onPress={() => setIsEditingIcon(false)}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </Pressable>
                </View>
            )}

            <Pressable 
                style={styles.createEventButton}
                onPress={() => setIsCreatingHangout(true)}
            >
                <MaterialIcons name="add-circle" size={24} color="#fff" />
                <Text style={styles.createEventText}>New Hangout!</Text>
            </Pressable>

            <Text style={styles.sectionTitle}>Hangouts</Text>
            <View style={styles.hangoutList}>
                {hangouts?.map((hangout: Hangout) => (
                    <HangoutCard key={hangout.id} hangout={hangout} />
                ))}
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
                    </View>

                    <View style={styles.userSection}>
                        <Text style={styles.userSectionTitle}>Members</Text>
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
                    </View>
                </View>
            </View>
            
            {isAdmin && (
                <Pressable 
                    style={styles.deleteButton}
                    onPress={handleDeleteGroup}
                >
                    <Text style={styles.deleteButtonText}>Delete Group</Text>
                </Pressable>
            )}

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
    hangoutList: {
        marginTop: 8,
        marginBottom: 16,
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
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
    },
    headerIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    editButton: {
        backgroundColor: '#5c8ed6',
        padding: 8,
        borderRadius: 6,
    },
    editButtonText: {
        color: 'white',
        fontSize: 14,
    },
    iconSelector: {
        marginBottom: 20,
        padding: 16,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
    },
    cancelButton: {
        alignSelf: 'flex-end',
        marginTop: 8,
    },
    cancelButtonText: {
        color: '#666',
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
        marginBottom: 24,
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
});