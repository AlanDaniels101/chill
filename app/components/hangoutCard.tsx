import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Hangout } from '../../types';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { formatDistanceToNow, format } from 'date-fns';
import * as Linking from 'expo-linking';

interface Props {
    hangout: Hangout;
}

export default function HangoutCard({ hangout }: Props) {
    const router = useRouter();
    const date = new Date(hangout.time);
    const isPast = date < new Date();
    
    const currentAttendees = Object.keys(hangout.attendees || {}).length;
    const needsMoreAttendees = currentAttendees < (hangout.minAttendees || 2);

    const isUrl = (text: string): boolean => {
        const trimmed = text.trim();
        return trimmed.startsWith('http://') || 
               trimmed.startsWith('https://') || 
               trimmed.startsWith('maps://');
    };

    const handleLocationPress = () => {
        if (!hangout.location) return;
        
        let urlToOpen = hangout.location.trim();
        
        // Ensure URL has a protocol
        if (!urlToOpen.startsWith('http://') && !urlToOpen.startsWith('https://') && !urlToOpen.startsWith('maps://')) {
            urlToOpen = `https://${urlToOpen}`;
        }
        
        Linking.openURL(urlToOpen).catch(() => {
            Alert.alert('Error', 'Unable to open link');
        });
    };

    return (
        <Pressable 
            style={[
                styles.container, 
                isPast && styles.pastContainer,
                !isPast && needsMoreAttendees && styles.tentativeContainer
            ]}
            onPress={() => {
                router.push({
                    pathname: "/(tabs)/(groups)/hangout/[id]",
                    params: { id: hangout.id, name: hangout.name }
                });
            }}
        >
            {!isPast && needsMoreAttendees && (
                <View style={styles.tentativeBadge}>
                    <Text style={styles.tentativeText}>Needs {(hangout.minAttendees || 2) - currentAttendees} More</Text>
                </View>
            )}
            <MaterialIcons 
                name={isPast ? "event" : "auto-awesome"} 
                size={24} 
                color={isPast ? '#777' : '#ffa726'}
                style={styles.icon} 
            />
            <View style={styles.info}>
                <Text style={[
                    styles.name,
                    isPast && { color: '#666' }
                ]}>
                    {hangout.name || 'NO NAME'}
                </Text>
                <Text style={[
                    styles.time,
                    isPast && { color: '#888' }
                ]}>
                    {isPast 
                        ? formatDistanceToNow(date, { addSuffix: true })
                        : format(date, 'PPp')}
                </Text>
                {hangout.location && (
                    <View style={styles.locationContainer}>
                        <MaterialIcons 
                            name="location-on" 
                            size={14} 
                            color={isPast ? '#888' : '#666'} 
                            style={styles.locationIcon} 
                        />
                        {isUrl(hangout.location) ? (
                            <Pressable onPress={handleLocationPress}>
                                <Text style={[
                                    styles.location,
                                    styles.locationLink,
                                    isPast && { color: '#888' }
                                ]}>
                                    {hangout.location}
                                </Text>
                            </Pressable>
                        ) : (
                            <Text style={[
                                styles.location,
                                isPast && { color: '#888' }
                            ]}>
                                {hangout.location}
                            </Text>
                        )}
                    </View>
                )}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 12,
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
        shadowColor: '#000',
    },
    pastContainer: {
        backgroundColor: '#d0d0d0',
        opacity: 0.9,
        shadowColor: '#666',
    },
    tentativeContainer: {
        backgroundColor: '#fff3e0',
        borderWidth: 2,
        borderColor: '#ff9800',
        shadowColor: '#ff9800',
    },
    tentativeBadge: {
        position: 'absolute',
        top: 4,
        right: 6,
        backgroundColor: '#ff9800',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    tentativeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    icon: {
        marginRight: 16,
    },
    info: {
        flex: 1,
        minHeight: 60,
        justifyContent: 'center',
    },
    name: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000',
    },
    time: {
        fontSize: 14,
        color: '#333',
        marginTop: 4,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    locationIcon: {
        marginRight: 4,
    },
    location: {
        fontSize: 12,
        color: '#666',
    },
    locationLink: {
        textDecorationLine: 'underline',
        color: '#5c8ed6',
    },
}); 