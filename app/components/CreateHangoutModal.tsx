import { View, Text, Modal, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import { useState } from 'react';
import { getDatabase } from '@react-native-firebase/database';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { MaterialIcons } from '@expo/vector-icons';

type Props = {
    visible: boolean;
    onClose: () => void;
    groupId: string;
};

export default function CreateHangoutModal({ visible, onClose, groupId }: Props) {
    const [name, setName] = useState('');
    const [date, setDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
    const [createdAnonymously, setCreatedAnonymously] = useState(true);
    const [minAttendees, setMinAttendees] = useState(2);
    const [maxAttendees, setMaxAttendees] = useState(8);
    const [showTooltip, setShowTooltip] = useState(false);

    const handleCreate = async () => {
        const hangoutRef = getDatabase().ref('/hangouts').push();
        await hangoutRef.set({
            name,
            time: date.getTime(),
            group: groupId,
            createdAnonymously,
            minAttendees,
            maxAttendees,
        });
        setName('');
        setDate(new Date());
        setCreatedAnonymously(true);
        onClose();
    };

    const onChange = (event: any, selectedDate?: Date) => {
        setShowPicker(Platform.OS === 'ios');
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    const showDatepicker = () => {
        setPickerMode('date');
        setShowPicker(true);
    };

    const showTimepicker = () => {
        setPickerMode('time');
        setShowPicker(true);
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Create Hangout</Text>
                    </View>

                    <TextInput
                        style={styles.input}
                        placeholder="Hangout name"
                        value={name}
                        onChangeText={setName}
                    />

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
                        <DateTimePicker
                            value={date}
                            mode={pickerMode}
                            is24Hour={false}
                            onChange={onChange}
                        />
                    )}

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
            </View>
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
}); 