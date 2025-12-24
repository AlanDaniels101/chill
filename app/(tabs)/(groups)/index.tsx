import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Pressable, ScrollView, ActivityIndicator, Linking, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { getDatabase } from '@react-native-firebase/database';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../../ctx';

import { Group } from '../../../types'

import GroupPanel from '../../components/groupPanel'
import CreateGroupModal from '../../components/CreateGroupModal';
import QRScanner from '../../components/QRScanner';

type FirebaseGroups = {
  [key: string]: FirebaseGroup;
}

type FirebaseGroup = Omit<Group, 'id'>

export default function Index() {
  const [groups, setGroups] = useState<Group[]>([])
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const { userId } = useAuth();

  const loadGroups = useCallback(() => {
    if (!userId) {
      setGroups([]);
      setIsLoading(false);
      return () => {};
    }

    const db = getDatabase();
    const userGroupsRef = db.ref('users').child(userId).child('groups');

    // Set up realtime listener for user's groups
    const onUserGroupsChange = (snapshot: any) => {
      const userGroups = snapshot.val();
      if (!userGroups) {
        setGroups([]);
        setIsLoading(false);
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
        setIsLoading(false);
      });
    };

    // Subscribe to changes
    userGroupsRef.on('value', onUserGroupsChange);

    // Cleanup listener when component unmounts or refocuses
    return () => {
      userGroupsRef.off('value', onUserGroupsChange);
    };
  }, [userId]);

  // Load groups when component mounts
  useEffect(() => {
    const cleanup = loadGroups();
    return cleanup;
  }, [loadGroups]);

  // Refresh groups when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const cleanup = loadGroups();
      return cleanup;
    }, [loadGroups])
  );

  const handleQRScan = (data: string) => {
    setIsScanning(false);
    // Check if it's a valid chill:// URL
    if (data.startsWith('chill://join-group/')) {
      // Use the deep link system by opening the URL
      // This will trigger the deep link handler in _layout.tsx
      Linking.openURL(data);
    } else {
      // If it's not a valid chill:// URL, show an alert
      Alert.alert(
        'Invalid QR Code',
        'Couldn\'t recognize this QR code. Please make sure you\'re scanning a Chill group invite QR code.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Groups</Text>
        <Text style={styles.subtitle}>
          {groups.length === 0 
            ? 'Get started by creating or joining a group' 
            : `${groups.length} ${groups.length === 1 ? 'group' : 'groups'}`}
        </Text>
      </View>

      {groups.length > 0 && (
        <Pressable 
          style={styles.createButton}
          onPress={() => setModalVisible(true)}
        >
          <MaterialIcons name="add-circle" size={24} color="#fff" />
          <Text style={styles.buttonText}>New Group</Text>
        </Pressable>
      )}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.groupList}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5c8ed6" />
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyStateHeader}>
              <View style={styles.emptyStateIconContainer}>
                <MaterialIcons name="groups" size={64} color="#5c8ed6" />
              </View>
              <Text style={styles.emptyStateTitle}>No groups yet!</Text>
              <Text style={styles.emptyStateSubtitle}>Get started by creating or joining a group</Text>
            </View>
            
            <View style={styles.optionsContainer}>
              <Pressable 
                style={styles.optionCard}
                onPress={() => setModalVisible(true)}
              >
                <View style={styles.optionIcon}>
                  <MaterialIcons name="add-circle" size={32} color="#5c8ed6" />
                </View>
                <Text style={styles.optionTitle}>Create a New Group</Text>
                <Text style={styles.optionDescription}>
                  Start your own group and invite friends to join your hangouts
                </Text>
              </Pressable>

              <Pressable 
                style={styles.optionCard}
                onPress={() => setIsScanning(true)}
              >
                <View style={styles.optionIcon}>
                  <MaterialIcons name="qr-code-scanner" size={32} color="#5c8ed6" />
                </View>
                <Text style={styles.optionTitle}>Join a Group</Text>
                <Text style={styles.optionDescription}>
                  Scan a QR code or use an invite link to join an existing group
                </Text>
              </Pressable>
            </View>
          </View>
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
      
      {isScanning && (
        <View style={styles.qrScannerOverlay}>
          <QRScanner 
            onScan={handleQRScan}
            onClose={() => setIsScanning(false)}
          />
        </View>
      )}
      
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    backgroundColor: '#7dacf9',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5c8ed6',
    borderRadius: 12,
    margin: 16,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  groupList: {
    gap: 12,
    padding: 20,
    paddingBottom: 32,
  },
  groupItem: {
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  emptyStateHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  emptyStateIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    color: '#2c3e50',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  optionsContainer: {
    width: '100%',
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  optionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e8f0ff',
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  qrScannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    backgroundColor: 'black',
  },
});
