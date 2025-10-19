import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Pressable, ScrollView, ActivityIndicator, Linking, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { getDatabase } from '@react-native-firebase/database';
import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!userId) {
      setGroups([]);
      setIsLoading(false);
      return;
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

    // Cleanup listener when component unmounts
    return () => {
      userGroupsRef.off('value', onUserGroupsChange);
    };
  }, [userId]);

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
      <Pressable 
        style={styles.createButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.buttonText}>Create New Group</Text>
      </Pressable>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.groupList}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5c8ed6" />
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyStateHeader}>
              <Text style={styles.emptyStateTitle}>No groups yet!</Text>
              <Text style={styles.emptyStateSubtitle}>Get started by creating or joining a group</Text>
            </View>
            
            <View style={styles.optionsContainer}>
              <Pressable 
                style={styles.optionCard}
                onPress={() => setModalVisible(true)}
              >
                <View style={styles.optionIcon}>
                  <MaterialIcons name="add-circle" size={32} color="#4a7abf" />
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
                  <MaterialIcons name="qr-code-scanner" size={32} color="#4a7abf" />
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
    backgroundColor: '#7dacf9',
    padding: 16,
    paddingTop: 32,
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
    paddingVertical: 20,
  },
  emptyStateHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.9,
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
