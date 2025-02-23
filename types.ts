export type Hangout = {
    id: string;
    name: string;
    group: string;
    time: number;
}

export type GroupIcon = {
  type: 'material' | 'image';
  value: string;  // icon name for material, URL for image
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
};

