import React from 'react';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View, StyleSheet, Pressable, Alert, Share, ScrollView, TextInput, Image, Platform } from 'react-native';
import { Hangout, Group, User } from '../../../../types';
import { getDatabase } from '@react-native-firebase/database';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../../../ctx';
import Linkify from 'react-native-linkify';
import * as Linking from 'expo-linking';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import * as Calendar from 'expo-calendar';

export default function HangoutPage() {
    const navigation = useNavigation();
    const router = useRouter();
    const local = useLocalSearchParams();
    const { id, name } = local;
    const { userId } = useAuth();

    const [loadComplete, setLoadComplete] = useState(false);
    const [hangout, setHangout] = useState<Hangout | null>(null);
    const [group, setGroup] = useState<Group | null>(null);
    const [attendees, setAttendees] = useState<{ [key: string]: User }>({});
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [tentativeInfo, setTentativeInfo] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
    const [suggestedDate, setSuggestedDate] = useState(new Date());

    const isUrl = (text: string): boolean => {
        const trimmed = text.trim();
        return trimmed.startsWith('http://') || 
               trimmed.startsWith('https://') || 
               trimmed.startsWith('maps://');
    };

    const handleLocationPress = () => {
        if (!hangout?.location) return;
        
        let urlToOpen = hangout.location.trim();
        
        // Ensure URL has a protocol
        if (!urlToOpen.startsWith('http://') && !urlToOpen.startsWith('https://') && !urlToOpen.startsWith('maps://')) {
            urlToOpen = `https://${urlToOpen}`;
        }
        
        Linking.openURL(urlToOpen).catch(() => {
            Alert.alert('Error', 'Unable to open link');
        });
    };

    const handleDecline = async () => {
        if (!hangout) return;
        
        Alert.alert(
            "Decline Event",
            "Are you sure you don't want to attend this event?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Decline",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Update local state immediately
                            const newAttendees = { ...attendees };
                            delete newAttendees[userId];
                            setAttendees(newAttendees);
                            
                            // Update Firebase
                            await getDatabase().ref(`/hangouts/${id}/attendees/${userId}`).set(null);
                        } catch (error) {
                            Alert.alert("Error", "Failed to decline the event. Please try again.");
                        }
                    }
                }
            ]
        );
    };

    const handleRSVP = async () => {
        if (!hangout) return;
        
        try {
            await getDatabase().ref(`/hangouts/${id}/attendees/${userId}`).set(true);
        } catch (error) {
            Alert.alert("Error", "Failed to join the event. Please try again.");
        }
    };

    const handleDelete = async () => {
        if (!hangout) return;
        
        Alert.alert(
            "Delete Hangout",
            "Are you sure you want to delete this hangout?",
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
                            // Remove from group's hangouts list first
                            if (hangout.group) {
                                await getDatabase().ref(`/groups/${hangout.group}/hangouts/${id}`).remove();
                            }
                            // Then remove the hangout itself
                            await getDatabase().ref(`/hangouts/${id}`).remove();
                            router.back();
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete the hangout. Please try again.");
                        }
                    }
                }
            ]
        );
    };

    const handleShare = async () => {
        try {
            const appLink = `chill://hangout/${id}`;
            const message = `Join our hangout "${hangout?.name}" on Chill!\n\n` +
                `Open in the Chill app: chill://hangout/${id}`;
            
            await Share.share({
                message,
                url: appLink,
                title: `Join ${hangout?.name} on Chill`
            });
        } catch (error) {
            console.error('Error sharing:', error);
            Alert.alert('Error', 'Could not share the invitation');
        }
    };

    const handleUpdateInfo = async () => {
        if (!id) return;
        try {
            await getDatabase()
                .ref(`/hangouts/${id}/info`)
                .set(tentativeInfo);
            setHangout(prev => prev ? { ...prev, info: tentativeInfo } : null);
            setIsEditingInfo(false);
        } catch (error) {
            console.error('Error updating info:', error);
            Alert.alert('Error', 'Failed to update info. Please try again.');
        }
    };

    const handleToggleDateSelection = async (dateTimestamp: number) => {
        if (!hangout || !userId || !id) return;
        
        try {
            const currentSelections = hangout.datePollSelections?.[userId] || [];
            const isSelected = currentSelections.includes(dateTimestamp);
            
            let newSelections: number[];
            if (isSelected) {
                newSelections = currentSelections.filter((ts: number) => ts !== dateTimestamp);
            } else {
                newSelections = [...currentSelections, dateTimestamp];
            }
            
            await getDatabase()
                .ref(`/hangouts/${id}/datePollSelections/${userId}`)
                .set(newSelections.length > 0 ? newSelections : null);
        } catch (error) {
            console.error('Error toggling date selection:', error);
            Alert.alert('Error', 'Failed to update date selection. Please try again.');
        }
    };

    const handleSuggestNewTime = async () => {
        if (!hangout || !userId || !id) return;
        
        try {
            const timestamp = suggestedDate.getTime();
            const timestampStr = timestamp.toString();
            const currentCandidates: { [key: string]: string } = hangout.candidateDates || {};
            
            // Don't add duplicate dates
            if (currentCandidates[timestampStr]) {
                Alert.alert('Notice', 'This date is already a candidate.');
                return;
            }
            
            const updatedCandidates = {
                ...currentCandidates,
                [timestampStr]: userId
            };
            await getDatabase()
                .ref(`/hangouts/${id}/candidateDates`)
                .set(updatedCandidates);
            
            // Also select the newly suggested date
            const currentSelections = hangout.datePollSelections?.[userId] || [];
            const newSelections = [...currentSelections, timestamp];
            await getDatabase()
                .ref(`/hangouts/${id}/datePollSelections/${userId}`)
                .set(newSelections);
            
            setShowDatePicker(false);
        } catch (error) {
            console.error('Error suggesting new time:', error);
            Alert.alert('Error', 'Failed to suggest new time. Please try again.');
        }
    };

    const handleDeleteCandidateDate = async (timestamp: number) => {
        if (!hangout || !userId || !id) return;
        
        const timestampStr = timestamp.toString();
        const suggestedBy: string | undefined = hangout.candidateDates?.[timestampStr];
        const isOrganizer = hangout.createdBy === userId;
        const isSuggester = suggestedBy === userId;
        
        if (!isOrganizer && !isSuggester) {
            Alert.alert('Error', 'You can only delete dates you suggested or if you are the event organizer.');
            return;
        }
        
        Alert.alert(
            "Delete Date",
            "Are you sure you want to remove this date from the poll?",
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
                            const currentCandidates: { [key: string]: string } = { ...(hangout.candidateDates || {}) };
                            delete currentCandidates[timestampStr];
                            
                            await getDatabase()
                                .ref(`/hangouts/${id}/candidateDates`)
                                .set(Object.keys(currentCandidates).length > 0 ? currentCandidates : null);
                            
                            // Remove this date from all users' selections
                            const currentSelections: { [uid: string]: number[] } = hangout.datePollSelections || {};
                            const updatedSelections: { [uid: string]: number[] } = {};
                            
                            for (const [uid, selections] of Object.entries(currentSelections)) {
                                const filtered = (selections || []).filter((ts: number) => ts !== timestamp);
                                if (filtered.length > 0) {
                                    updatedSelections[uid] = filtered;
                                }
                            }
                            
                            await getDatabase()
                                .ref(`/hangouts/${id}/datePollSelections`)
                                .set(Object.keys(updatedSelections).length > 0 ? updatedSelections : null);
                        } catch (error) {
                            console.error('Error deleting candidate date:', error);
                            Alert.alert('Error', 'Failed to delete date. Please try again.');
                        }
                    }
                }
            ]
        );
    };

    const onDatePickerChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
            if (event.type === 'set' && selectedDate) {
                setSuggestedDate(selectedDate);
            }
        } else {
            if (selectedDate) {
                setSuggestedDate(selectedDate);
            }
            if (event.type === 'dismissed') {
                setShowDatePicker(false);
            }
        }
    };

    const handleAddToCalendar = async () => {
        if (!hangout || !hangout.time || hangout.datetimePollInProgress) {
            Alert.alert('Error', 'Cannot add to calendar: Date has not been set yet.');
            return;
        }

        try {
            // Request calendar permissions
            const { status } = await Calendar.requestCalendarPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Required',
                    'Calendar access is required to add events. Please enable it in your device settings.'
                );
                return;
            }

            // Get default calendar
            const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
            const defaultCalendar = calendars.find(cal => cal.allowsModifications) || calendars[0];

            if (!defaultCalendar) {
                Alert.alert('Error', 'No writable calendar found on your device.');
                return;
            }

            // Create event details
            const startDate = new Date(hangout.time);
            const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // Default 1 hour duration

            const eventDetails = {
                title: hangout.name,
                startDate: startDate,
                endDate: endDate,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                ...(hangout.info && { notes: hangout.info }),
                ...(hangout.location && { location: hangout.location }),
            };

            // Create the event
            const eventId = await Calendar.createEventAsync(defaultCalendar.id, eventDetails);
            
            Alert.alert('Success', 'Hangout added to your calendar!');
        } catch (error: any) {
            console.error('Error adding to calendar:', error);
            Alert.alert('Error', `Failed to add to calendar: ${error.message || 'Unknown error'}`);
        }
    };

    const handleClosePoll = async () => {
        if (!hangout || !userId || !id) return;
        
        if (hangout.createdBy !== userId) {
            Alert.alert('Error', 'Only the event organizer can close the poll.');
            return;
        }
        
        const candidateDates: { [key: string]: string } = hangout.candidateDates || {};
        const candidateTimestamps = Object.keys(candidateDates).map(ts => parseInt(ts));
        
        if (candidateTimestamps.length === 0) {
            Alert.alert('Error', 'Cannot close poll: No candidate dates available.');
            return;
        }
        
        // Calculate vote counts for each candidate date
        const voteCounts: { [timestamp: number]: number } = {};
        const allSelections = hangout.datePollSelections || {};
        candidateTimestamps.forEach((timestamp: number) => {
            let count = 0;
            Object.values(allSelections).forEach((selections: number[]) => {
                if (selections.includes(timestamp)) {
                    count++;
                }
            });
            voteCounts[timestamp] = count;
        });
        
        // Check if any dates have votes
        const maxVotes = Math.max(...Object.values(voteCounts));
        if (maxVotes === 0) {
            Alert.alert('Error', 'Cannot close poll: No dates have been voted for.');
            return;
        }
        
        // Find dates with the most votes
        const datesWithMaxVotes = candidateTimestamps.filter(
            (timestamp: number) => voteCounts[timestamp] === maxVotes
        );
        
        // Check for ties
        if (datesWithMaxVotes.length > 1) {
            Alert.alert(
                'Tie Detected',
                `Cannot close poll: There is a tie between ${datesWithMaxVotes.length} dates with ${maxVotes} vote${maxVotes !== 1 ? 's' : ''} each. Please resolve the tie before closing.`
            );
            return;
        }
        
        // Close the poll and set the winning date
        const winningTimestamp = datesWithMaxVotes[0];
        
        Alert.alert(
            "Close Poll",
            `Set the date to ${format(new Date(winningTimestamp), 'MMM d, yyyy h:mm a')}?`,
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Close Poll",
                    onPress: async () => {
                        try {
                            await getDatabase()
                                .ref(`/hangouts/${id}/time`)
                                .set(winningTimestamp);
                            await getDatabase()
                                .ref(`/hangouts/${id}/datetimePollInProgress`)
                                .set(null);
                        } catch (error) {
                            console.error('Error closing poll:', error);
                            Alert.alert('Error', 'Failed to close poll. Please try again.');
                        }
                    }
                }
            ]
        );
    };

    useEffect(() => {
        setLoadComplete(false);
        // Set initial header title immediately to prevent flash
        navigation.setOptions({
            headerTitle: name || 'Hangout',
            headerBackTitle: "Back",
        });

        const hangoutRef = getDatabase().ref(`/hangouts/${id}`);
        
        const onHangoutUpdate = async (snapshot: any) => {
            try {
                const hangoutData = snapshot.val();
                if (!hangoutData) {
                    // Hangout doesn't exist or we don't have permission to read it
                    router.replace('/(tabs)/(groups)');
                    return;
                }

                const hangout = { id, ...hangoutData } as Hangout;
                setHangout(hangout);

                // Get group data
                const groupSnapshot = await getDatabase()
                    .ref(`/groups/${hangout.group}`)
                    .once('value');
                const groupData = groupSnapshot.val();
                if (!groupData) {
                    // Group doesn't exist or we don't have permission to read it
                    router.replace('/(tabs)/(groups)');
                    return;
                }
                const groupWithId = { id: hangout.group, ...groupData };
                setGroup(groupWithId);

                // Update header with group info
                const headerTitle = () => (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {groupWithId.icon?.type === 'material' ? (
                            <MaterialIcons 
                                name={groupWithId.icon.value as any} 
                                size={20} 
                                color="#fff" 
                            />
                        ) : groupWithId.icon?.type === 'image' ? (
                            <Image 
                                source={{ uri: groupWithId.icon.value }}
                                style={{ width: 20, height: 20, borderRadius: 10 }}
                            />
                        ) : (
                            <MaterialIcons 
                                name="groups" 
                                size={20} 
                                color="#fff" 
                            />
                        )}
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '500' }}>
                            {groupWithId.name}
                        </Text>
                    </View>
                );
                navigation.setOptions({
                    headerTitle: headerTitle,
                    headerBackTitle: "Back",
                });

                // Get attendees data
                if (hangout.attendees) {
                    const attendeeIds = Object.keys(hangout.attendees);
                    const attendeePromises = attendeeIds.map(async uid => {
                        try {
                            const nameSnapshot = await getDatabase()
                                .ref(`/users/${uid}/name`)
                                .once('value');
                            return {
                                id: uid,
                                name: nameSnapshot.val() || 'Unknown User'
                            };
                        } catch (error) {
                            console.error(`Error fetching name for attendee ${uid}:`, error);
                            return {
                                id: uid,
                                name: 'Unknown User'
                            };
                        }
                    });
                    const attendeeData = Object.fromEntries(
                        (await Promise.all(attendeePromises)).map(user => [user.id, user])
                    );
                    setAttendees(attendeeData);
                }

                setLoadComplete(true);
            } catch (error: any) {
                if (error.code === 'PERMISSION_DENIED') {
                    // Redirect to groups page for permission errors
                    router.replace('/(tabs)/(groups)');
                } else {
                    // For other errors, show error state
                    setLoadComplete(true);
                }
            }
        };

        hangoutRef.on('value', onHangoutUpdate);

        return () => {
            hangoutRef.off('value', onHangoutUpdate);
        };
    }, [id, name]);

    if (!loadComplete) return null;

    const date = new Date(hangout?.time || 0);
    const isPast = date < new Date() && !hangout?.datetimePollInProgress;

    // Polling section rendering
    const renderPollingSection = () => {
        if (!hangout?.datetimePollInProgress) return null;
        
        const candidateDates: { [key: string]: string } = hangout.candidateDates || {};
        const userSelections = hangout.datePollSelections?.[userId] || [];
        const candidateTimestamps = Object.keys(candidateDates).map(ts => parseInt(ts)).sort((a, b) => a - b);
        const isOrganizer = hangout.createdBy === userId;
        
        // Calculate vote counts for each candidate date
        const voteCounts: { [timestamp: number]: number } = {};
        const allSelections = hangout.datePollSelections || {};
        candidateTimestamps.forEach((timestamp: number) => {
            let count = 0;
            Object.values(allSelections).forEach((selections: number[]) => {
                if (selections.includes(timestamp)) {
                    count++;
                }
            });
            voteCounts[timestamp] = count;
        });
        
        return (
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Select Available Dates</Text>
                    {isOrganizer && (
                        <Pressable
                            style={styles.closePollButton}
                            onPress={handleClosePoll}
                        >
                            <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
                            <Text style={styles.closePollButtonText}>Close Poll</Text>
                        </Pressable>
                    )}
                </View>
                <View style={styles.pollingContainer}>
                    {candidateTimestamps.length > 0 ? (
                        <>
                            {candidateTimestamps.map((timestamp: number) => {
                                const date = new Date(timestamp);
                                const isSelected = userSelections.includes(timestamp);
                                const timestampStr = timestamp.toString();
                                const suggestedBy: string | undefined = candidateDates[timestampStr];
                                const canDelete = isOrganizer || suggestedBy === userId;
                                const voteCount = voteCounts[timestamp] || 0;
                                
                                return (
                                    <View
                                        key={timestamp}
                                        style={[
                                            styles.dateOption,
                                            isSelected && styles.dateOptionSelected
                                        ]}
                                    >
                                        <Pressable
                                            style={styles.dateOptionContent}
                                            onPress={() => handleToggleDateSelection(timestamp)}
                                        >
                                            <MaterialIcons
                                                name={isSelected ? "check-box" : "check-box-outline-blank"}
                                                size={24}
                                                color={isSelected ? "#5c8ed6" : "#666"}
                                            />
                                            <Text style={[
                                                styles.dateOptionText,
                                                isSelected && styles.dateOptionTextSelected
                                            ]}>
                                                {format(date, 'MMM d, yyyy h:mm a')}
                                            </Text>
                                            <View style={styles.voteCountContainer}>
                                                <MaterialIcons name="people" size={16} color="#666" />
                                                <Text style={styles.voteCountText}>{voteCount}</Text>
                                            </View>
                                        </Pressable>
                                        {canDelete && (
                                            <Pressable
                                                style={styles.deleteDateButton}
                                                onPress={() => handleDeleteCandidateDate(timestamp)}
                                            >
                                                <MaterialIcons name="close" size={20} color="#e74c3c" />
                                            </Pressable>
                                        )}
                                    </View>
                                );
                            })}
                        </>
                    ) : (
                        <Text style={styles.emptyText}>No candidate dates yet. Suggest a time below!</Text>
                    )}
                    
                    <View style={styles.suggestTimeContainer}>
                        <Text style={styles.suggestTimeLabel}>Suggest a New Time</Text>
                        <View style={styles.dateTimeContainer}>
                            <Pressable
                                style={styles.dateTimeButton}
                                onPress={() => {
                                    setPickerMode('date');
                                    setShowDatePicker(true);
                                }}
                            >
                                <Text style={styles.dateTimeButtonText}>
                                    {format(suggestedDate, 'MMM d, yyyy')}
                                </Text>
                            </Pressable>
                            <Pressable
                                style={styles.dateTimeButton}
                                onPress={() => {
                                    setPickerMode('time');
                                    setShowDatePicker(true);
                                }}
                            >
                                <Text style={styles.dateTimeButtonText}>
                                    {format(suggestedDate, 'h:mm a')}
                                </Text>
                            </Pressable>
                        </View>
                        {showDatePicker && (
                            <View style={styles.pickerContainer}>
                                <DateTimePicker
                                    value={suggestedDate}
                                    mode={pickerMode}
                                    is24Hour={false}
                                    onChange={onDatePickerChange}
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                />
                                {Platform.OS === 'ios' && (
                                    <View style={styles.pickerButtons}>
                                        <Pressable
                                            style={[styles.pickerButton, styles.cancelButton]}
                                            onPress={() => setShowDatePicker(false)}
                                        >
                                            <Text style={styles.buttonText}>Cancel</Text>
                                        </Pressable>
                                        <Pressable
                                            style={[styles.pickerButton, styles.saveButton]}
                                            onPress={handleSuggestNewTime}
                                        >
                                            <Text style={styles.buttonText}>Suggest</Text>
                                        </Pressable>
                                    </View>
                                )}
                            </View>
                        )}
                        {!showDatePicker && (
                            <Pressable
                                style={styles.suggestButton}
                                onPress={handleSuggestNewTime}
                            >
                                <Text style={styles.suggestButtonText}>Suggest This Time</Text>
                            </Pressable>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    // Info section rendering
    const renderInfoSection = () => {
        if (isEditingInfo) {
            return (
                <View style={styles.infoSection}>
                    <TextInput
                        style={styles.infoInput}
                        value={tentativeInfo}
                        onChangeText={setTentativeInfo}
                        multiline
                        placeholder="Add details, links, or notes about this hangout..."
                    />
                    <View style={styles.infoEditButtons}>
                        <Pressable
                            style={[styles.infoButton, styles.cancelButton]}
                            onPress={() => {
                                setIsEditingInfo(false);
                                setTentativeInfo(hangout?.info || '');
                            }}
                        >
                            <Text style={styles.buttonText}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.infoButton, styles.saveButton]}
                            onPress={handleUpdateInfo}
                        >
                            <Text style={styles.buttonText}>Save</Text>
                        </Pressable>
                    </View>
                </View>
            );
        }

        const info = hangout?.info;
        if (!info) {
            if (group?.members?.[userId]) {
                return (
                    <Pressable
                        style={styles.addInfoButton}
                        onPress={() => {
                            setTentativeInfo('');
                            setIsEditingInfo(true);
                        }}
                    >
                        <Text style={styles.addInfoText}>Add Info</Text>
                    </Pressable>
                );
            }
            return null;
        }

        return (
            <View style={styles.infoSection}>
                <View style={styles.infoContent}>
                    <Linkify 
                        linkStyle={styles.link}
                        linkDefault={true}
                    >
                        <Text style={styles.infoText}>
                            {info}
                        </Text>
                    </Linkify>
                </View>
                {group?.members?.[userId] && (
                    <Pressable
                        style={styles.editButton}
                        onPress={() => {
                            setTentativeInfo(info);
                            setIsEditingInfo(true);
                        }}
                    >
                        <MaterialIcons name="edit" size={20} color="#666" />
                    </Pressable>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <ScrollView 
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
            >
                <View style={styles.content}>
                    <View style={styles.hangoutTitleSection}>
                        <Text style={styles.hangoutTitle}>{hangout?.name}</Text>
                        {/*TODO: Hide the createdBy field and add another mechanism to see if the user can delete the hangout*/}
                        {hangout?.createdBy === userId && 
                         (Object.keys(attendees).length === 0 || 
                         (Object.keys(attendees).length === 1 && attendees[userId])) && (
                            <Pressable 
                                style={styles.deleteButton}
                                onPress={handleDelete}
                            >
                                <MaterialIcons name="delete" size={24} color="#e74c3c" />
                            </Pressable>
                        )}
                    </View>

                    <View style={styles.infoSection}>
                        <View style={styles.infoRow}>
                            <MaterialIcons name="schedule" size={24} color="#666" />
                            <Text style={styles.infoText}>
                                {hangout?.datetimePollInProgress ? 'TBD' : date.toLocaleString()}
                            </Text>
                            {!hangout?.datetimePollInProgress && hangout?.time && (
                                <Pressable
                                    style={styles.addToCalendarButton}
                                    onPress={handleAddToCalendar}
                                >
                                    <MaterialIcons name="event" size={20} color="#4CAF50" />
                                    <Text style={styles.addToCalendarText}>Add to Calendar</Text>
                                </Pressable>
                            )}
                        </View>

                        <View style={styles.infoRow}>
                            {group?.icon?.type === 'material' ? (
                                <MaterialIcons 
                                    name={group.icon.value as any} 
                                    size={24} 
                                    color="#666" 
                                />
                            ) : group?.icon?.type === 'image' ? (
                                <Image 
                                    source={{ uri: group.icon.value }}
                                    style={styles.groupIconImage}
                                />
                            ) : (
                                <MaterialIcons name="group" size={24} color="#666" />
                            )}
                            <Text style={styles.infoText}>
                                {group?.name || 'Loading...'}
                            </Text>
                        </View>

                        <View style={styles.infoRow}>
                            <MaterialIcons name="people" size={24} color="#666" />
                            <Text style={styles.infoText}>
                                {Object.keys(attendees).length} / {hangout?.minAttendees || 2} - {hangout?.maxAttendees || 8} attendees
                            </Text>
                        </View>

                        {hangout?.location && (
                            <View style={styles.infoRow}>
                                <MaterialIcons name="location-on" size={24} color="#666" />
                                {isUrl(hangout.location) ? (
                                    <Pressable onPress={handleLocationPress}>
                                        <Text style={[styles.infoText, styles.locationLink]}>
                                            {hangout.location}
                                        </Text>
                                    </Pressable>
                                ) : (
                                    <Text style={styles.infoText}>
                                        {hangout.location}
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>

                    {renderInfoSection()}

                    {renderPollingSection()}

                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>{isPast ? 'Who Went?' : 'Who\'s Going?'}</Text>
                            {!isPast && (
                                <Pressable 
                                    style={styles.addButton}
                                    onPress={handleShare}
                                >
                                    <MaterialIcons name="person-add" size={20} color="#5c8ed6" />
                                    <Text style={styles.addButtonText}>Invite</Text>
                                </Pressable>
                            )}
                        </View>
                        <View style={styles.attendeeList}>
                            {hangout?.createdAnonymously && Object.keys(attendees).length < (hangout.minAttendees || 2) ? (
                                <>
                                    {attendees[userId] && (
                                        <View style={styles.attendeeItem}>
                                            <MaterialIcons name="person" size={20} color="#666" style={styles.attendeeIcon} />
                                            <Text style={styles.attendeeName}>You</Text>
                                            {!isPast && (
                                                <Pressable 
                                                    style={styles.declineButton}
                                                    onPress={handleDecline}
                                                >
                                                    <MaterialIcons name="close" size={20} color="#e74c3c" />
                                                </Pressable>
                                            )}
                                        </View>
                                    )}
                                    <View style={styles.anonymousMessage}>
                                        <MaterialIcons name="visibility-off" size={20} color="#666" />
                                        <Text style={styles.emptyText}>
                                            Visible once {(hangout.minAttendees || 2) - Object.keys(attendees).length === 1 ? '1 more person joins' : `${(hangout.minAttendees || 2) - Object.keys(attendees).length} more people join`}
                                        </Text>
                                    </View>
                                </>
                            ) : (
                                <>
                                    {Object.values(attendees).map(user => (
                                        <View key={user.id} style={styles.attendeeItem}>
                                            <MaterialIcons name="person" size={20} color="#666" style={styles.attendeeIcon} />
                                            <Text style={styles.attendeeName}>{user.id === userId ? 'You' : user.name}</Text>
                                            {user.id === userId && !isPast && (
                                                <Pressable 
                                                    style={styles.declineButton}
                                                    onPress={handleDecline}
                                                >
                                                    <MaterialIcons name="close" size={20} color="#e74c3c" />
                                                </Pressable>
                                            )}
                                        </View>
                                    ))}
                                    {Object.keys(attendees).length === 0 && (
                                        <Text style={styles.emptyText}>No attendees yet</Text>
                                    )}
                                </>
                            )}
                        </View>
                    </View>
                </View>
            </ScrollView>
            {!isPast && !attendees[userId] && (
                <View style={styles.bottomContainer}>
                    <Pressable 
                        style={styles.rsvpButton}
                        onPress={handleRSVP}
                    >
                        <MaterialIcons name="check-circle" size={24} color="#fff" />
                        <Text style={styles.rsvpButtonText}>I'm in!</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        padding: 16,
        flexGrow: 1,
    },
    content: {
        flex: 1,
        padding: 16,
        paddingTop: 8,
    },
    bottomContainer: {
        padding: 16,
        paddingBottom: 32,
        backgroundColor: '#fff',
    },
    hangoutTitleSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    hangoutTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
        flex: 1,
    },
    infoSection: {
        backgroundColor: '#fff',
        padding: 15,
        marginVertical: 10,
        borderRadius: 8,
        position: 'relative',
        minHeight: 50,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
    },
    infoText: {
        fontSize: 16,
        color: '#2c3e50',
        flex: 1,
    },
    addToCalendarButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#e8f5e9',
        borderRadius: 8,
        marginLeft: 'auto',
    },
    addToCalendarText: {
        color: '#4CAF50',
        fontSize: 14,
        fontWeight: '600',
    },
    locationLink: {
        textDecorationLine: 'underline',
        color: '#5c8ed6',
    },
    section: {
        marginTop: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    closePollButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#e8f5e9',
        borderRadius: 8,
    },
    closePollButtonText: {
        color: '#4CAF50',
        fontSize: 14,
        fontWeight: '600',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
    },
    addButtonText: {
        color: '#5c8ed6',
        fontSize: 14,
        fontWeight: '500',
    },
    attendeeList: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
    },
    attendeeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 8,
    },
    attendeeIcon: {
        marginRight: 12,
    },
    attendeeName: {
        fontSize: 16,
        color: '#2c3e50',
        flex: 1,
    },
    emptyText: {
        color: '#666',
        textAlign: 'center',
        padding: 16,
    },
    anonymousMessage: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 16,
    },
    declineButton: {
        padding: 4,
        marginLeft: 8,
    },
    rsvpButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        paddingHorizontal: 24,
        backgroundColor: '#5c8ed6',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    rsvpButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    deleteButton: {
        padding: 8,
    },
    infoContent: {
        paddingRight: 40,
    },
    infoInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 4,
        padding: 10,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    infoEditButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
        gap: 10,
    },
    infoButton: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 4,
    },
    cancelButton: {
        backgroundColor: '#ddd',
    },
    saveButton: {
        backgroundColor: '#4CAF50',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '500',
    },
    editButton: {
        position: 'absolute',
        top: 0,
        right: 15,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addInfoButton: {
        backgroundColor: '#f5f5f5',
        padding: 15,
        marginVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    addInfoText: {
        color: '#666',
        fontWeight: '500',
    },
    link: {
        color: '#2196F3',
        textDecorationLine: 'underline',
    },
    groupIconImage: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    pollingContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        gap: 12,
    },
    dateOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        gap: 12,
    },
    dateOptionSelected: {
        backgroundColor: '#f0f5ff',
        borderColor: '#5c8ed6',
    },
    dateOptionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    dateOptionText: {
        fontSize: 16,
        color: '#2c3e50',
        flex: 1,
    },
    dateOptionTextSelected: {
        color: '#5c8ed6',
        fontWeight: '500',
    },
    deleteDateButton: {
        padding: 4,
        marginLeft: 8,
    },
    voteCountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginLeft: 8,
    },
    voteCountText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    suggestTimeContainer: {
        marginTop: 8,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        gap: 12,
    },
    suggestTimeLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
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
    pickerButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 12,
        gap: 12,
        width: '100%',
        paddingHorizontal: 12,
    },
    pickerButton: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 4,
    },
    suggestButton: {
        marginTop: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#5c8ed6',
        borderRadius: 8,
        alignItems: 'center',
    },
    suggestButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
}); 