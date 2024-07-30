import { createContext, useEffect, useRef, useState } from 'react';
import { Business, Users } from './user'
import { SongRequestType, SongType } from './song';
import { Logout, checkIfAccountExists, consumerFromJSON, fetchWithToken, rootGetRefreshToken, storeTokens } from '../index'
import { BarType, LiveArtistType } from './bar';
import { DisplayOrLoading } from '../components/DisplayOrLoading';
import Cookies from 'universal-cookie';
import { useLocation } from 'react-router-dom';
import { getCookies, getStored } from './utils';
import { fetchBarInfo } from '../pages/bar/Bar';
import _ from 'lodash';

export const defaultConsumer: () => Business = () => {
    const cookies = getCookies();
    return new Business(new Users(getStored("access_token") ?? "", parseInt(getStored("expires_at") ?? "0") ?? 0, ""))
}

export type ArtistStateType = {
    artist?: LiveArtistType,
    setArtist: (artist: LiveArtistType | undefined) => void
}

export type BarStateType = {
    bar?: BarType,
    setBar: (bar: BarType | undefined) => void
}

export type UserSessionContextType = {
    user: Business,
    setUser: (user: Business) => void; //do we even need this? or can i just load for asyncstorage
    barState: BarStateType;
    artistState: ArtistStateType;
    abortController?: AbortController;
}

const initBar = async (id?: number) => {
    return id ? fetchBarInfo(DefaultUserSessionContext, id, true) : undefined;
}

const initArtist = async (id?: number): Promise<LiveArtistType | undefined> => {
    return id ? { id: id, name: "", allowingRequests: false, minPrice: -1 } : undefined
    // fetchArtistInfo(DefaultUserSessionContext, id, true) : undefined;
}

export const DefaultUserSessionContext: UserSessionContextType = {
    user: new Business(new Users("", 0, "")),
    setUser: () => { },
    barState: {
        bar: undefined, setBar: () => { }
    },
    artistState: {
        artist: undefined, setArtist: () => { }
    },
}

// export const getStartingUser = async (): Promise<Business> => {
//     const cookies = getCookies();
//     const rt = cookies.get("refresh_token");
//     const dc = defaultConsumer();
//     // const ea = cookies.get("expires_at");
//     if(rt === null) return dc;
//     return checkIfAccountExists(dc).then(r => {
//         if(r.result){
//             return consumerFromJSON(undefined, r.data);
//         }
//         cookies.remove("refresh_token"); //bad refresh
//         cookies.remove("access_token"); //bad refresh
//         return dc;
//     })
// }


export const UserSessionContext = createContext<UserSessionContextType>(DefaultUserSessionContext);

export const getPending = async (usc: UserSessionContextType, ignoreReqs?: boolean): Promise<[SongRequestType[], number]> => {
    const p: SongRequestType[] = [];
    let ptc: number = 0;
    await fetchWithToken(usc, `tipper/requests/pending/`, 'GET').then(r => {
        return r.json();
    })
        .then(json => {
            const reqs = json.data;
            reqs.forEach((e: any) => {
                const sj = e.song_json;
                const bi = e.business_info;
                const s: SongType = { id: sj.id, title: sj.name, artists: [sj.artist], albumart: sj.image_url, explicit: false };
                const b: BarType = { id: bi.id, name: bi.business_name, type: bi.business_type, image_url: bi.image_url, description: bi.description, active: bi.active, allowingRequests: bi.allowing_requests }
                ptc += e.token_count ?? 0;
                p.push({ id: e.id, song: s, status: e.status, bar: b, date: new Date(e.request_time) })
            })
        })
        .catch((e: Error) => { console.log("problem getting pending: ", e) });

    return [p, ptc];
}

export function UserSessionContextProvider(props: { children: JSX.Element }) {
    const cookies = getCookies();
    const dc = defaultConsumer();
    const [user, setUser] = useState<Business>(dc);
    const [bar, setBar] = useState<BarType | undefined>();
    const [artist, setArtist] = useState<LiveArtistType | undefined>();
    const [ready, setReady] = useState(false);
    const abortController = new AbortController();
    // const signal = abortController.signal;

    const editUser = (user: Business) => {
        // console.log("usc edit to", user);
        // storeTokens(user.user.access_token, cookies.get("refresh_token"), user.expires_at);
        setUser(user);
    }

    const editBar = (bar: BarType | undefined) => {
        if (bar) cookies.set("bar_session", bar.id);
        setBar(bar);
    }

    const editArtist = (artist: LiveArtistType | undefined) => {
        if (artist) cookies.set("artist_session", artist.id);
        setArtist(artist);
    }

    //10s refresh token data
    // const refreshRate = 10000;

    const refreshUserData = (user: Business) => {
        const c = _.cloneDeep(user);
        editUser(c);
    }

    const usc: UserSessionContextType = { user: user, setUser: editUser, barState: { bar: bar, setBar: editBar }, artistState: { artist: artist, setArtist: editArtist }, abortController: abortController };

    const setup = async () => {
        const queryParameters = new URLSearchParams(window.location.search);

        const pathname = window.location.pathname;

        let barid = cookies.get("bar_session") ?? undefined;
        let artistid = cookies.get("artist_session") ?? undefined;

        if (pathname === "/bar") {
            barid = queryParameters.get("id") ?? barid;
            if (barid) cookies.set("bar_session", barid);
        } else if (pathname === "/artist") {
            artistid = queryParameters.get("id") ?? artist;
            if (artistid) cookies.set("artist_session", artistid);
        }

        if (barid) {
            const bar = await initBar(barid);
            if (bar) setBar(bar);
        }
        if (artistid) {
            const artist = await initArtist(artistid);
            if (artist) setArtist(artist);
        }

        if (!getStored("refresh_token") || !getStored("access_token")) {
            if (usc.user.user.access_token) {
                checkIfAccountExists(usc).then((r) => {
                    console.log("rdata", r.data)
                    refreshUserData(r.data)
                    setReady(true);
                })
                    .catch((e) => {
                        console.log("no session detected." + e)
                        setReady(true)
                    });
            } else {
                setReady(true)
            }
        } else {
            refreshUserData(user);
            checkIfAccountExists(usc).then((r) => {
                if (!r.result) {
                    console.log("account doesn't exist, logging out.")
                    Logout(usc);
                    setReady(true);
                    return;
                }
                refreshUserData(r.data)
                setReady(true);
            })
                .catch((e) => {
                    console.log("problem init user." + e)
                    setReady(true)
                });
        }

    }

    useEffect(() => {
        setup();
        // if(location.pathname === "/login" || location.pathname === "/register") return;
    }, []);

    // useInterval(() => setTokenPendingData({user, setUser, barState}), refreshRate);

    return (
        <UserSessionContext.Provider value={usc}>
            <DisplayOrLoading condition={ready}>
                {props.children}
            </DisplayOrLoading>
        </UserSessionContext.Provider>
    )
}