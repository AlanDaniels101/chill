

import { View, StyleSheet } from 'react-native'
import { Link } from 'expo-router'
import { Group } from '../../types'

export default function GroupPanel(props: {group: Group}) {
    return (
        <View style={styles.groupPanel}>
            <Link href={`/group/${props.group.id}?name=${props.group.name}`}>{props.group.name}</Link>
        </View>
    )
}

const styles = StyleSheet.create({
  groupPanel: {
    backgroundColor: '#fff'
  },
});