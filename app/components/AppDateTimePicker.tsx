import DateTimePicker, {
    DateTimePickerEvent,
    DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';
import { ComponentProps } from 'react';
import { Platform } from 'react-native';

type Props = ComponentProps<typeof DateTimePicker>;

export default function AppDateTimePicker({
    onChange,
    onValueChange,
    onDismiss,
    value,
    ...props
}: Props) {
    const handleValueChange = (event: DateTimePickerChangeEvent, date: Date) => {
        onValueChange?.(event, date);
        onChange?.(
            { type: 'set', nativeEvent: event.nativeEvent },
            date,
        );
    };

    const handleDismiss = () => {
        onDismiss?.();
        onChange?.(
            {
                type: 'dismissed',
                nativeEvent: {
                    timestamp: value.getTime(),
                    utcOffset: value.getTimezoneOffset(),
                },
            },
            undefined,
        );
    };

    return (
        <DateTimePicker
            {...props}
            value={value}
            onValueChange={handleValueChange}
            onDismiss={handleDismiss}
            {...(Platform.OS === 'ios' && {
                themeVariant: 'light',
                textColor: '#2c3e50',
            })}
        />
    );
}

export type { DateTimePickerEvent };
