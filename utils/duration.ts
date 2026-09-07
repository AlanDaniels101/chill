import { format, isSameDay } from 'date-fns';

export const DEFAULT_DURATION_MINUTES = 60;
export const MIN_DURATION_MINUTES = 1;

export const DURATION_OPTIONS = [
    { label: '30 min', minutes: 30 },
    { label: '1 hr', minutes: 60 },
    { label: '2 hr', minutes: 120 },
    { label: 'All day', minutes: 1440 },
] as const;

export function getDurationMinutes(durationMinutes?: number): number {
    return durationMinutes ?? DEFAULT_DURATION_MINUTES;
}

export function isPresetDuration(minutes: number): boolean {
    return DURATION_OPTIONS.some((entry) => entry.minutes === minutes);
}

export function durationFromRange(startTime: number, endTime: number): number {
    return Math.max(MIN_DURATION_MINUTES, Math.round((endTime - startTime) / (60 * 1000)));
}

export function endTimeFromStartAndDuration(startTime: number, durationMinutes: number): Date {
    return new Date(startTime + getDurationMinutes(durationMinutes) * 60 * 1000);
}

export function formatDurationLabel(minutes: number): string {
    const option = DURATION_OPTIONS.find((entry) => entry.minutes === minutes);
    if (option) {
        return option.label;
    }

    if (minutes < 60) {
        return `${minutes} min`;
    }

    if (minutes % 60 === 0) {
        return `${minutes / 60} hr`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} hr ${remainingMinutes} min`;
}

export function formatTimeRange(startTime: number, durationMinutes?: number): string {
    const duration = getDurationMinutes(durationMinutes);
    const start = new Date(startTime);
    const end = new Date(startTime + duration * 60 * 1000);

    if (isSameDay(start, end)) {
        return `${format(start, 'PPp')} - ${format(end, 'p')}`;
    }

    return `${format(start, 'PPp')} - ${format(end, 'PPp')}`;
}
