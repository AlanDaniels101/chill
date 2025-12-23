import { View, Text, Modal, TextInput, Pressable, StyleSheet, Platform, Alert, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useState } from 'react';
import { getDatabase } from '@react-native-firebase/database';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../ctx';
import * as Linking from 'expo-linking';

type Props = {
    visible: boolean;
    onClose: () => void;
    groupId: string;
};

export default function CreateHangoutModal({ visible, onClose, groupId }: Props) {
    const { userId } = useAuth();
    const [name, setName] = useState('');
    
    // Set default date to 1 day from now, at the next hour
    const getTomorrowDate = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(tomorrow.getHours() + 1);
        tomorrow.setMinutes(0);
        tomorrow.setSeconds(0);
        return tomorrow;
    };
    
    const [date, setDate] = useState(getTomorrowDate());
    const [showPicker, setShowPicker] = useState(false);
    const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
    const [createdAnonymously, setCreatedAnonymously] = useState(true);
    const [minAttendees, setMinAttendees] = useState(2);
    const [maxAttendees, setMaxAttendees] = useState(8);
    const [showTooltip, setShowTooltip] = useState(false);
    const [location, setLocation] = useState('');
    const [pollMode, setPollMode] = useState(false);

    // Reset form with tomorrow's date
    const resetForm = () => {
        setName('');
        setDate(getTomorrowDate());
        setCreatedAnonymously(true);
        setLocation('');
        setPollMode(false);
    };

    const handleCreate = async () => {
        if (!userId) return;
        
        const hangoutRef = getDatabase().ref('/hangouts').push();
        const hangoutId = hangoutRef.key;
        
        try {
            // Create the hangout with the creator as an attendee
            const hangoutData: any = {
                id: hangoutId,
                name,
                group: groupId,
                createdAnonymously,
                minAttendees,
                maxAttendees,
                location: location.trim(),
                createdBy: userId,
                attendees: {
                    [userId]: true
                }
            };

            // Add time or poll flag based on mode
            if (pollMode) {
                hangoutData.datetimePollInProgress = true;
            } else {
                hangoutData.time = date.getTime();
            }

            await hangoutRef.set(hangoutData);

            // Add the hangout to the group's hangouts list
            await getDatabase()
                .ref(`/groups/${groupId}/hangouts/${hangoutId}`)
                .set(true);

            // Reset form using the resetForm function
            resetForm();
            onClose();
        } catch (error) {
            console.error('Error creating hangout:', error);
            Alert.alert('Error', 'Failed to create hangout');
        }
    };

    const onChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            // On Android, the picker is a modal - close it
            setShowPicker(false);
            // Only update if user confirmed (not cancelled)
            if (event.type === 'set' && selectedDate) {
                setDate(selectedDate);
            }
        } else {
            // On iOS, update in real-time as user scrolls the spinner
            if (selectedDate) {
                setDate(selectedDate);
            }
            // Close picker when dismissed (user taps outside)
            if (event.type === 'dismissed') {
                setShowPicker(false);
            }
        }
    };

    const showDatepicker = () => {
        Keyboard.dismiss();
        setPickerMode('date');
        setShowPicker(true);
    };

    const showTimepicker = () => {
        Keyboard.dismiss();
        setPickerMode('time');
        setShowPicker(true);
    };

    const isUrl = (text: string): boolean => {
        const trimmed = text.trim();
        return trimmed.startsWith('http://') || 
               trimmed.startsWith('https://') || 
               trimmed.startsWith('maps://');
    };

    const openUrl = () => {
        if (!location.trim()) return;
        
        let urlToOpen = location.trim();
        
        // Ensure URL has a protocol
        if (!urlToOpen.startsWith('http://') && !urlToOpen.startsWith('https://') && !urlToOpen.startsWith('maps://')) {
            urlToOpen = `https://${urlToOpen}`;
        }
        
        Linking.openURL(urlToOpen).catch(() => {
            Alert.alert('Error', 'Unable to open link');
        });
    };

    const openMaps = () => {
        let url: string;

        if (Platform.OS === 'ios') {
            // iOS - Apple Maps
            if (location.trim()) {
                const address = encodeURIComponent(location);
                url = `maps://maps.apple.com/?q=${address}`;
            } else {
                url = `maps://`;
            }
        } else {
            // Android - Google Maps
            if (location.trim()) {
                const address = encodeURIComponent(location);
                url = `https://maps.google.com/?q=${address}`;
            } else {
                url = `https://maps.google.com/`;
            }
        }

        Linking.openURL(url).catch(() => {
            // Fallback for Android if Google Maps is not installed
            if (Platform.OS === 'android') {
                if (location.trim()) {
                    const address = encodeURIComponent(location);
                    Linking.openURL(`geo:0,0?q=${address}`);
                } else {
                    Linking.openURL(`geo:0,0`);
                }
            } else {
                Alert.alert('Error', 'Unable to open maps');
            }
        });
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={() => {
                Keyboard.dismiss();
                setShowPicker(false);
            }}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={() => {
                        Keyboard.dismiss();
                        setShowPicker(false);
                    }}>
                        <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Create Hangout</Text>
                        <Pressable onPress={onClose}>
                            <MaterialIcons name="close" size={24} color="#666" />
                        </Pressable>
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder="Hangout name"
                        value={name}
                        onChangeText={setName}
                        onFocus={() => setShowPicker(false)}
                    />

                    {!pollMode && (
                        <>
                            <View style={styles.dateTimeContainer}>
                                <Pressable style={styles.dateTimeButton} onPress={showDatepicker}>
                                    <Text style={styles.dateTimeButtonText}>
                                        {format(date, 'MMM d, yyyy')}
                                    </Text>
                                </Pressable>
                                <Pressable style={styles.dateTimeButton} onPress={showTimepicker}>
                                    <Text style={styles.dateTimeButtonText}>
                                        {format(date, 'h:mm a')}
                                    </Text>
                                </Pressable>
                            </View>

                            {showPicker && (
                                <TouchableWithoutFeedback onPress={() => {}}>
                                    <View style={styles.pickerContainer}>
                                        <DateTimePicker
                                            value={date}
                                            mode={pickerMode}
                                            is24Hour={false}
                                            onChange={onChange}
                                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        />
                                    </View>
                                </TouchableWithoutFeedback>
                            )}
                        </>
                    )}

                    <Pressable 
                        style={styles.checkboxContainer} 
                        onPress={() => setPollMode(!pollMode)}
                    >
                        <MaterialIcons 
                            name={pollMode ? "check-box" : "check-box-outline-blank"} 
                            size={24} 
                            color="#5c8ed6" 
                        />
                        <Text style={styles.checkboxLabel}>Poll Availability</Text>
                    </Pressable>

                    <View style={styles.locationContainer}>
                        <MaterialIcons name="location-on" size={20} color="#666" style={styles.locationIcon} />
                        <TextInput
                            style={[styles.input, styles.locationInput]}
                            placeholder="Add location"
                            value={location}
                            onChangeText={setLocation}
                            onFocus={() => setShowPicker(false)}
                        />
                        {isUrl(location) && (
                            <Pressable 
                                style={styles.linkButton}
                                onPress={openUrl}
                            >
                                <MaterialIcons name="link" size={20} color="#5c8ed6" />
                            </Pressable>
                        )}
                        <Pressable 
                            style={styles.mapButton}
                            onPress={openMaps}
                        >
                            <MaterialIcons name="map" size={20} color="#5c8ed6" />
                        </Pressable>
                    </View>

                    <View style={styles.attendeeSection}>
                        <Text style={styles.sectionLabel}>Attendees</Text>
                        <View style={styles.attendeeControls}>
                            <View style={styles.attendeeControl}>
                                <Text style={styles.attendeeLabel}>Minimum</Text>
                                <View style={styles.counterContainer}>
                                    <Pressable 
                                        style={styles.counterButton}
                                        onPress={() => setMinAttendees(Math.max(2, minAttendees - 1))}
                                    >
                                        <MaterialIcons name="remove" size={20} color="#5c8ed6" />
                                    </Pressable>
                                    <TextInput
                                        style={styles.counterInput}
                                        value={minAttendees.toString()}
                                        onChangeText={(text) => {
                                            const num = parseInt(text) || 2;
                                            setMinAttendees(Math.min(maxAttendees, Math.max(2, num)));
                                        }}
                                        keyboardType="number-pad"
                                        selectTextOnFocus
                                        editable={true}
                                        maxLength={2}
                                        onFocus={() => setShowPicker(false)}
                                    />
                                    <Pressable 
                                        style={styles.counterButton}
                                        onPress={() => setMinAttendees(Math.min(maxAttendees, minAttendees + 1))}
                                    >
                                        <MaterialIcons name="add" size={20} color="#5c8ed6" />
                                    </Pressable>
                                </View>
                            </View>
                            <View style={styles.attendeeControl}>
                                <Text style={styles.attendeeLabel}>Maximum</Text>
                                <View style={styles.counterContainer}>
                                    <Pressable 
                                        style={styles.counterButton}
                                        onPress={() => setMaxAttendees(Math.max(minAttendees, maxAttendees - 1))}
                                    >
                                        <MaterialIcons name="remove" size={20} color="#5c8ed6" />
                                    </Pressable>
                                    <TextInput
                                        style={styles.counterInput}
                                        value={maxAttendees.toString()}
                                        onChangeText={(text) => {
                                            const num = parseInt(text) || minAttendees;
                                            setMaxAttendees(Math.max(minAttendees, num));
                                        }}
                                        keyboardType="number-pad"
                                        selectTextOnFocus
                                        editable={true}
                                        maxLength={2}
                                        onFocus={() => setShowPicker(false)}
                                    />
                                    <Pressable 
                                        style={styles.counterButton}
                                        onPress={() => setMaxAttendees(maxAttendees + 1)}
                                    >
                                        <MaterialIcons name="add" size={20} color="#5c8ed6" />
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    </View>

                    <Pressable 
                        style={styles.checkboxContainer} 
                        onPress={() => setCreatedAnonymously(!createdAnonymously)}
                    >
                        <MaterialIcons 
                            name={createdAnonymously ? "check-box" : "check-box-outline-blank"} 
                            size={24} 
                            color="#5c8ed6" 
                        />
                        <Text style={styles.checkboxLabel}>Suggest Anonymously</Text>
                        <Pressable 
                            style={styles.infoButton}
                            onPress={() => setShowTooltip(!showTooltip)}
                        >
                            <MaterialIcons 
                                name="info-outline" 
                                size={20} 
                                color="#666"
                            />
                            {showTooltip && (
                                <View style={styles.tooltipContainer}>
                                    <Text style={styles.tooltipText}>
                                        Hides the creator and list of attendees until the minimum number of people have RSVPed.
                                    </Text>
                                </View>
                            )}
                        </Pressable>
                    </Pressable>

                    <View style={styles.modalButtons}>
                        <Pressable 
                            style={[styles.modalButton]} 
                            onPress={onClose}
                        >
                            <Text style={styles.buttonTextDark}>Cancel</Text>
                        </Pressable>
                        <Pressable 
                            style={[styles.modalButton, styles.createButton]} 
                            onPress={handleCreate}
                        >
                            <Text style={styles.buttonText}>Create</Text>
                        </Pressable>
                    </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
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
    createButton: {
        backgroundColor: '#5c8ed6',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
    buttonTextDark: {
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
    dateTimeContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    dateTimeButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
    },
    dateTimeButtonText: {
        fontSize: 16,
        color: '#2c3e50',
    },
    pickerContainer: {
        marginTop: 8,
        paddingVertical: Platform.OS === 'ios' ? 12 : 0,
        alignItems: 'center',
        borderWidth: Platform.OS === 'ios' ? 1 : 0,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: Platform.OS === 'ios' ? '#f9f9f9' : 'transparent',
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        position: 'relative',
        zIndex: 999999,
    },
    checkboxLabel: {
        fontSize: 16,
        color: '#2c3e50',
        flex: 1,
    },
    infoButton: {
        padding: 4,
    },
    tooltipContainer: {
        position: 'absolute',
        backgroundColor: '#2c3e50',
        padding: 12,
        borderRadius: 8,
        width: 250,
        right: 0,
        bottom: 32,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        zIndex: 999999,
    },
    tooltipText: {
        color: 'white',
        fontSize: 14,
        lineHeight: 20,
    },
    attendeeSection: {
        gap: 8,
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
    },
    attendeeControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    attendeeControl: {
        flex: 1,
        gap: 4,
    },
    attendeeLabel: {
        fontSize: 14,
        color: '#666',
    },
    counterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 8,
    },
    counterButton: {
        padding: 4,
    },
    counterInput: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        minWidth: 40,
        textAlign: 'center',
        padding: 0,
        height: 24,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    locationIcon: {
        marginLeft: 4,
    },
    locationInput: {
        flex: 1,
        marginLeft: 0,
    },
    linkButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#f0f5ff',
    },
    mapButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#f0f5ff',
    },
}); 