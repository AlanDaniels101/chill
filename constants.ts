/** Base URL for App Links / Universal Links (https). Used for sharing and deep links. */
export const APP_LINK_BASE = 'https://chillhangouts.ca/app';

export const HANGOUT_NOTIFICATION_TYPES = [
    'new_hangout',
    'poll_closed',
    'time_changed',
    'duration_changed',
] as const;

export type HangoutNotificationType = (typeof HANGOUT_NOTIFICATION_TYPES)[number];

export function isHangoutNotificationType(type: unknown): type is HangoutNotificationType {
    return typeof type === 'string' && (HANGOUT_NOTIFICATION_TYPES as readonly string[]).includes(type);
}

export function hangoutLink(hangoutId: string): string {
  return `${APP_LINK_BASE}/hangout/${hangoutId}`;
}

export function joinGroupLink(groupId: string): string {
  return `${APP_LINK_BASE}/join-group/${groupId}`;
}
