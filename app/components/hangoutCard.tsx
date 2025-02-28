import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Hangout } from '../../types';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { formatDistanceToNow, format } from 'date-fns';

interface Props {
    hangout: Hangout;
}

export default function HangoutCard({ hangout }: Props) {
    const router = useRouter();
    const date = new Date(hangout.time);
    const isPast = date < new Date();

    return (
        <Pressable 
            style={[
                styles.container, 
                isPast && styles.pastContainer
            ]}
            onPress={() => {
                router.push(`/hangout/${hangout.id}?name=${hangout.name}`);
            }}
        >
            <MaterialIcons 
                name="event" 
                size={24} 
                color={isPast ? '#777' : '#666'}
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
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
    },
    pastContainer: {
        backgroundColor: '#d0d0d0',
        opacity: 0.9,
    },
    icon: {
        marginRight: 16,
    },
    info: {
        flex: 1,
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
}); 