export type Hangout = {
    id: string;
    name: string;
    group: string;
    time?: number;
    datetimePollInProgress?: boolean;
    candidateDates?: {
        [timestamp: string]: string;  // timestamp (as string) -> userId who suggested it
    };
    datePollSelections?: {
        [uid: string]: number[];  // User ID to array of selected candidate date timestamps
    };
    attendees?: {
        [uid: string]: boolean;
    };
    minAttendees?: number;
    maxAttendees?: number;
    createdBy?: string;
    createdAnonymously?: boolean;
    location?: string;
    info?: string;  // For additional details, links, etc.
};

export type GroupIcon = {
  type: 'material' | 'image';
  value: string;  // icon name for material, URL for image
};

export type User = {
    id: string;
    name: string;
    fcmToken?: string;
    hasSetName?: boolean;  // Whether user has set their own name (not default)
    groups?: {
        [groupId: string]: boolean;  // Groups the user belongs to
    };
};

export type Group = {
    id: string;
    name: string;
    icon?: GroupIcon;
    info?: string;
    hangouts: {
        [id: string]: boolean;
    };
    admins: {
        [uid: string]: boolean;
    };
    members: {
        [uid: string]: boolean;  // Users who are members of this group
    };
};

