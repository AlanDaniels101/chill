/** Base URL for App Links / Universal Links (https). Used for sharing and deep links. */
export const APP_LINK_BASE = 'https://chillhangouts.ca/app';

export function hangoutLink(hangoutId: string): string {
  return `${APP_LINK_BASE}/hangout/${hangoutId}`;
}

export function joinGroupLink(groupId: string): string {
  return `${APP_LINK_BASE}/join-group/${groupId}`;
}
