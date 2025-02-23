import { View, Text, StyleSheet, Pressable } from 'react-native'
import { Link } from 'expo-router'
import { Group } from '../../types'
import React from 'react'

interface GroupPanelProps {
    group: Group
}

const GroupPanel: React.FC<GroupPanelProps> = ({group}) => {
    return (
        <Link href={`/group/${group.id}?name=${group.name}`} asChild>
            <Pressable style={styles.container}>
                <Text style={styles.name}>{group.name}</Text>
            </Pressable>
        </Link>
    )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
});

export default GroupPanel