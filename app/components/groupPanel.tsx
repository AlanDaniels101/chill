import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { Group } from '../../types'
import React, { useEffect, useRef, useState } from 'react'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { getDatabase } from '@react-native-firebase/database'
import { format } from 'date-fns'

const OPEN_TIMEOUT_MS = 2000;

interface GroupPanelProps {
    group: Group
}

const GroupPanel: React.FC<GroupPanelProps> = ({group}) => {
    const router = useRouter();
    const defaultIcon = { type: 'material' as const, value: 'groups' };
    const icon = group.icon || defaultIcon;
    const [nextHangout, setNextHangout] = useState<{ name: string; time: number } | null>(null);
    const [hangoutCount, setHangoutCount] = useState(0);
    const [isOpening, setIsOpening] = useState(false);
    const memberCount = Object.keys(group.members || {}).length;
    const imageReadyRef = useRef(icon.type !== 'image');
    const readyWaiters = useRef<Array<() => void>>([]);
    const seenIconValue = useRef(icon.value);

    if (seenIconValue.current !== icon.value) {
        seenIconValue.current = icon.value;
        imageReadyRef.current = icon.type !== 'image';
    }

    const markImageReady = () => {
        imageReadyRef.current = true;
        readyWaiters.current.forEach((resolve) => resolve());
        readyWaiters.current = [];
    };

    const waitForListImage = () =>
        new Promise<boolean>((resolve) => {
            if (imageReadyRef.current) {
                resolve(true);
                return;
            }
            const timer = setTimeout(() => resolve(false), OPEN_TIMEOUT_MS);
            readyWaiters.current.push(() => {
                clearTimeout(timer);
                resolve(true);
            });
        });

    useEffect(() => {
        const hangoutIds = Object.keys(group.hangouts || {});
        setHangoutCount(hangoutIds.length);
        
        if (hangoutIds.length === 0) {
            setNextHangout(null);
            return;
        }

        // Find the next upcoming hangout
        const now = Date.now();
        const promises = hangoutIds.map(id => 
            getDatabase().ref(`/hangouts/${id}`).once('value')
        );

        Promise.all(promises).then(snapshots => {
            const hangouts = snapshots
                .map(snap => ({ id: snap.key, ...snap.val() }))
                .filter(h => {
                    // Only include hangouts with a set time or polling in progress
                    return h.time || h.datetimePollInProgress;
                })
                .sort((a, b) => {
                    // Prioritize future events
                    const aTime = a.time || Infinity;
                    const bTime = b.time || Infinity;
                    const aIsFuture = aTime > now;
                    const bIsFuture = bTime > now;
                    
                    if (aIsFuture && !bIsFuture) return -1;
                    if (!aIsFuture && bIsFuture) return 1;
                    if (aIsFuture && bIsFuture) return aTime - bTime;
                    return bTime - aTime; // Past events, most recent first
                });

            if (hangouts.length > 0 && (hangouts[0].time || hangouts[0].datetimePollInProgress)) {
                const first = hangouts[0];
                if (first.time && first.time > now) {
                    setNextHangout({ name: first.name, time: first.time });
                } else if (first.datetimePollInProgress) {
                    setNextHangout({ name: first.name, time: 0 }); // Special case for polling
                } else {
                    setNextHangout(null);
                }
            } else {
                setNextHangout(null);
            }
        });
    }, [group.hangouts]);

    const formatNextHangout = () => {
        if (!nextHangout) return null;
        if (nextHangout.time === 0) return 'Polling dates...';
        return format(new Date(nextHangout.time), 'MMM d, h:mm a');
    };

    const openGroup = async () => {
        if (isOpening) return;

        const needsWait = icon.type === 'image' && !imageReadyRef.current;
        if (needsWait) setIsOpening(true);

        try {
            let iconCached = icon.type !== 'image' || imageReadyRef.current;
            if (needsWait) {
                iconCached = await waitForListImage();
            }
            router.push({
                pathname: '/(tabs)/(groups)/group/[id]',
                params: {
                    id: group.id,
                    name: group.name,
                    iconType: icon.type,
                    iconValue: icon.value,
                    iconCached: iconCached ? '1' : '0',
                },
            });
        } finally {
            if (needsWait) setIsOpening(false);
        }
    };

    return (
        <Pressable style={styles.container} onPress={openGroup} disabled={isOpening}>
            <View style={styles.iconContainer}>
                {icon.type === 'material' ? (
                    <MaterialIcons 
                        name={icon.value as any} 
                        size={40} 
                        color="#fff" 
                    />
                ) : (
                    <Image 
                        source={{ uri: icon.value }}
                        style={styles.iconImage}
                        fadeDuration={0}
                        onLoad={markImageReady}
                    />
                )}
            </View>
            <View style={styles.content}>
                <Text style={styles.name} numberOfLines={1}>{group.name}</Text>
                <View style={styles.stats}>
                    <View style={styles.statItem}>
                        <MaterialIcons name="event" size={14} color="#666" />
                        <Text style={styles.statText}>{hangoutCount}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <MaterialIcons name="people" size={14} color="#666" />
                        <Text style={styles.statText}>{memberCount}</Text>
                    </View>
                </View>
                {nextHangout && (
                    <View style={styles.nextHangout}>
                        <MaterialIcons name="schedule" size={12} color="#5c8ed6" />
                        <Text style={styles.nextHangoutText} numberOfLines={1}>
                            {nextHangout.name} • {formatNextHangout()}
                        </Text>
                    </View>
                )}
            </View>
            {isOpening ? (
                <ActivityIndicator size="small" color="#5c8ed6" />
            ) : (
                <MaterialIcons name="chevron-right" size={24} color="#ccc" />
            )}
        </Pressable>
    )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5c8ed6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5c8ed6',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  iconImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  content: {
    flex: 1,
    gap: 8,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  nextHangout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  nextHangoutText: {
    fontSize: 12,
    color: '#5c8ed6',
    fontWeight: '500',
    flex: 1,
  },
});

export default GroupPanel