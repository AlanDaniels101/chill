import { Modal, View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { useState } from 'react';
import { getDatabase } from '@react-native-firebase/database';
import { useAuth } from '../../ctx';
import { useRouter } from 'expo-router';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function CreateGroupModal({ visible, onClose }: Props) {
  const [newGroupName, setNewGroupName] = useState('');
  const { userId } = useAuth();
  const router = useRouter();

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !userId) return;

    try {
      const newGroupRef = await getDatabase().ref('/groups').push({
        name: newGroupName,
        hangouts: {},
        admins: {
          [userId]: true
        }
      });
      
      setNewGroupName('');
      onClose();
      router.push(`/group/${newGroupRef.key}?name=${newGroupName}`);
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Create New Group</Text>
          <TextInput
            style={styles.input}
            value={newGroupName}
            onChangeText={setNewGroupName}
            placeholder="Group Name"
            placeholderTextColor="#666"
          />
          <View style={styles.modalButtons}>
            <Pressable 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </Pressable>
            <Pressable 
              style={[styles.modalButton, styles.createButton]}
              onPress={handleCreateGroup}
            >
              <Text style={styles.buttonText}>Create</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  input: {
    height: 40,
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    padding: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  createButton: {
    backgroundColor: '#5c8ed6',
  },
  cancelButton: {
    backgroundColor: '#999',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 