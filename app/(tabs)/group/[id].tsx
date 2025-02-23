import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Text, View, StyleSheet, Pressable, Image } from 'react-native'
import { Group, Hangout, GroupIcon } from '../../../types'
import { useAuth } from '../../../ctx'

import { getDatabase } from '@react-native-firebase/database';
import React from 'react';
import HangoutCard from '../../components/handoutCard';
import IconSelector from '../../components/IconSelector';
import { MaterialIcons } from '@expo/vector-icons';

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
    
    useEffect(() => {
        setLoadComplete(false)
        navigation.setOptions({ title: `Group ${name}` })

        const groupRef = getDatabase().ref(`/groups/${id}`);

        // Set up realtime listener for group data
        const onGroupUpdate = async (snapshot: any) => {
            const val = snapshot.val();
            const group = { id, ...val } as Group;
            
            // Get hangouts
            const hangoutIds = Object.keys(group.hangouts || {});
            const promises = hangoutIds.map(id => getDatabase().ref(`/hangouts/${id}`).once('value'));
            const hangoutSnapshots = await Promise.all(promises);
            const hangouts = hangoutSnapshots.map(snap => ({id: snap.key, ...snap.val() } as Hangout));
            
            setGroup(group);
            setHangouts(hangouts);
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

            <Text style={styles.subtitle}>Hangouts:</Text>
            <View style={styles.hangoutList}>
                {hangouts?.map((hangout: Hangout, index) => (
                    <HangoutCard key={index} hangout={hangout} />
                ))}
            </View>
            
            {isAdmin && (
                <Pressable 
                    style={styles.deleteButton}
                    onPress={handleDeleteGroup}
                >
                    <Text style={styles.deleteButtonText}>Delete Group</Text>
                </Pressable>
            )}
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
});