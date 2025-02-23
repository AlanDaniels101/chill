import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Link } from 'expo-router'

import { useAuth } from '../../ctx';

import { getDatabase } from '@react-native-firebase/database';
import { useEffect, useState } from 'react';

import { Group } from '../../types'

import GroupPanel from '../components/groupPanel'
import CreateGroupModal from '../components/CreateGroupModal';

type FirebaseGroups = {
  [key: string]: FirebaseGroup;
}

type FirebaseGroup = Omit<Group, 'id'>

export default function Index() {
  const { signOut } = useAuth();
  const [groups, setGroups] = useState<Group[]>()
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const getGroups = async () => {
      const val = (await getDatabase().ref('/groups').once('value')).val() as FirebaseGroups
      const groups = Object.entries(val).map(([id, group]): Group => ({
        id,
        ...group
      }))
      setGroups(groups)
    }

    getGroups()
  }, [])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Groups</Text>
      <Pressable 
        style={styles.createButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.buttonText}>Create New Group</Text>
      </Pressable>

      {groups?.map(group => <GroupPanel key={group.id} group={group} />)}
      <Link href="/about" style={styles.button}>Go to About</Link>
      <Text onPress={() => signOut()}>Log out</Text>
      <StatusBar style="light" />

      <CreateGroupModal 
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  text: {
    color: '#fff',
  },
  button: {
    fontSize: 20,
    textDecorationLine: 'underline',
    color: '#fff',
  },
  createButton: {
    backgroundColor: '#5c8ed6',
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
    minWidth: 150,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
