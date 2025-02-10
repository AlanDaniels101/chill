export type Hangout = {
    id: string;
    name: string;
    group: string;
    time: number;
}

export type Group = {
    id: string;
    name: string;
    hangouts: {
        [id: string]: boolean;
    }
};

