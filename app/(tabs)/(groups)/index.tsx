import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';

import { getDatabase } from '@react-native-firebase/database';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../ctx';

import { Group } from '../../../types'

import GroupPanel from '../../components/groupPanel'
import CreateGroupModal from '../../components/CreateGroupModal';

type FirebaseGroups = {
  [key: string]: FirebaseGroup;
}

type FirebaseGroup = Omit<Group, 'id'>

export default function Index() {
  const [groups, setGroups] = useState<Group[]>([])
  const [modalVisible, setModalVisible] = useState(false);
  const { userId } = useAuth();

  useEffect(() => {
    if (!userId) {
      setGroups([]);
      return;
    }

    const db = getDatabase();
    const userGroupsRef = db.ref('users').child(userId).child('groups');

    // Set up realtime listener for user's groups
    const onUserGroupsChange = (snapshot: any) => {
      const userGroups = snapshot.val();
      if (!userGroups) {
        setGroups([]);
        return;
      }

      // Get all group IDs the user belongs to
      const groupIds = Object.keys(userGroups);
      
      // Fetch full group information for each group
      const groupPromises = groupIds.map(async (groupId) => {
        const groupSnapshot = await db.ref('groups').child(groupId).once('value');
        const groupData = groupSnapshot.val();
        if (groupData) {
          return {
            id: groupId,
            ...groupData
          } as Group;
        }
        return null;
      });

      // Wait for all group data to be fetched
      Promise.all(groupPromises).then((groups) => {
        // Filter out any null groups and set the state
        setGroups(groups.filter((group): group is Group => group !== null));
      });
    };

    // Subscribe to changes
    userGroupsRef.on('value', onUserGroupsChange);

    // Cleanup listener when component unmounts
    return () => {
      userGroupsRef.off('value', onUserGroupsChange);
    };
  }, [userId]);

  return (
    <View style={styles.container}>
      <Pressable 
        style={styles.createButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.buttonText}>Create New Group</Text>
      </Pressable>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.groupList}>
        {groups.length === 0 ? (
          <Text style={styles.emptyText}>No groups yet. Create one to get started!</Text>
        ) : (
          groups.map(group => (
            <View key={group.id} style={styles.groupItem}>
              <GroupPanel group={group} />
            </View>
          ))
        )}
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
    paddingBottom: 16,
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
    borderWidth: 1,
    borderColor: '#ddd',
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 32,
  },
});
