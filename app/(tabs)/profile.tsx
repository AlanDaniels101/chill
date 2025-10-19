import { View, Text, StyleSheet, Pressable, Alert, TextInput, ScrollView } from 'react-native';
import { useAuth } from '../../ctx';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { getDatabase } from '@react-native-firebase/database';
import { User } from '../../types';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import * as Application from 'expo-application';

export default function ProfilePage() {
    const { userId, signOut, deleteAccount } = useAuth();
    const [user, setUser] = useState<User>();
    const [isEditingName, setIsEditingName] = useState(false);
    const [tentativeName, setTentativeName] = useState('');
    const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
    const [hasConfiguredProfile, setHasConfiguredProfile] = useState(false);
    const [bannerVisible, setBannerVisible] = useState(false);
    const [isProfileLoading, setIsProfileLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;

        const userRef = getDatabase().ref(`/users/${userId}`);
        
        const onUserUpdate = async (snapshot: any) => {
            const userData = snapshot.val();
            if (userData) {
                setUser({ id: userId, ...userData });
                setIsProfileLoading(false);
                
                // Check if user has configured their profile using hasSetName field
                const isConfigured = !!(userData.hasSetName);
                setHasConfiguredProfile(isConfigured);
                
                // Show welcome banner if profile is not configured
                if (!isConfigured) {
                    setShowWelcomeBanner(true);
                    // Add a small delay to prevent flashing
                    setTimeout(() => {
                        setBannerVisible(true);
                    }, 300);
                } else {
                    setBannerVisible(false);
                }
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
                .ref(`/users/${userId}`)
                .update({
                    name: tentativeName.trim(),
                    hasSetName: true
                });
            setIsEditingName(false);
            // Hide welcome banner when name is saved
            setShowWelcomeBanner(false);
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

    // Show loading screen until user data is loaded
    if (isProfileLoading) {
        return (
            <View style={styles.loadingContainer}>
            </View>
        );
    }

    return (
        <>
            <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
                <MaterialIcons 
                    name="account-circle" 
                    size={80} 
                    color="#2c3e50" 
                />
                {isEditingName ? (
                    <View style={styles.nameEditContainer}>
                        <TextInput
                            style={[
                                styles.nameInput,
                                !hasConfiguredProfile && styles.nameInputGlow
                            ]}
                            value={tentativeName}
                            onChangeText={setTentativeName}
                            placeholder="What should friends call you?"
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
                    <View style={[
                        styles.nameContainer,
                        !hasConfiguredProfile && styles.nameContainerGlow
                    ]}>
                        <Text style={[
                            styles.name,
                            !user?.hasSetName && styles.placeholderName
                        ]}>
                            {user?.name || 'Loading...'}
                        </Text>
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

            <View style={styles.versionContainer}>
                <Text style={styles.versionText}>
                    Version {Application.nativeApplicationVersion || '-'}
                </Text>
            </View>
            </ScrollView>

            {/* Full-screen overlay for name setup */}
            {showWelcomeBanner && bannerVisible && (
                <Pressable 
                    style={styles.fullScreenOverlay}
                    onPress={() => {
                        setTentativeName(user?.name || '');
                        setIsEditingName(true);
                        setShowWelcomeBanner(false);
                        setBannerVisible(false);
                    }}
                >
                    <Pressable 
                        style={styles.welcomeBanner}
                        onPress={(e) => e.stopPropagation()}
                    >
                        <View style={styles.bannerContent}>
                            <MaterialIcons name="waving-hand" size={24} color="#7dacf9" />
                            <View style={styles.bannerText}>
                                <Text style={styles.bannerTitle}>Welcome to Chill!</Text>
                                <Text style={styles.bannerSubtitle}>Let's set up your profile so friends can recognize you.</Text>
                            </View>
                        </View>
                        <Pressable 
                            style={styles.dismissButton}
                            onPress={() => {
                                setTentativeName(user?.name || '');
                                setIsEditingName(true);
                                setShowWelcomeBanner(false);
                                setBannerVisible(false);
                            }}
                        >
                            <MaterialIcons name="arrow-forward" size={20} color="#7dacf9" />
                        </Pressable>
                    </Pressable>
                </Pressable>
            )}
        </>     
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scrollContent: {
        padding: 16,
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
    versionContainer: {
        marginTop: 32,
        marginBottom: 32,
        alignItems: 'center',
    },
    versionText: {
        color: '#666',
        fontSize: 12,
    },
    // Full-screen overlay styles
    fullScreenOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        paddingHorizontal: 16,
        opacity: 1,
    },
    // Welcome banner styles (original)
    welcomeBanner: {
        backgroundColor: '#f8f9ff',
        borderLeftWidth: 4,
        borderLeftColor: '#7dacf9',
        borderRadius: 8,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#7dacf9',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        width: '100%',
        maxWidth: 400,
    },
    bannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    bannerText: {
        marginLeft: 12,
        flex: 1,
    },
    bannerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 2,
    },
    bannerSubtitle: {
        fontSize: 14,
        color: '#666',
        lineHeight: 18,
    },
    dismissButton: {
        padding: 4,
        marginLeft: 8,
    },
    // Glow effect styles
    nameContainerGlow: {
        borderWidth: 2,
        borderColor: '#7dacf9',
        borderRadius: 8,
        padding: 8,
        backgroundColor: '#f8f9ff',
        shadowColor: '#7dacf9',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    nameInputGlow: {
        borderWidth: 2,
        borderColor: '#7dacf9',
        borderRadius: 8,
        padding: 8,
        backgroundColor: '#f8f9ff',
        shadowColor: '#7dacf9',
        shadowOffset: {
            width: 0,
            height: 0,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    placeholderName: {
        fontStyle: 'italic',
        color: '#7dacf9',
        opacity: 0.8,
    },
    // Loading screen styles
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
        marginTop: 16,
    },
}); 