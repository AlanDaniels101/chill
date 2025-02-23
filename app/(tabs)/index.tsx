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
      <Text style={styles.title}>Groups</Text>
      <Pressable 
        style={styles.createButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.buttonText}>Create New Group</Text>
      </Pressable>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.groupList}>
        {groups?.map(group => (
          <View key={group.id} style={styles.groupItem}>
            <GroupPanel group={group} />
          </View>
        ))}
      </ScrollView>

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
    padding: 16,
    paddingTop: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#4a7abf',
    padding: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  groupList: {
    gap: 16,
  },
  groupItem: {
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
});
