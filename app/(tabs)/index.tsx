import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router'

import { useAuth } from '../../ctx';

import { getDatabase } from '@react-native-firebase/database';
import { useEffect, useState } from 'react';

import { Group } from '../../types'

import GroupPanel from '../components/groupPanel'

export default function Index() {
  const { signOut } = useAuth();
  const [groups, setGroups] = useState<Group[]>()

  useEffect(() => {
    const getGroups = async () => {
      const val = (await getDatabase().ref('/groups').once('value')).val()
      const groups = Object.entries(val).map(([id, group]) => ({id, ...group as any} as Group))
      setGroups(groups)
    }

    getGroups()
  })

  return (
    <View style={styles.container}> 
      {groups?.map(group => <GroupPanel key={group.id} group={group} />)}
      <Link href="/about" style={styles.button}>Go to About</Link>
      <Text onPress={() => signOut()}>Log out</Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7dacf9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
  },
  button: {
    fontSize: 20,
    textDecorationLine: 'underline',
    color: '#fff',
  },
});
