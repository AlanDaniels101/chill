import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import Group from '../../../types'

import db from '@react-native-firebase/database';

export default function GroupPage() {
    const navigation = useNavigation()
    const local = useLocalSearchParams()
    const { id, name } = local

    const [loadComplete, setLoadComplete] = useState(false)
    const [group, setGroup] = useState<Group>()
    
    useEffect(() => {
        setLoadComplete(false)
        navigation.setOptions({ title: `Group ${name}` })

        const getGroup = async () => {
            const val = (await db().ref(`/groups/${id}`).once('value')).val()
            setGroup({ id, ...val } as Group)
            setLoadComplete(true)
        }

        getGroup()
    }, [navigation, id, name])

    if (!loadComplete) return null

    return (
        <View>
            <Text>Group {name}</Text>
            <Text>{group?.id}</Text>
        </View>
    )
}