import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getDatabase } from '@react-native-firebase/database';
import QRCode from 'react-native-qrcode-svg';
import QRScanner from './QRScanner';

type Props = {
    visible: boolean;
    groupId: string;
    onClose: () => void;
};

export default function AddMemberModal({ visible, groupId, onClose }: Props) {
    const [newMemberUid, setNewMemberUid] = useState('');
    const [isScanning, setIsScanning] = useState(false);

    // Reset scanning state when modal visibility changes
    useEffect(() => {
        if (!visible) {
            setIsScanning(false);
        }
    }, [visible]);

    const handleClose = () => {
        setNewMemberUid('');
        setIsScanning(false);  // Also reset scanning state here
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

    const handleScannedUser = async (userId: string) => {
        setIsScanning(false);
        setNewMemberUid(userId);
        addMember();
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

                    <View style={styles.qrContainer}>
                        <Text style={styles.qrText}>Scan this code to join:</Text>
                        <QRCode
                            value={`chill://join-group/${groupId}`}
                            size={200}
                        />
                        <Text style={styles.qrInstructions}>
                            To join, you need the Chill app installed.{'\n'}
                            Get it from the App Store or Play Store.
                        </Text>
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.orText}>Or add by user ID:</Text>
                    {isScanning ? (
                        <QRScanner 
                            onScan={handleScannedUser}
                            onClose={() => setIsScanning(false)}
                        />
                    ) : (
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                value={newMemberUid}
                                onChangeText={setNewMemberUid}
                                placeholder="Enter user ID"
                                autoCapitalize="none"
                            />
                            <Pressable 
                                style={styles.scanButton}
                                onPress={() => setIsScanning(true)}
                            >
                                <MaterialIcons name="qr-code-scanner" size={24} color="white" />
                            </Pressable>
                        </View>
                    )}
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
    divider: {
        height: 1,
        backgroundColor: '#ddd',
        marginVertical: 16,
    },
    qrContainer: {
        alignItems: 'center',
        gap: 16,
    },
    qrText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    qrInstructions: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        marginTop: 8,
    },
    orText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    scanButton: {
        padding: 8,
        borderRadius: 6,
        backgroundColor: '#5c8ed6',
    },
}); 