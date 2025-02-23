import { View, Text, StyleSheet, Modal, Pressable, TextInput, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getDatabase } from '@react-native-firebase/database';
import { useState } from 'react';

type Props = {
    visible: boolean;
    groupId: string;
    onClose: () => void;
};

export default function AddMemberModal({ visible, groupId, onClose }: Props) {
    const [newMemberUid, setNewMemberUid] = useState('');

    const handleClose = () => {
        setNewMemberUid('');
        onClose();
    };

    const addMember = async () => {
        if (!groupId || !newMemberUid.trim()) return;
        
        try {
            // Check if user exists
            const userSnapshot = await getDatabase()
                .ref(`/users/${newMemberUid}`)
                .once('value');
            
            if (!userSnapshot.exists()) {
                Alert.alert('Error', 'User not found');
                return;
            }

            // Add user to members
            await getDatabase()
                .ref(`/groups/${groupId}/members/${newMemberUid}`)
                .set(true);
            
            handleClose();
        } catch (error) {
            console.error('Error adding member:', error);
            Alert.alert('Error', 'Failed to add member');
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={handleClose}
        >
            <Pressable 
                style={styles.modalOverlay}
                onPress={handleClose}
            >
                <Pressable 
                    style={styles.modalContent}
                    onPress={e => e.stopPropagation()}
                >
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Add Member</Text>
                        <Pressable onPress={handleClose}>
                            <MaterialIcons name="close" size={24} color="#666" />
                        </Pressable>
                    </View>
                    <TextInput
                        style={styles.input}
                        value={newMemberUid}
                        onChangeText={setNewMemberUid}
                        placeholder="Enter user ID"
                        autoCapitalize="none"
                    />
                    <View style={styles.modalButtons}>
                        <Pressable 
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={handleClose}
                        >
                            <Text style={styles.buttonText}>Cancel</Text>
                        </Pressable>
                        <Pressable 
                            style={[styles.modalButton, styles.addMemberButton]}
                            onPress={addMember}
                        >
                            <Text style={styles.buttonText}>Add</Text>
                        </Pressable>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        width: '80%',
        gap: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        minWidth: 80,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#999',
    },
    addMemberButton: {
        backgroundColor: '#5c8ed6',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
}); 