import { useEffect, useState } from 'react';
import { Pressable, Text, StyleSheet, View, Platform } from 'react-native';
import { showMessage } from 'react-native-flash-message';
import AppDateTimePicker from './AppDateTimePicker';
import { format } from 'date-fns';
import {
    DURATION_OPTIONS,
    durationFromRange,
    endTimeFromStartAndDuration,
    isPresetDuration,
    MIN_DURATION_MINUTES,
} from '../../utils/duration';

type Props = {
    startTime: number;
    value: number;
    onChange: (minutes: number) => void;
    onPickerActive?: () => void;
};

function showPastEndTimeMessage() {
    if (Platform.OS !== 'android') {
        return;
    }

    showMessage({
        message: 'End time must be after the hangout starts',
        type: 'warning',
        duration: 3000,
    });
}

export default function DurationPicker({ startTime, value, onChange, onPickerActive }: Props) {
    const [mode, setMode] = useState<'preset' | 'custom'>(() =>
        isPresetDuration(value) ? 'preset' : 'custom'
    );
    const [endTime, setEndTime] = useState(() => endTimeFromStartAndDuration(startTime, value));
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [endPickerMode, setEndPickerMode] = useState<'date' | 'time'>('date');

    useEffect(() => {
        setEndTime(endTimeFromStartAndDuration(startTime, value));
        setMode(isPresetDuration(value) ? 'preset' : 'custom');
    }, [startTime, value]);

    const applyEndTime = (selectedEnd: Date): boolean => {
        const minimumEndTime = startTime + MIN_DURATION_MINUTES * 60 * 1000;
        if (selectedEnd.getTime() < minimumEndTime) {
            return false;
        }

        setMode('custom');
        setEndTime(selectedEnd);
        onChange(durationFromRange(startTime, selectedEnd.getTime()));
        return true;
    };

    const closeEndPicker = () => {
        setShowEndPicker(false);
        setEndPickerMode('date');
    };

    const selectPreset = (minutes: number) => {
        setMode('preset');
        closeEndPicker();
        onChange(minutes);
    };

    const selectCustom = () => {
        setMode('custom');
        setEndPickerMode('date');
        setShowEndPicker(true);
        onPickerActive?.();
    };

    const showEndTimePicker = () => {
        setEndPickerMode('date');
        setShowEndPicker(true);
        onPickerActive?.();
    };

    const onEndTimeChange = (_event: any, selectedEnd?: Date) => {
        if (!selectedEnd) {
            return;
        }

        if (Platform.OS === 'android') {
            if (endPickerMode === 'date') {
                const merged = new Date(endTime);
                merged.setFullYear(
                    selectedEnd.getFullYear(),
                    selectedEnd.getMonth(),
                    selectedEnd.getDate(),
                );

                const latestOnSelectedDay = new Date(merged);
                latestOnSelectedDay.setHours(23, 59, 59, 999);
                const minimumEndTime = startTime + MIN_DURATION_MINUTES * 60 * 1000;

                if (latestOnSelectedDay.getTime() < minimumEndTime) {
                    showPastEndTimeMessage();
                    closeEndPicker();
                    return;
                }

                setEndTime(merged);
                setEndPickerMode('time');
                return;
            }

            closeEndPicker();

            const merged = new Date(endTime);
            merged.setHours(selectedEnd.getHours(), selectedEnd.getMinutes(), 0, 0);
            if (!applyEndTime(merged)) {
                showPastEndTimeMessage();
            }
            return;
        }

        applyEndTime(selectedEnd);
    };

    const onEndPickerDismiss = () => {
        closeEndPicker();
    };

    const customLabel = 'Custom';

    return (
        <View style={styles.container}>
            <View style={styles.chips}>
                {DURATION_OPTIONS.map(({ label, minutes }) => {
                    const selected = mode === 'preset' && value === minutes;

                    return (
                        <Pressable
                            key={minutes}
                            style={[styles.chip, selected && styles.chipSelected]}
                            onPress={() => selectPreset(minutes)}
                        >
                            <Text
                                style={[styles.chipText, selected && styles.chipTextSelected]}
                                numberOfLines={1}
                            >
                                {label}
                            </Text>
                        </Pressable>
                    );
                })}
                <Pressable
                    style={[styles.chip, mode === 'custom' && styles.chipSelected]}
                    onPress={selectCustom}
                >
                    <Text
                        style={[styles.chipText, mode === 'custom' && styles.chipTextSelected]}
                        numberOfLines={1}
                    >
                        {customLabel}
                    </Text>
                </Pressable>
            </View>

            {mode === 'custom' && (
                <>
                    <Pressable style={styles.endTimeButton} onPress={showEndTimePicker}>
                        <Text style={styles.endTimeLabel}>Ends</Text>
                        <Text style={styles.endTimeValue}>{format(endTime, 'PPp')}</Text>
                    </Pressable>

                    {showEndPicker && (
                        <View style={styles.pickerContainer}>
                            <AppDateTimePicker
                                value={endTime}
                                mode={Platform.OS === 'ios' ? 'datetime' : endPickerMode}
                                is24Hour={false}
                                minimumDate={new Date(startTime + MIN_DURATION_MINUTES * 60 * 1000)}
                                onChange={onEndTimeChange}
                                onDismiss={onEndPickerDismiss}
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            />
                        </View>
                    )}
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 8,
    },
    chips: {
        flexDirection: 'row',
        gap: 4,
    },
    chip: {
        flex: 1,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 16,
        paddingHorizontal: 4,
        paddingVertical: 8,
        backgroundColor: '#fff',
    },
    chipSelected: {
        borderColor: '#5c8ed6',
        backgroundColor: '#f0f5ff',
    },
    chipText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    chipTextSelected: {
        color: '#5c8ed6',
        fontWeight: '600',
    },
    endTimeButton: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#fff',
    },
    endTimeLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    endTimeValue: {
        fontSize: 16,
        color: '#2c3e50',
    },
    pickerContainer: {
        paddingVertical: Platform.OS === 'ios' ? 12 : 0,
        alignItems: 'center',
        borderWidth: Platform.OS === 'ios' ? 1 : 0,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: Platform.OS === 'ios' ? '#f9f9f9' : 'transparent',
    },
});
