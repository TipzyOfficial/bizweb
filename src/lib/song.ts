import { BarType } from "./bar";

export type PlayableType = {
    active: boolean,
    amountBid: number,
    minPrice: number,
    id: number,
    artistId: number,
    position: number,
    song: SongType,
    lastModified: Date,
    status: "ACCEPTED" | "REJECTED" | "LISTED" | "PENDING" | "REFUNDED" | "PLAYED" | "LISTED_ALTERED" | "LOCKED",
    tipperRelevant: boolean,
}

export type SongType = {
    id: string; //ID of song
    title: string, //song's title
    artists: string[], //song's artist
    albumart: string, //image url of the song's album art. small
    albumartbig?: string, //image url of the song's album art. large
    duration?: number; //duration of song in ms. ignore
    explicit: boolean; //if the song is marked as explicit
    manuallyQueued?: boolean; //if the song was manually queued (only for Queue)
}

export type AlbumType = {
    title: string,
    artists: string[],
    albumart: string,
    id: string,
    year: string,
}

export type ArtistType = {
    name: string,
    image: string,
    id: string,
}

export type PlaylistType = {
    id: string,
    name: string,
    image: string,
}


export function songIsEqual(s1: SongType, s2: SongType): boolean {
    return s1.id === s2.id;
}

export function songListIsEqual(s1: SongType[], s2: SongType[]): boolean {
    if (s1.length !== s2.length) return false;
    for (let i = 0; i < s1.length; i++) {
        if (!songIsEqual(s1[i], s2[i])) {
            return false;
        }
    }
    return true;
}

export type SongRequestStatusType = "ACCEPTED" | "REJECTED" | "PENDING" | "CANCELED" | "EXPIRED";

export type SongRequestType = {
    user: {
        first_name: string,
        last_name: string,
        email: string
    },
    id: number,
    song: SongType,
    price: number,
}