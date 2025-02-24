import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useAuth } from '../../ctx';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { getDatabase } from '@react-native-firebase/database';
import { User } from '../../types';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';

export default function ProfilePage() {
    const { userId, signOut } = useAuth();
    const [user, setUser] = useState<User>();

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

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <MaterialIcons 
                    name="account-circle" 
                    size={80} 
                    color="#2c3e50" 
                />
                <Text style={styles.name}>{user?.name || 'Loading...'}</Text>
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
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginTop: 12,
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
}); 