import { Spinner } from "react-bootstrap";
import { DisplayOrLoading } from "../../components/DisplayOrLoading";
import { Colors, padding } from "../../lib/Constants";
import { useContext, useEffect, useState } from "react";
import { UserSessionContext, UserSessionContextType } from "../../lib/UserSessionContext";
import ProfileButton from "../../components/ProfileButton";
import Queue from "./Queue";
import { fetchWithToken, getBusiness } from "../..";
import { SongRequestType, SongType } from "../../lib/song";
import { getCookies, parseSongJson, useInterval } from "../../lib/utils";
import _, { pad } from "lodash";
import { Business } from "../../lib/user";
import BigLogo, { SmallLogo } from "../../components/BigLogo";

const cookies = getCookies();

const LoadingScreen = () =>
    <div className="App-header">
        <Spinner style={{ color: Colors.primaryRegular, width: 75, height: 75 }} />
        <br></br>
        <span>Loading bar information...</span>
    </div>;

export default function Dashboard() {

    const usc = useContext(UserSessionContext);
    const bar = usc.user;
    const [ready, setReady] = useState(true);
    const [currentlyPlaying, setCurrentlyPlaying] = useState<SongType | undefined>();
    const [queue, setQueue] = useState<SongType[] | undefined>([]);

    const deletedCheckAgain = 30000;
    const [deletedIds, setDeletedIds] = useState<Map<number, number>>(new Map<number, number>());
    const [toggleAllowRequests, setToggleAllowRequests] = useState(usc.user.allowing_requests);
    const [toggleAutoRequests, setToggleAutoRequests] = useState(usc.user.auto_accept_requests)

    const setToggles = (allow: boolean, auto: boolean) => {
        console.log("b", allow)
        if (allow !== toggleAllowRequests) setToggleAllowRequests(allow);
        if (auto !== toggleAutoRequests) setToggleAutoRequests(auto);
    }

    const refreshAllData = async () => {
        console.log("refreshing all");

        //queue
        const [cur, q] = await getQueue(usc);
        if (!_.isEqual(cur, currentlyPlaying)) setCurrentlyPlaying(cur);
        if (!_.isEqual(q, queue)) setQueue(q);

        //toggles
    }

    // useEffect(() => {
    //     init();
    // }, [])

    useInterval(refreshAllData, 5000, 500);

    const Requests = () => {
        return (
            <div style={{ width: "100%", height: "100%" }}>
                <div className="App-headertop">
                    <span className="App-subtitle" style={{ paddingBottom: padding, width: "100%", textAlign: "center" }}>Requests</span>
                </div>
            </div>
        )
    }

    return (
        <DisplayOrLoading condition={ready} loadingScreen={<LoadingScreen />}>
            <div className="App-body-top">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: "100%", padding: padding, backgroundColor: "#0001" }}>
                    <SmallLogo />
                    <ProfileButton position="relative" name={bar.business_name}></ProfileButton>
                </div>
                <div className="App-dashboard-grid">
                    <div style={{ paddingLeft: padding, paddingRight: padding }}>
                        <div style={{ paddingBottom: padding }} />
                        <Queue queue={queue} current={currentlyPlaying} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: "#0003" }}>
                        <div style={{ paddingBottom: padding }} />
                        <div style={{ flex: 1 }}>
                            <Requests />
                        </div>
                        <div style={{ padding: padding, backgroundColor: "#0003" }}>
                            <Toggle title="Auto-accept requests" value={toggleAutoRequests} onClick={async () => {
                                await setAutoAcceptingRequests(usc, !toggleAutoRequests);
                                setToggles(...await getToggles(usc));
                            }} />
                            <Toggle title="Allow requests" value={toggleAllowRequests} onClick={async () => {
                                await setAllowingRequests(usc, !toggleAllowRequests);
                                setToggles(...await getToggles(usc));
                            }} />
                        </div>
                    </div>
                </div>
            </div>
        </DisplayOrLoading>
    )
}

const setAllowingRequests = async (usc: UserSessionContextType, b: boolean) => {
    // const url = b ? 'business/' : 'business/disallow_requests/';
    await fetchWithToken(usc, 'business/', "PATCH", JSON.stringify({
        allowing_requests: b
    })).then(response => response.json())
        .then((json) => {
            console.log("finished", json.data.allowing_requests)
            if (json.status !== 200) throw new Error(json.details + json.error);
        })
        .catch((e: Error) => console.log("Error:", `Can't ${b ? "take" : "disable taking"} requests: ` + e.message));
}

const setAutoAcceptingRequests = async (usc: UserSessionContextType, b: boolean) => {
    // const url = b ? 'business/' : 'business/disallow_requests/';
    await fetchWithToken(usc, 'business/', "PATCH", JSON.stringify({
        auto_accept_requests: b
    })).then(response => response.json())
        .then((json) => {
            console.log("finished", json.data.allowing_requests)
            if (json.status !== 200) throw new Error(json.details + json.error);
        })
        .catch((e: Error) => console.log("Error:", `Can't ${b ? "take" : "disable taking"} requests: ` + e.message));
}

function Toggle(props: { title: string, value: boolean, onClick: () => Promise<void> }) {

    const [disabled, setDisabled] = useState(false);
    console.log("pval", props.value)

    const onClick = async () => {
        if (!disabled)
            setDisabled(true);
        await props.onClick();
        setDisabled(false);
    }

    return (
        <button disabled={disabled} style={{ padding: padding }} onClick={onClick}>
            <span>{props.title} {props.value ? "TRUE" : "FALSE"}</span>
        </button>
    );
}

const getToggles = async (usc: UserSessionContextType): Promise<[boolean, boolean]> => {
    const u = await getBusiness(usc).catch((e: Error) => console.log("Can't get acc in toggles", e.message));
    return ([u.data.allowing_requests, u.data.auto_accept_requests]);
}


const getQueue = async (usc: UserSessionContextType): Promise<[SongType | undefined, SongType[] | undefined]> => {
    return fetchWithToken(usc, `business/queue/`, 'GET').then(response => response.json())
        .then(json => {
            if (!json.data) {
                return [undefined, undefined];
            }
            const data = json.data;
            const npD = data.now_playing;
            const np: SongType | undefined = npD ? parseSongJson(npD) : undefined;
            const qD = data.queue;
            const q: SongType[] = [];
            qD.forEach((e: any) => {
                q.push({ id: e.id, title: e.name, artists: e.artist, albumart: e.images.thumbnail, albumartbig: e.images.teaser, explicit: e.explicit });
            })
            // console.log("refreshed")
            console.log("np, qd", np, q)

            return [np, q]
        })
}
