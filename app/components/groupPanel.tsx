

import { View, StyleSheet } from 'react-native'
import { Link } from 'expo-router'
import { Group } from '../../types'
import React from 'react'

interface GroupPanelProps {
    group: Group
}

const GroupPanel: React.FC<GroupPanelProps> = ({group}) => {
    return (
        <View style={styles.groupPanel}>
            <Link href={`/group/${group.id}?name=${group.name}`}>{group.name}</Link>
        </View>
    )
}

const styles = StyleSheet.create({
  groupPanel: {
    backgroundColor: '#fff'
  },
});

export default GroupPanel