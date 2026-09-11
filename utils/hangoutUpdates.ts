import { Alert } from 'react-native';

export function countOtherAttendees(
    attendees: { [key: string]: boolean } | undefined,
    userId: string,
): number {
    if (!attendees) {
        return 0;
    }
    return Object.keys(attendees).filter((uid) => uid !== userId).length;
}

export function confirmAttendeeNotification(
    actionLabel: string,
    othersCount: number,
    onConfirm: () => void | Promise<void>,
): void {
    if (othersCount === 0) {
        void Promise.resolve(onConfirm());
        return;
    }

    const noun = othersCount === 1 ? 'person has' : 'people have';
    Alert.alert(
        `${actionLabel}?`,
        `${othersCount} ${noun} RSVP'd. They'll be notified.`,
        [
            { text: 'Cancel', style: 'cancel' },
            { text: actionLabel, onPress: () => void onConfirm() },
        ],
    );
}
