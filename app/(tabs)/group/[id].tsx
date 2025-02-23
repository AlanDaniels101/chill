import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Text, View, StyleSheet, Pressable } from 'react-native'
import { Group, Hangout } from '../../../types'
import { useAuth } from '../../../ctx'

import { getDatabase } from '@react-native-firebase/database';
import React from 'react';
import HangoutCard from '../../components/handoutCard';

export default function GroupPage() {
    const navigation = useNavigation()
    const router = useRouter()
    const local = useLocalSearchParams()
    const { id, name } = local
    const { userId } = useAuth()

    const [loadComplete, setLoadComplete] = useState(false)
    const [group, setGroup] = useState<Group>()
    const [hangouts, setHangouts] = useState<Hangout[]>()
    
    useEffect(() => {
        setLoadComplete(false)
        navigation.setOptions({ title: `Group ${name}` })

        const getGroup = async () => {
            const val = (await getDatabase().ref(`/groups/${id}`).once('value')).val()
            const group = { id, ...val } as Group
            const hangoutIds = Object.keys(group.hangouts || {})
            const promises = hangoutIds.map(id => getDatabase().ref(`/hangouts/${id}`).once('value'))
            const hangoutSnapshots = await Promise.all(promises)
            const hangouts = hangoutSnapshots.map(snap => ({id: snap.key, ...snap.val() } as Hangout))
            
            setGroup(group)
            setHangouts(hangouts)
            setLoadComplete(true)
        }

        getGroup()
    }, [navigation, id, name])

    const handleDeleteGroup = async () => {
        if (!group || !userId) return;
        
        try {
            await getDatabase().ref(`/groups/${id}`).remove();
            router.replace('/');
        } catch (error) {
            console.error('Error deleting group:', error);
        }
    };

    if (!loadComplete) return null

    const isAdmin = userId && group?.admins?.[userId];
    
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Group {name}</Text>
            <Text style={styles.subtitle}>{group?.id}</Text>
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
});