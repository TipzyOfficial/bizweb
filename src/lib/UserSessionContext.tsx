import { createContext, useEffect, useRef, useState } from 'react';
import { Business, Users } from './user'
import { SongRequestType, SongType } from './song';
import { Logout, checkIfAccountExists, businessFromJSON, fetchWithToken, rootGetRefreshToken, storeTokens } from '../index'
import { BarType, LiveArtistType } from './bar';
import { DisplayOrLoading } from '../components/DisplayOrLoading';
import Cookies from 'universal-cookie';
import { useLocation } from 'react-router-dom';
import { getCookies, getStored } from './utils';
import _ from 'lodash';
import { error } from 'console';

export const defaultConsumer: () => Business = () => {
    const expiresat = parseInt(getStored("expires_at") ?? "0");
    return new Business(new Users(getStored("access_token") ?? "", expiresat ?? 0, ""))
}

export type UserSessionContextType = {
    user: Business,
    setUser: (user: Business) => void; //do we even need this? or can i just load for asyncstorage
    abortController?: AbortController;
}

export const DefaultUserSessionContext: UserSessionContextType = {
    user: new Business(new Users("", 0, "")),
    setUser: () => { }
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

    const usc: UserSessionContextType = { user: user, setUser: editUser, abortController: abortController };

    const setup = async () => {
        if (!getStored("refresh_token") || !getStored("access_token")) {
            if (usc.user.user.access_token) {
                const r = await checkIfAccountExists(usc).catch((e: Error) => { throw new Error(`USC: no session detected. ${e.message}`) })
                console.log("rdata", r.data)
                refreshUserData(r.data)
                setReady(true);
            } else {
                setReady(true);
            }
        } else {
            refreshUserData(user);
            const r = await checkIfAccountExists(usc).catch((e: Error) => { throw new Error(`USC: problem init user. ${e.message}`) });
            if (!r.result) {
                console.log("account doesn't exist, logging out.")
                Logout(usc);
                setReady(true);
                return;
            }
            refreshUserData(r.data)
            setReady(true);
        }

    }

    useEffect(() => {
        setup().catch((e) => {
            console.log(e);
            setReady(true)
        });
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