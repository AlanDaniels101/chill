import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useAuth } from '../../ctx';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { getDatabase } from '@react-native-firebase/database';
import { User } from '../../types';

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
}); 