import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
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
    const groupsRef = getDatabase().ref('/groups');

    // Set up realtime listener
    const onGroupsChange = (snapshot: any) => {
      const val = snapshot.val() as FirebaseGroups;
      if (!val) {
        setGroups([]);
        return;
      }
      
      const groups = Object.entries(val).map(([id, group]): Group => ({
        id,
        ...group
      }));
      setGroups(groups);
    };

    // Subscribe to changes
    groupsRef.on('value', onGroupsChange);

    // Cleanup listener when component unmounts
    return () => {
      groupsRef.off('value', onGroupsChange);
    };
  }, []); // Empty dependency array since we want this to run once on mount

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Groups</Text>
        <Pressable 
          style={styles.createButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.buttonText}>Create New Group</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.groupList}>
        {groups?.map(group => (
          <View key={group.id} style={styles.groupItem}>
            <GroupPanel group={group} />
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Link href="/about" style={styles.button}>Go to About</Link>
        <Text style={styles.logoutButton} onPress={() => signOut()}>Log out</Text>
      </View>

      <CreateGroupModal 
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7dacf9',
  },
  header: {
    padding: 16,
    paddingTop: 48,
    backgroundColor: '#5c8ed6',
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  groupList: {
    padding: 16,
  },
  groupItem: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    minHeight: 100,
  },
  createButton: {
    backgroundColor: '#4a7abf',
    padding: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  button: {
    fontSize: 16,
    color: '#fff',
    textDecorationLine: 'underline',
  },
  logoutButton: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
});
