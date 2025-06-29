import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput, Alert, Share } from 'react-native';
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

    // Add function to handle sharing
    const handleShareInvite = async () => {
        try {
            const groupSnapshot = await getDatabase().ref(`/groups/${groupId}`).once('value');
            const groupName = groupSnapshot.val()?.name || 'our group';
            
            const appLink = `chill://join-group/${groupId}`;
            
            const message = `Join ${groupName} on Chill!\n\n` +
                `If you have Chill installed, tap this link to join: ${appLink}\n\n` +
                `Otherwise, please download the app first.`;
            
            const result = await Share.share({
                message,
                url: appLink,
                title: `Join ${groupName} on Chill`
            });
            
            if (result.action === Share.sharedAction) {
                if (result.activityType) {
                    console.log(`Shared via ${result.activityType}`);
                } else {
                    console.log('Shared successfully');
                }
            } else if (result.action === Share.dismissedAction) {
                console.log('Share dismissed');
            }
        } catch (error) {
            Alert.alert('Error', 'Could not share the invitation');
            console.error('Error sharing:', error);
        }
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={handleClose}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Add Member</Text>
                    
                    <View style={styles.qrContainer}>
                        <Text style={styles.qrTitle}>Share this QR code:</Text>
                        <QRCode
                            value={`chill://join-group/${groupId}`}
                            size={200}
                        />
                        <Text style={styles.qrInstructions}>
                            To join, you need the Chill app installed.{'\n'}
                        </Text>
                        
                        <Pressable 
                            style={styles.shareButton}
                            onPress={handleShareInvite}
                        >
                            <MaterialIcons name="share" size={20} color="white" />
                            <Text style={styles.shareButtonText}>Share Invite Link</Text>
                        </Pressable>
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
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
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
    qrTitle: {
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
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#5c8ed6',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        marginTop: 15,
    },
    shareButtonText: {
        color: 'white',
        fontWeight: 'bold',
        marginLeft: 8,
    },
}); 