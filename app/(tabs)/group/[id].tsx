import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { Group, Hangout } from '../../../types'

import { getDatabase } from '@react-native-firebase/database';
import React from 'react';
import HangoutCard from '../../components/handoutCard';

export default function GroupPage() {
    const navigation = useNavigation()
    const local = useLocalSearchParams()
    const { id, name } = local

    const [loadComplete, setLoadComplete] = useState(false)
    const [group, setGroup] = useState<Group>()
    const [hangouts, setHangouts] = useState<Hangout[]>()
    
    useEffect(() => {
        setLoadComplete(false)
        navigation.setOptions({ title: `Group ${name}` })

        const getGroup = async () => {
            const val = (await getDatabase().ref(`/groups/${id}`).once('value')).val()
            const group = { id, ...val } as Group
            const hangoutIds = Object.keys(group.hangouts)
            const promises = hangoutIds.map(id => getDatabase().ref(`/hangouts/${id}`).once('value'))
            const hangoutSnapshots = await Promise.all(promises)
            const hangouts = hangoutSnapshots.map(snap => ({id: snap.key, ...snap.val() } as Hangout))
            
            setGroup(group)
            setHangouts(hangouts)
            setLoadComplete(true)
        }

        getGroup()
    }, [navigation, id, name])

    if (!loadComplete) return null

    return (
        <View>
            <Text>Group {name}</Text>
            <Text>{group?.id}</Text>
            <Text>Hangouts:</Text>
            <View>
                {hangouts?.map((hangout: Hangout, index) => (
                    <HangoutCard key={index} hangout={hangout} />
                ))}
            </View>
        </View>
    )
}