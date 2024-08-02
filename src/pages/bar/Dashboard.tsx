import { Spinner } from "react-bootstrap";
import { DisplayOrLoading } from "../../components/DisplayOrLoading";
import { Colors, padding, radius, useFdim } from "../../lib/Constants";
import { useCallback, useContext, useEffect, useState } from "react";
import { UserSessionContext, UserSessionContextType } from "../../lib/UserSessionContext";
import ProfileButton from "../../components/ProfileButton";
import Queue from "./Queue";
import { fetchWithToken, getBusiness } from "../..";
import { SongRequestType, SongType } from "../../lib/song";
import { getCookies, parseSongJson, useInterval } from "../../lib/utils";
import _, { pad } from "lodash";
import { Business } from "../../lib/user";
import BigLogo, { SmallLogo } from "../../components/BigLogo";
import FlatList from "flatlist-react/lib";
import Song from "../../components/Song";
import TZButton from "../../components/TZButton";
import { FontAwesomeIcon, FontAwesomeIconProps } from "@fortawesome/react-fontawesome";
import { faCheck, faCheckCircle, faCircle, faXmark, faXmarkCircle, IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { faCheckSquare as faYes, faSquare as faNo } from "@fortawesome/free-regular-svg-icons";

import TZHeader from "../../components/TZHeader";
import Stats from "./Stats";

const cookies = getCookies();

export type FinanceStatsType = {
    totalCustomers: number,
    barCut: number,
    pendingBarCut: number,
    totalRequests: number,
    pendingRequests: number,
}

const LoadingScreen = () =>
    <div className="App-header">
        <Spinner style={{ color: Colors.primaryRegular, width: 75, height: 75 }} />
        <br></br>
        <span>Loading your dashboard...</span>
    </div>;

export default function Dashboard() {
    const usc = useContext(UserSessionContext);
    const bar = usc.user;
    const [ready, setReady] = useState(false);
    const [currentlyPlaying, setCurrentlyPlaying] = useState<SongType | undefined>();
    const [queue, setQueue] = useState<SongType[] | undefined>([]);

    const deletedCheckAgain = 15000;
    const [songRequests, setSongRequests] = useState<SongRequestType[]>([]);
    const [deletedIds, setDeletedIds] = useState<Map<number, number>>(new Map<number, number>());

    const [toggleBlockExplicitRequests, setToggleBlockExplcitRequests] = useState(usc.user.block_explicit);
    const [toggleAllowRequests, setToggleAllowRequests] = useState(usc.user.allowing_requests);
    const [toggleAutoRequests, setToggleAutoRequests] = useState(usc.user.auto_accept_requests);
    const fdim = useFdim();
    const songDims = fdim / 12;

    const [financeStats, setFinanceStats] = useState<FinanceStatsType | undefined>();

    const [seeMoreStats, setSeeMoreStats] = useState(false);


    const setToggles = (allow: boolean, auto: boolean, noExplicit: boolean) => {
        console.log("b", allow)
        if (allow !== toggleAllowRequests) setToggleAllowRequests(allow);
        if (auto !== toggleAutoRequests) setToggleAutoRequests(auto);
        if (noExplicit !== toggleBlockExplicitRequests) setToggleBlockExplcitRequests(noExplicit);
    }

    const refreshAllData = async () => {
        console.log("refreshing all");
        //reqs
        const requests = await getRequests(usc, deletedIds, deletedCheckAgain);
        if (!_.isEqual(requests, songRequests)) setSongRequests(requests);

        //queue
        const [cur, q] = await getQueue(usc);
        if (!_.isEqual(cur, currentlyPlaying)) setCurrentlyPlaying(cur);
        if (!_.isEqual(q, queue)) setQueue(q);

        //stats
        const stats = await getStats(usc);
        if (!_.isEqual(stats, financeStats)) setFinanceStats(stats);
    }

    const addDeletedIds = (id: number) => {
        const temp = deletedIds;
        //add new id to deleted ids, never keep it above 50 to preserve space.
        //if(temp.length >= 50) temp.shift();
        temp.set(id, Date.now());
        setDeletedIds(temp);
    }

    const acceptOnPress = (id: number, index: number) => {
        // setRequests([]);
        addDeletedIds(id);
        const newRq = [...songRequests];
        newRq.splice(index, 1);
        // console.log(newRq);
        setSongRequests(newRq);
        fetchWithToken(usc, `business/request/accept/?request_id=${id}`, "PATCH").then(response => {
            console.log("response", response);
            if (!response) throw new Error("null response");
            if (!response.ok) throw new Error("bad response: " + response.status);
            return (response.json());
        }).then((json) => {
            console.log("json", json);
            if (json.status !== 200) alert(`Problem accepting song. Status: ${json.status}. Data: ${json.detail} Error: ${json.error}`)
            // refreshRequests();
        }
        ).catch((e: Error) => alert(`Error accepting request. ${e.message}`));
    }

    const rejectOnPress = (id: number, index: number) => {
        // setRequests([]);
        addDeletedIds(id);
        const newRq = [...songRequests];
        newRq.splice(index, 1);
        // console.log(newRq);
        setSongRequests(newRq);
        fetchWithToken(usc, `business/request/reject/?request_id=${id}`, "PATCH").then(response => {
            console.log("response", response);
            if (!response) throw new Error("null response");
            if (!response.ok) throw new Error("bad response: " + response.status);
            return (response.json());
        }).then((json) => {
            console.log("json", json);
            if (json.status !== 200) alert(`Problem rejecting song. Status: ${json.status}. Data: ${json.detail} Error: ${json.error}`)
            // refreshRequests();
        }
        ).catch((e: Error) => alert(`Error rejecting request. ${e.message}`));
    }

    const rejectAll = () => {
        const start = performance.now()
        songRequests.forEach((r) => {
            addDeletedIds(r.id);
        })
        // console.log(newRq);
        setSongRequests([]);
        console.log("Frontend Reject" + (performance.now() - start))
        fetchWithToken(usc, `business/request/reject/all/`, "PATCH").then(response => {
            if (!response) throw new Error("null response");
            if (!response.ok) throw new Error("bad response: " + response.status);
        }).then((json) => {
            console.log("Reject Request" + (performance.now() - start))
            // refreshRequests();
        })
            .catch((e: Error) => alert(`Error rejecting all requests + ${e.message}`));
    }

    const handleKeyPress = (ev: KeyboardEvent) => {
        console.log(songRequests)
        const acceptCode = "Digit1";
        const rejectCode = "Digit2";
        // console.log(ev.code);
        if (ev.code === acceptCode) {
            acceptOnPress(songRequests[0].id, 0);
        } else if (ev.code === rejectCode) {
            rejectOnPress(songRequests[0].id, 0);
        }
    }

    useEffect(() => {
        document.addEventListener('keydown', handleKeyPress);
        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, [songRequests]);

    useEffect(() => {
        refreshAllData().then(() => setReady(true)).catch(() => setReady(true));
    }, []);

    useInterval(refreshAllData, 5000, 500, false);

    ///() => rejectAll()

    const Requests = () => {
        const outlineColor = Colors.tertiaryDark;
        return (
            <div style={{ width: "100%", height: "100%", paddingRight: padding }}>
                <TZHeader title="Requests" backgroundColor={Colors.darkBackground} leftComponent={
                    <RejectAllButton onClick={rejectAll} />
                }></TZHeader>
                {songRequests.length > 0 ?
                    <div style={{ paddingBottom: padding, paddingLeft: padding, paddingRight: padding, width: "100%" }}>
                        <div style={{ padding: padding, borderStyle: "solid", borderRadius: 5, borderColor: outlineColor, width: "100%" }}>
                            <SongRequestRenderItem request={songRequests[0]} index={0} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: "flex-end" }}>
                            <div style={{ position: 'relative', right: 10, backgroundColor: outlineColor, padding: 5, borderEndStartRadius: radius, borderEndEndRadius: radius }}>
                                <span style={{ fontWeight: 'bold' }}> [ 1 ] to Accept</span>
                            </div>
                            <div style={{ position: 'relative', right: 10, backgroundColor: outlineColor, padding: 5, borderEndStartRadius: radius, borderEndEndRadius: radius }}>
                                <span style={{ fontWeight: 'bold' }}> [ 2 ] to Reject</span>
                            </div>
                        </div>
                    </div>
                    : <div style={{ padding: padding, width: "100%", display: 'flex', justifyContent: 'center', opacity: 0.7 }}>
                        {toggleAutoRequests ? <span>Since you're auto-accepting new requests, you won't see requests show up here for review.</span> : <span>No new song requests...yet!</span>}
                    </div>}
                {songRequests.length > 1 ?
                    songRequests.slice(1).map((r, i) =>
                        <div style={{ paddingBottom: padding, paddingLeft: padding, paddingRight: padding }}>
                            <SongRequestRenderItem request={r} key={i + "key"} index={i + 1} />
                        </div>
                    )
                    : <></>
                }
            </div>
        )
    }

    const SongRequestRenderItem = (props: { request: SongRequestType, index: number }) => {
        const request = props.request;

        const dim = fdim / 20;

        const Button = (props: { icon: IconDefinition, color: string, onClick: () => void }) => {
            const [mouseHover, setMouseHover] = useState(false);

            return (
                <div
                    onMouseEnter={() => setMouseHover(true)}
                    onMouseLeave={() => setMouseHover(false)}
                    onClick={props.onClick}

                    style={{
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        width: dim, height: dim, transform: `scale(${(mouseHover ? 1.2 : 1)})`,
                        borderRadius: "100%", borderStyle: "solid", borderColor: props.color,
                        transition: "transform .1s ease", WebkitTransition: ".1s ease",
                        cursor: "pointer"
                    }}>
                    <FontAwesomeIcon icon={props.icon} fontSize={dim * 0.6} color={props.color}></FontAwesomeIcon>
                </div>
            )
        }

        return (
            <div style={{ width: "100%" }}>
                <div style={{ width: "100%", display: "flex", alignItems: 'center' }}>
                    <Song song={request.song} dims={songDims} />
                    <div style={{ display: "flex", alignItems: 'center' }}>
                        <Button icon={faXmark} color={"white"} onClick={() => rejectOnPress(request.id, props.index)}></Button>
                        <div style={{ paddingLeft: padding }}></div>
                        <Button icon={faCheck} color={Colors.primaryRegular} onClick={() => acceptOnPress(request.id, props.index)}></Button>
                    </div>
                </div>
            </div>
        )
    }

    console.log("windowh", window.screen.height);

    return (
        <DisplayOrLoading condition={ready} loadingScreen={<LoadingScreen />}>
            <div className="App-body-top">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: "100%", padding: padding, backgroundColor: "#0001" }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <SmallLogo />
                        <span className="App-montserrat-normaltext" style={{ paddingLeft: padding, fontWeight: 'bold', color: "#fff8" }}>Biz Dashboard</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ paddingRight: padding, fontWeight: 'bold' }}>Bar's ID: {bar.business_id}</span>
                        <ProfileButton position="relative" name={bar.business_name}></ProfileButton>
                    </div>
                </div>
                <div className="App-dashboard-grid" style={{ overflow: 'hidden' }}>
                    <div style={{ paddingLeft: padding, paddingRight: padding, height: "100%", overflowY: 'scroll' }}>
                        {/* <div style={{ overflowY: 'hidden' }}> */}
                        {/* <div style={{ paddingBottom: padding, height: 600 }} /> */}
                        <Stats stats={financeStats} seeMore={seeMoreStats} setSeeMore={setSeeMoreStats} />
                        <div style={{ paddingBottom: padding }} />
                        <Queue queue={queue} current={currentlyPlaying} songDims={songDims} />
                        {/* </div> */}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: Colors.darkBackground, height: "100%", overflowY: 'hidden' }}>
                        <div style={{ flex: 1, height: "100%", overflowY: 'scroll' }}>
                            <Requests />
                        </div>
                        <div style={{ padding: padding, backgroundColor: "#0003", display: "flex", justifyContent: 'space-between' }}>
                            <Toggle title="Explicit songs" value={!toggleBlockExplicitRequests} onClick={async () => {
                                await setBlockExplcitRequests(usc, !toggleBlockExplicitRequests);
                                setToggles(...await getToggles(usc));
                            }} />
                            <div style={{ paddingLeft: padding }} />
                            <Toggle title="Auto-accept requests" value={toggleAutoRequests} onClick={async () => {
                                await setAutoAcceptingRequests(usc, !toggleAutoRequests);
                                setToggles(...await getToggles(usc));
                            }} />
                            <div style={{ paddingLeft: padding }} />
                            <Toggle title="Taking requests" value={toggleAllowRequests} onClick={async () => {
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

const getRequests = async (usc: UserSessionContextType, deletedIds: Map<number, number>, deletedCheckAgain: number): Promise<SongRequestType[]> => {
    return fetchWithToken(usc, "business/requests/", "GET").then(response => {
        // console.log("Refresh Request" + (performance.now() - start))
        if (!response) throw new Error("null response");
        if (!response.ok) throw new Error("Bad response " + response.status);
        // console.log(response);
        return response.json();
    }).then(json => {
        const out: SongRequestType[] = [];
        json.data.forEach((item: any) => {
            const songJSON = item.song_json;
            const exptime = deletedIds.get(item.id);
            if (!exptime || exptime + deletedCheckAgain < Date.now()) {
                out.push({
                    user: {
                        first_name: item.tipper_info.tipper_info.first_name,
                        last_name: item.tipper_info.tipper_info.last_name,
                        email: item.tipper_info.tipper_info.email
                    },
                    id: item.id,
                    song: { title: songJSON.name, artists: [songJSON.artist], albumart: songJSON.image_url, id: songJSON.id, explicit: songJSON.explicit ?? false },
                    price: item.price,
                })
            }
        });
        return out;
    })
        .catch((e: Error) => { console.log("error: " + e.message); return [] })
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

const setBlockExplcitRequests = async (usc: UserSessionContextType, b: boolean) => {
    // const url = b ? 'business/' : 'business/disallow_requests/';
    await fetchWithToken(usc, 'business/', "PATCH", JSON.stringify({
        block_explicit: b
    })).then(response => response.json())
        .then((json) => {
            console.log("finished", json.data.allowing_requests)
            if (json.status !== 200) throw new Error(json.details + json.error);
        })
        .catch((e: Error) => console.log("Error:", `Can't ${b ? "take" : "disable taking"} requests: ` + e.message));
}

function Toggle(props: { title: string, value: boolean, onClick: () => Promise<void> }) {
    const [hover, setHover] = useState(false);
    const fdim = useFdim();
    const dim = fdim / 40;
    const [disabled, setDisabled] = useState(false);
    const onClick = async () => {
        if (!disabled)
            setDisabled(true)
        await props.onClick();
        setDisabled(false);
    }
    return (
        <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                padding: padding, backgroundColor: Colors.tertiaryDark, borderRadius: radius, display: 'flex', alignItems: 'center',
                opacity: disabled ? 0.6 : hover ? 0.8 : 1
            }} onClick={onClick}>
            {!disabled ? <FontAwesomeIcon icon={props.value ? faYes : faNo} fontSize={dim}></FontAwesomeIcon> :
                <Spinner style={{ width: dim, height: dim }} />
            }
            <span style={{ paddingLeft: padding, fontWeight: 'bold' }}>{props.title}</span>
        </div>
    );
}

function RejectAllButton(props: { onClick: () => void }) {
    const fdim = useFdim();
    const [opacity, setOpacity] = useState(1);

    return (
        <div
            style={{
                paddingLeft: padding, display: 'flex', alignItems: 'flex-start', cursor: 'pointer'
            }} onClick={props.onClick}>
            <div style={{ display: 'inline-flex' }}>
                <div
                    onMouseEnter={() => setOpacity(0.7)}
                    onMouseLeave={() => setOpacity(1)}
                    onMouseDown={() => setOpacity(0.5)}
                    style={{
                        display: 'inline-block', padding: 5, borderRadius: 5, fontSize: fdim / 50, fontWeight: 'bold',
                        opacity: opacity, backgroundColor: Colors.red,
                        transition: "all 0.2s"
                    }}>
                    Reject All
                </div>
            </div>
        </div >
    )
}

const getToggles = async (usc: UserSessionContextType): Promise<[boolean, boolean, boolean]> => {
    const u = await getBusiness(usc).catch((e: Error) => console.log("Can't get acc in toggles", e.message));
    return ([u.data.allowing_requests, u.data.auto_accept_requests, u.data.block_explicit]);
}

const getStats = async (usc: UserSessionContextType): Promise<FinanceStatsType | undefined> => {
    const json = await fetchWithToken(usc, `get_bar_stats/`, 'GET').then(r => r.json()).catch((e: Error) => { console.log("Can't get acc in toggles", e.message); return undefined; });
    if (!json) return undefined;
    const stats: FinanceStatsType = {
        pendingBarCut: json.stats.Pending_bar_cut,
        pendingRequests: json.stats.pending_requests,
        barCut: json.stats.bar_cut,
        totalRequests: json.stats.count_requests,
        totalCustomers: json.total_customers,
    }
    return stats;
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

            return [np, q]
        })
}

