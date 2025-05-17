import { View, Text, StyleSheet, Pressable, Alert, TextInput } from 'react-native';
import { useAuth } from '../../ctx';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { getDatabase } from '@react-native-firebase/database';
import { User } from '../../types';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';

export default function ProfilePage() {
    const { userId, signOut, deleteAccount } = useAuth();
    const [user, setUser] = useState<User>();
    const [isEditingName, setIsEditingName] = useState(false);
    const [tentativeName, setTentativeName] = useState('');

    useEffect(() => {
        if (!userId) return;

        const userRef = getDatabase().ref(`/users/${userId}`);
        
        const onUserUpdate = (snapshot: any) => {
            const userData = snapshot.val();
            if (userData) {
                setUser({ id: userId, ...userData });
            }
        };

        userRef.on('value', onUserUpdate);
        
        return () => {
            userRef.off('value', onUserUpdate);
        };
    }, [userId]);

    const copyUidToClipboard = async () => {
        if (userId) {
            await Clipboard.setStringAsync(userId);
            Alert.alert('Copied!', 'Your user ID has been copied!');
        }
    };

    const handleUpdateName = async () => {
        if (!userId || !tentativeName.trim()) return;
        
        try {
            await getDatabase()
                .ref(`/users/${userId}/name`)
                .set(tentativeName.trim());
            setIsEditingName(false);
        } catch (error) {
            console.error('Error updating name:', error);
            Alert.alert('Error', 'Failed to update name');
        }
    };

    const handleDeleteAccount = async () => {
        Alert.alert(
            "Delete Account",
            "Are you sure you want to delete your account? This action cannot be undone.",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteAccount();
                            // The user will be automatically redirected to login
                            // due to the auth state change listener
                        } catch (error) {
                            console.error('Error deleting account:', error);
                            Alert.alert('Error', 'Failed to delete account. Please try again.');
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <MaterialIcons 
                    name="account-circle" 
                    size={80} 
                    color="#2c3e50" 
                />
                {isEditingName ? (
                    <View style={styles.nameEditContainer}>
                        <TextInput
                            style={styles.nameInput}
                            value={tentativeName}
                            onChangeText={setTentativeName}
                            placeholder="Enter your name"
                            placeholderTextColor="#666"
                            autoFocus
                        />
                        <View style={styles.nameEditButtons}>
                            <Pressable
                                style={[styles.nameEditButton, styles.cancelButton]}
                                onPress={() => {
                                    setIsEditingName(false);
                                    setTentativeName(user?.name || '');
                                }}
                            >
                                <Text style={styles.nameEditButtonText}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.nameEditButton, styles.saveButton]}
                                onPress={handleUpdateName}
                            >
                                <Text style={styles.nameEditButtonText}>Save</Text>
                            </Pressable>
                        </View>
                    </View>
                ) : (
                    <View style={styles.nameContainer}>
                        <Text style={styles.name}>{user?.name || 'Loading...'}</Text>
                        <Pressable
                            style={styles.editButton}
                            onPress={() => {
                                setTentativeName(user?.name || '');
                                setIsEditingName(true);
                            }}
                        >
                            <MaterialIcons name="edit" size={20} color="#5c8ed6" />
                        </Pressable>
                    </View>
                )}
            </View>

            <View style={styles.uidSection}>
                <View style={styles.qrContainer}>
                    <QRCode
                        value={userId || ''}
                        size={150}
                    />
                    <Text style={styles.qrText}>Scan to add me to a group</Text>
                </View>
                <View style={styles.idContainer}>
                    <Text style={styles.idLabel}>Your User ID:</Text>
                    <Text style={styles.idText} numberOfLines={1}>{userId}</Text>
                    <Pressable 
                        style={styles.copyButton}
                        onPress={copyUidToClipboard}
                    >
                        <MaterialIcons name="content-copy" size={20} color="#5c8ed6" />
                    </Pressable>
                </View>
            </View>

            <Pressable 
                style={styles.logoutButton}
                onPress={signOut}
            >
                <MaterialIcons name="logout" size={24} color="white" />
                <Text style={styles.logoutText}>Log Out</Text>
            </Pressable>

            <Pressable 
                style={styles.deleteButton}
                onPress={handleDeleteAccount}
            >
                <MaterialIcons name="delete-forever" size={24} color="white" />
                <Text style={styles.deleteButtonText}>Delete Account</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#fff',
    },
    header: {
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 30,
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        gap: 8,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    editButton: {
        padding: 4,
    },
    nameEditContainer: {
        marginTop: 12,
        alignItems: 'center',
        gap: 8,
    },
    nameInput: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
        borderBottomWidth: 1,
        borderBottomColor: '#5c8ed6',
        padding: 4,
        textAlign: 'center',
        minWidth: 200,
    },
    nameEditButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    nameEditButton: {
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 4,
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
    },
    saveButton: {
        backgroundColor: '#5c8ed6',
    },
    nameEditButtonText: {
        fontSize: 14,
        fontWeight: '500',
    },
    logoutButton: {
        backgroundColor: '#ff4444',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        gap: 8,
    },
    logoutText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    uidSection: {
        marginBottom: 32,
        gap: 16,
    },
    idContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 8,
    },
    idLabel: {
        fontSize: 14,
        color: '#666',
        marginRight: 8,
    },
    idText: {
        fontSize: 14,
        color: '#2c3e50',
        flex: 1,
    },
    copyButton: {
        padding: 4,
    },
    qrContainer: {
        alignItems: 'center',
        gap: 8,
    },
    qrText: {
        fontSize: 12,
        color: '#666',
    },
    deleteButton: {
        backgroundColor: '#ff4444',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        gap: 8,
        marginTop: 12,
    },
    deleteButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
}); 