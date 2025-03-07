export type Hangout = {
    id: string;
    name: string;
    group: string;
    time: number;
    attendees?: {
        [uid: string]: boolean;
    };
}

export type GroupIcon = {
  type: 'material' | 'image';
  value: string;  // icon name for material, URL for image
};

export type User = {
    id: string;
    name: string;
    fcmToken?: string;
    groups?: {
        [groupId: string]: boolean;  // Groups the user belongs to
    };
};

export type Group = {
    id: string;
    name: string;
    icon?: GroupIcon;
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

