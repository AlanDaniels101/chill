import { View, Text, StyleSheet, Pressable, Image } from 'react-native'
import { Link } from 'expo-router'
import { Group } from '../../types'
import React from 'react'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'

interface GroupPanelProps {
    group: Group
}

const GroupPanel: React.FC<GroupPanelProps> = ({group}) => {
    const defaultIcon = { type: 'material' as const, value: 'groups' };
    const icon = group.icon || defaultIcon;

    return (
        <Link href={`/group/${group.id}?name=${group.name}`} asChild>
            <Pressable style={styles.container}>
                {icon.type === 'material' ? (
                    <MaterialIcons 
                        name={icon.value as any} 
                        size={28} 
                        color="#2c3e50" 
                        style={styles.icon}
                    />
                ) : (
                    <Image 
                        source={{ uri: icon.value }}
                        style={styles.iconImage}
                    />
                )}
                <Text style={styles.name}>{group.name}</Text>
            </Pressable>
        </Link>
    )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  iconImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 12,
  },
});

export default GroupPanel