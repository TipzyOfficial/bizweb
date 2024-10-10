import { Modal, Spinner } from "react-bootstrap";
import { DisplayOrLoading } from "../../components/DisplayOrLoading";
import { Colors, padding, radius, useFdim } from "../../lib/Constants";
import { Dispatch, SetStateAction, useContext, useEffect, useState } from "react";
import { UserSessionContext, UserSessionContextType } from "../../lib/UserSessionContext";
import ProfileButton from "../../components/ProfileButton";
import Queue from "./Queue";
import { fetchWithToken, getBusiness } from "../..";
import { SongRequestType, SongType } from "../../lib/song";
import { etaBuffer, getCookies, millisToMinutesAndSeconds, parseSongJson, useInterval } from "../../lib/utils";
import _, { eq } from "lodash";
import BigLogo, { SmallLogo } from "../../components/BigLogo";
import Song from "../../components/Song";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faMagnifyingGlass, faXmark, IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { faCheckSquare as faYes, faSquare as faNo } from "@fortawesome/free-regular-svg-icons";
import Dropdown from 'react-bootstrap/Dropdown';


import TZHeader from "../../components/TZHeader";
import Stats from "./Stats";
import PlaybackComponent from "./PlaybackComponent";
import Price from "./Price";
import useWindowDimensions from "../../lib/useWindowDimensions";
import { router } from "../../App";
import { AlertContentType, AlertModal } from "../../components/Modals";
import { PlaylistScreen } from "./PlaylistScreen";

const cookies = getCookies();

type AcceptingType = "Manual" | "Auto" | "TipzyAI" | undefined;

// type NowPlayingType = [SongType, { progressMs: number, durationMs: number }]

export type CurrentlyPlayingType = [SongType, { progressMs: number, durationMs: number, paused: boolean }]

function checkAutoAccept(auto?: boolean, gpt?: boolean): AcceptingType {
    if (auto === undefined && gpt === undefined) return undefined;
    if (auto) return "Auto";
    else return gpt ? "TipzyAI" : "Manual";
}

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

const refreshQueueTime = 5000;

export default function Dashboard() {
    const usc = useContext(UserSessionContext);
    const bar = usc.user;
    const [ready, setReady] = useState(false);
    const [currentlyPlaying, setCurrentlyPlayingIn] = useState<CurrentlyPlayingType | undefined>(undefined);
    const [queue, setQueueIn] = useState<SongType[] | undefined>([]);

    const deletedCheckAgain = 15000;
    const [songRequests, setSongRequests] = useState<SongRequestType[]>([]);
    const [deletedIds, setDeletedIds] = useState<Map<number, number>>(new Map<number, number>());

    const [toggleDJMode, setToggleDJMode] = useState(usc.user.dj_mode);
    const [toggleBlockExplicitRequests, setToggleBlockExplcitRequests] = useState(usc.user.block_explicit);
    const [toggleAllowRequests, setToggleAllowRequests] = useState(usc.user.allowing_requests);
    const [acceptRadioValue, setAcceptRadioValue] = useState<AcceptingType>(checkAutoAccept(usc.user.auto_accept_requests, usc.user.gpt_accept_requests));
    const fdim = useFdim();
    const songDims = fdim / 15;
    const [financeStats, setFinanceStats] = useState<FinanceStatsType | undefined>();
    const [miniumumPrice, setMinimumPrice] = useState<number | undefined>();
    const [currentPrice, setCurrentPrice] = useState<number | undefined>();
    const [disableTyping, setDisableTyping] = useState(false);
    const [seeMoreStats, setSeeMoreStats] = useState(false);
    const [pausedUI, setPausedUI] = useState(false);
    const [somethingPressed, setSomethingPressed] = useState(false);

    // const [alertVisible, setAlertVisible] = useState(false);
    const [alertContent, setAlertContent] = useState<AlertContentType>(undefined);

    const qO = useState(queue ?? []);
    const [queueOrder, setQueueOrder] = qO; //queue AFTER we mess w it. what we actually display.
    const [editingQueue, setEditingQueueIn] = useState(false); //is "editing" on?
    const setEditingQueue: Dispatch<SetStateAction<boolean>> = (b: boolean | ((prevState: boolean) => boolean)) => {
        setEditingQueueIn(b);
    }
    const eQ: [boolean, Dispatch<SetStateAction<boolean>>] = [editingQueue, setEditingQueue]; //is "editing" on?
    const [reordering, setReordering] = useState(false); //is actively reordering queue?

    const setCurrentlyPlaying = (s: CurrentlyPlayingType | undefined) => {
        if (s === undefined && currentlyPlaying === undefined) return;
        if (s === undefined) setCurrentlyPlayingIn(undefined);
        else {
            if (JSON.stringify(JSON.stringify(s) !== JSON.stringify(currentlyPlaying))) {
                setCurrentlyPlayingIn(s);
            }
        }
    }

    useEffect(() => {
        console.log("editingQueue", editingQueue)
        if (editingQueue) {
            const q = queue;
            const qDef = q ?? [];
            const newQ: SongType[] = [];
            const qids = qDef.map(v => v.id);

            if (q !== undefined && qids.length !== 0 && JSON.stringify(q) !== JSON.stringify(queueOrder)) {
                for (let i = 0; i < queueOrder.length; i++) {
                    if (qids.indexOf(queueOrder[i].id) !== -1) {
                        console.log("pushing", newQ)
                        newQ.push(queueOrder[i]);
                    }
                }
                for (let i = newQ.length; i < qDef.length; i++) {
                    newQ.push(q[i]);
                }
                console.log("setting Qo", newQ);
                setQueueOrder(newQ);
            }
        } else {
            setQueueOrder(queue ?? []);
        }
    }, [queue, setQueueOrder, editingQueue])

    const setQueue = (q: SongType[] | undefined, reset?: boolean) => {

        console.log("setQueue", q, queueOrder, reset)

        setQueueIn(q);
    }

    async function reorderQueue() {
        if (reordering) return;
        setReordering(true);

        const minimumTimeLeft = 30000;

        if (!currentlyPlaying || currentlyPlaying[1].durationMs - currentlyPlaying[1].progressMs < minimumTimeLeft) {
            setReordering(false);
            alert("The current song is too close to finishing–please wait for it to finish before saving your changes!");
            return;
        }

        // console.log("queueold manual queue1", queue ? queue[0].manualQueue : "queue undef");

        if (!queueOrder || !queue) throw new Error("Queue is undefined.");

        //order is the same, don't need to do nothin'
        if (JSON.stringify(queueOrder) === JSON.stringify(queue)) {
            setEditingQueue(false);
            return;
        }

        const qOrderIds = queueOrder?.map(v => v.id);

        const map = queueOrder.map((v) => {
            return {
                artist: v.artists, explicit: v.explicit, duration_ms: v.duration ?? 0,
                id: v.id, images: { thumbnail: v.albumart }, manually_queued: v.manuallyQueued, name: v.title,
            }
        });

        let lastEditedIndex = 0;

        for (let i = queueOrder.length - 1; i > 0; i--) {
            if (queueOrder[i].manuallyQueued || JSON.stringify(queueOrder[i]) !== JSON.stringify(queue[i])) {
                lastEditedIndex = i;
                break;
            }
        }

        const bottom = lastEditedIndex;//Math.max(bottomEdited, lastEditedIndex);

        console.log("bottom", lastEditedIndex)

        const shortmap = map.slice(0, bottom + 1);

        const message = JSON.stringify({
            tracks: JSON.stringify(qOrderIds),
            song_jsons: JSON.stringify(shortmap),
        })
        console.log("about to send");

        console.log(shortmap);

        const json = await fetchWithToken(usc, `business/queue/reorder/`, 'POST', message).then((r) => r.json());
        console.log("reorder response", json);
        if (json.status !== 200) throw new Error(`${json.detail ?? json.toString()}`);
        console.log("done reordering")
        const [cur, q, lock] = await getQueueUpdatePause();

        setQueue(q, true);
        setEditingQueueIn(false);
        if (lock.isLocked) setEditingQueue(true);
    }


    const setToggles = (allow: boolean, accept: AcceptingType, noExplicit: boolean) => {
        console.log("b", allow)
        if (allow !== toggleAllowRequests) setToggleAllowRequests(allow);
        if (accept !== acceptRadioValue) setAcceptRadioValue(accept);
        if (noExplicit !== toggleBlockExplicitRequests) setToggleBlockExplcitRequests(noExplicit);
    }

    const refreshPrice = async (includeMinimum: boolean) => {
        const [minPrice, currPrice] = await getPrice(usc);

        console.log(miniumumPrice);

        if (includeMinimum && minPrice !== miniumumPrice) setMinimumPrice(minPrice);
        if (currPrice !== currentPrice) setCurrentPrice(currPrice);
    }

    const getQueueUpdatePause = async () => {
        const cq = await getQueue(usc);
        const [cur,] = cq

        const paused = cur ? cur[1].paused : undefined;
        if (!somethingPressed && paused !== undefined && paused !== pausedUI) setPausedUI(paused);

        return cq;
    }

    const refreshQueue = async (): Promise<[CurrentlyPlayingType | undefined, SongType[] | undefined]> => {
        //queue
        const [cur, q] = await getQueueUpdatePause();

        if (!_.isEqual(cur, currentlyPlaying)) setCurrentlyPlaying(cur);
        if (!_.isEqual(q, queue)) setQueue(q);

        console.log("qqueue", q, queue, queueOrder);

        return [cur, q];
    }

    const refreshAllData = async () => {
        console.log("refreshing all");
        //reqs
        const requests = await getRequests(usc, deletedIds, deletedCheckAgain);
        if (!_.isEqual(requests, songRequests)) setSongRequests(requests);

        //queue
        await refreshQueue();

        //stats
        const stats = await getStats(usc);
        if (!_.isEqual(stats, financeStats)) setFinanceStats(stats);

        //price
        await refreshPrice(false);
    }

    const addDeletedIds = (id: number) => {
        const temp = deletedIds;
        //add new id to deleted ids, never keep it above 50 to preserve space.
        //if(temp.length >= 50) temp.shift();
        temp.set(id, Date.now());
        setDeletedIds(temp);
    }

    const acceptOnPress = async (r: SongRequestType, index: number) => {
        const id = r.id;
        // setRequests([]);
        addDeletedIds(id);
        const newRq = [...songRequests];
        newRq.splice(index, 1);
        // console.log(newRq);
        setSongRequests(newRq);
        const json = await fetchWithToken(usc, `business/request/accept/?request_id=${id}`, "PATCH").then(response => {
            console.log("response", response);
            if (!response) throw new Error("null response");
            if (!response.ok) throw new Error("bad response: " + response.status);
            return (response.json());
        });
        console.log("json", json);
        if (json.status !== 200) alert(`Problem accepting song. Status: ${json.status}. Data: ${json.detail} Error: ${json.error}`)
        else {
            const cq = await refreshQueue();
            const q = cq[1];
            console.log("first refresh queue", q);

            //since sometimes queue doesnt update immediately?
            if (q && q[q.length - 1].id !== r.song.id) {
                setTimeout(() => {
                    refreshQueue().then((a) => console.log("didn't work...refresh queue", a));
                }, 1000);
            }
        }
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
        if (!disableTyping) {
            if (ev.code === acceptCode) {
                acceptOnPress(songRequests[0], 0).catch((e: Error) => alert(`Error accepting request. ${e.message}`));
                ;
            } else if (ev.code === rejectCode) {
                rejectOnPress(songRequests[0].id, 0);
            }
        }
    }

    //keypress stuff
    useEffect(() => {
        console.log("disabletyping!", disableTyping)

        if (!disableTyping) {
            document.addEventListener('keydown', handleKeyPress);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyPress);
        };
    }, [songRequests, disableTyping]);

    useEffect(() => {
        refreshPrice(true);
        refreshAllData().then(() => setReady(true)).catch(() => setReady(true));
    }, []);

    useInterval(refreshAllData, refreshQueueTime, 500, false);

    console.log("UE REFRESH ALL")
    ///() => rejectAll()

    const Requests = () => {
        const outlineColor = Colors.tertiaryDark;
        return (
            <div style={{ width: "100%", height: "100%", paddingRight: padding }}>
                <TZHeader title="Requests" backgroundColor={Colors.darkBackground}
                    leftComponent={
                        <RejectAllButton onClick={rejectAll} />
                    }
                    rightComponent={
                        <Dropdown>
                            <Dropdown.Toggle variant="primary" style={{ height: "100%" }} id="dropdown-basic">
                                {acceptRadioValue === "Manual" ? "Manually accept" :
                                    acceptRadioValue === "Auto" ? "Auto-accept" :
                                        acceptRadioValue === "TipzyAI" ? "Tipzy decides" : "..."}
                            </Dropdown.Toggle>
                            <Dropdown.Menu variant="dark">
                                <Dropdown.Item onClick={async () => onSetAccept("Manual")}>Manually accept</Dropdown.Item>
                                <Dropdown.Item onClick={async () => onSetAccept("Auto")}>Auto-accept</Dropdown.Item>
                                <Dropdown.Item onClick={async () => onSetAccept("TipzyAI")}>Let Tipzy Decide</Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    }
                ></TZHeader>
                {currentlyPlaying ?
                    (songRequests.length > 0 ?
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
                            {acceptRadioValue === "Auto" ? <span>Since you're auto-accepting new requests, you won't see requests show up here for review.</span> :
                                acceptRadioValue === "TipzyAI" ? <span>You're letting Tipzy check if each request is a good fit. If we don't think a song matches your vibe, we'll put it here for you to decide.</span>
                                    : <span>No new song requests...yet!</span>}
                        </div>)
                    : <div style={{ paddingLeft: padding }}><NotPlaying /></div>
                }
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
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                        <span className="App-smalltext" style={{ fontWeight: 'bold', color: Colors.primaryRegular }}> {request.price === 0 ? "FREE REQUEST" : `$${request.price.toFixed(2)}`}</span>
                    </div>
                    <span className="App-smalltext">{request.user.first_name} {request.user.last_name}</span>
                </div>
                <div style={{ width: "100%", display: "flex", alignItems: 'center', paddingTop: padding, paddingBottom: padding }}>
                    <Song song={request.song} dims={songDims} requestDate={request.date} />
                    <div style={{ display: "flex", alignItems: 'center' }}>
                        <Button icon={faXmark} color={"white"} onClick={() => rejectOnPress(request.id, props.index)}></Button>
                        <div style={{ paddingLeft: padding }}></div>
                        <Button icon={faCheck} color={Colors.primaryRegular} onClick={() => acceptOnPress(request, props.index).catch((e: Error) => alert(`Error accepting request. ${e.message}`))}></Button>
                    </div>
                </div>
                <span className="App-smalltext" style={{ fontWeight: "bold" }}>Vibe check: {request.fitAnalysis}. </span>
                <span className="App-smalltext">{request.fitReasoning}</span>
            </div>
        )
    }

    // console.log("windowh", window.screen.height);

    const onSetAccept = async (v: AcceptingType) => {
        await setAccepting(usc, v);
        setToggles(...await getToggles(usc));
    }

    const onSetDJMode = async (b: boolean) => {
        const djmode = await fetchWithToken(usc, 'business/', "PATCH", JSON.stringify({
            dj_mode: b
        })).then(response => response.json())
            .then((json) => {
                console.log("finished", json.data.dj_mode);
                if (json.status !== 200) throw new Error(json.details + json.error);
                return json.data.dj_mode;
            })
            .catch((e: Error) => console.log("Error:", `Can't ${b ? "enable" : "disable"} DJ mode: ` + e.message));
        setToggleDJMode(djmode);
    }

    const togglePlayStreaming = async (play: boolean) => {
        if (somethingPressed) return;
        setSomethingPressed(true);
        const func = play ? fetchWithToken(usc, `business/soundtrack/play/`, 'POST') : fetchWithToken(usc, `business/soundtrack/pause/`, 'POST');
        const json = await func.then((r) => r.json());
        setPausedUI(!play);
        setSomethingPressed(false);
        // console.log("json pause/play", json);
        if (json.status !== 200) {
            throw new Error(`bad response: ${json}`);
        }
    }

    const onPause = async () => {
        togglePlayStreaming(pausedUI);
    }

    const skip = async () => {
        const skipTimeout = refreshQueueTime;
        if (somethingPressed) return;
        setSomethingPressed(true);
        const json = await fetchWithToken(usc, `business/soundtrack/skip/`, 'POST').then((r) => r.json());
        if (json.status !== 200) throw new Error(`bad response: ${json}`);
        const [, q, r] = await getQueueUpdatePause();
        if (q && r.top && r.top.id === q[0].id) {
            setTimeout(async () => {
                const r = await getQueueUpdatePause();
                console.log("Getting queue done", r)
                setSomethingPressed(false);
            }, skipTimeout)
        } else {
            setSomethingPressed(false);
        }
    }

    const onSkip = async () => {
        if (currentlyPlaying ? currentlyPlaying[0].manuallyQueued : false) {
            setAlertContent({
                title: "THIS SONG IS A TIPZY REQUEST!",
                text: "If you skip it you might piss somebody off. Are you sure you want to skip this song?",
                buttons: [
                    { text: "Cancel", color: Colors.red },
                    { text: "Skip", color: Colors.tertiaryDark, onClick: skip },
                ]
            })
            // prompt("THIS SONG IS A TIPZY REQUEST", "If you skip it you might piss somebody off. Are you sure you want to skip this song?", [
            //     {
            //         text: "Cancel"
            //     },
            //     {
            //         text: "Skip",
            //         style: 'destructive',
            //         onPress: skip
            //     }
            // ])
        } else {
            skip();
        }
    }

    const queueLoading = reordering || somethingPressed;

    return (
        <DisplayOrLoading condition={ready} loadingScreen={<LoadingScreen />}>
            <div className="App-body-top">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: "100%", padding: padding, backgroundColor: "#0001" }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <SmallLogo />
                        <span className="App-montserrat-normaltext" style={{ paddingLeft: padding, fontWeight: 'bold', color: "#fff8" }}>Biz Dashboard</span>
                    </div>
                    <div>
                        <SearchBar />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ paddingRight: padding, fontWeight: 'bold' }}>Bar's ID: {bar.business_id}</span>
                        <ProfileButton position="relative" name={bar.business_name}></ProfileButton>
                    </div>
                </div>
                <div className="App-dashboard-grid" style={{ overflow: 'hidden' }}>
                    <div style={{ paddingLeft: padding, paddingRight: padding, height: "100%", overflowY: 'scroll', position: 'relative' }}>
                        {queueLoading ? <div style={{ position: 'absolute', width: "100%", height: "100%", top: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background + "88" }}>
                            <Spinner />
                        </div> : <></>}
                        <Price minPrice={miniumumPrice} currPrice={currentPrice} setMinPrice={setMinimumPrice} refresh={() => refreshPrice(true)} />
                        <div style={{ paddingBottom: padding }} />
                        {currentlyPlaying ?
                            <Queue pauseOverride={pausedUI} disable={queueLoading} queueOrder={qO} current={currentlyPlaying} songDims={songDims} editingQueue={eQ} onPauseClick={onPause} onSkipClick={onSkip} reorderQueue={async () => {
                                console.log('reordering', reordering)

                                if (!reordering) {
                                    try {
                                        await reorderQueue();
                                        setReordering(false);
                                    }
                                    catch (e) {
                                        setReordering(false);
                                        throw e;
                                    }
                                }
                            }} />
                            :
                            <NotPlaying />
                        }
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: Colors.darkBackground, height: "100%", overflowY: 'hidden' }}>
                        <div style={{ flex: 1, height: "100%", overflowY: 'scroll' }}>
                            <Requests />
                        </div>
                        <div style={{ padding: padding, backgroundColor: "#0003", display: "flex", justifyContent: 'space-between' }}>
                            <Toggle title="Explicit" value={!toggleBlockExplicitRequests} onClick={async () => {
                                await setBlockExplcitRequests(usc, !toggleBlockExplicitRequests);
                                setToggles(...await getToggles(usc));
                            }} />
                            <div style={{ paddingLeft: padding }} />
                            <div style={{ display: "flex" }}>
                                <Toggle title="DJ Mode" disabled value={toggleDJMode ?? false} onClick={async () => await onSetDJMode(!toggleDJMode)}></Toggle>
                            </div>
                            {/* <Toggle title="Auto-accept" value={toggleAutoRequests} onClick={async () => {
                                await setAutoAcceptingRequests(usc, !toggleAutoRequests);
                                setToggles(...await getToggles(usc));
                            }} /> */}
                            <div style={{ paddingLeft: padding }} />
                            <Toggle title="Take requests" value={toggleAllowRequests} onClick={async () => {
                                await setAllowingRequests(usc, !toggleAllowRequests);
                                setToggles(...await getToggles(usc));
                            }} />
                        </div>
                    </div>
                    <div style={{ height: "100%", overflowY: 'scroll' }}>
                        <PlaylistScreen setDisableTyping={setDisableTyping} />
                        {/* <Stats stats={financeStats} seeMore={seeMoreStats} setSeeMore={setSeeMoreStats} /> */}
                        <div style={{ paddingBottom: padding }} />
                    </div>
                </div>
                <AlertModal onHide={() => setAlertContent(undefined)} content={alertContent} />
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
                    fitAnalysis: item.fit_analysis,
                    fitReasoning: item.fit_reasoning,
                    date: new Date(item.request_time),
                })
            }
        });

        const sorted = out.sort((a, b) => b.date.getTime() - a.date.getTime());

        return sorted;
    })
        .catch((e: Error) => { console.log("error: " + e.message); return [] })
}

const getPrice = async (usc: UserSessionContextType): Promise<[number, number]> => {
    const dr = await fetchWithToken(usc, `calc_dynamic_price/`, 'POST', JSON.stringify({
        business_id: usc.user.business_id
    }));

    const djson = await dr.json();
    const dynamicPrice = djson.Dynamic_price;

    const mr = await fetchWithToken(usc, `get_minimum_price/`, 'GET');
    const mjson = await mr.json();
    const minPrice = mjson.min_price;

    console.log("dyn,min", dynamicPrice, minPrice)

    return [minPrice, dynamicPrice];
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

// const setAccepting = async (v: AcceptingType) => {
//     await fetchWithToken(tc, "business/", "PATCH", JSON.stringify({
//         auto_accept_requests: v === "TipzyAI" ? false : v === "Auto",
//         gpt_accept_requests: v === "TipzyAI",
//     })).then(response => response.json())
//         .then((json) => {
//             if (json.status !== 200) throw new Error(json.details + json.error);
//         })
//         .catch((e: Error) => Alert.alert("Error:", `Can't change accept pattern: ` + e.message));
//     await refreshAll();
// }

const setAccepting = async (usc: UserSessionContextType, v: AcceptingType) => {
    await fetchWithToken(usc, "business/", "PATCH", JSON.stringify({
        auto_accept_requests: v === "TipzyAI" ? false : v === "Auto",
        gpt_accept_requests: v === "TipzyAI",
    })).then(response => response.json())
        .then((json) => {
            if (json.status !== 200) throw new Error(json.details + json.error);
        })
        .catch((e: Error) => alert(`Error: Can't change accept pattern: ` + e.message));
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

function Toggle(props: { title: string, value: boolean, onClick: () => Promise<void>, disabled?: boolean }) {
    const [hover, setHover] = useState(false);
    const fdim = useFdim();
    const dim = fdim / 40;
    const [loading, setLoading] = useState(false);
    const onClick = async () => {
        if (!loading && !props.disabled) {
            setLoading(true)
            await props.onClick();
            setLoading(false);
        }
    }
    return (
        <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                padding: padding, backgroundColor: Colors.tertiaryDark, borderRadius: radius, display: 'flex', alignItems: 'center', cursor: 'pointer',
                opacity: props.disabled ? 0.5 : loading ? 0.6 : hover ? 0.8 : 1
            }} onClick={onClick}>
            {!loading ? <FontAwesomeIcon icon={props.value ? faYes : faNo} fontSize={dim}></FontAwesomeIcon> :
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

const getToggles = async (usc: UserSessionContextType): Promise<[boolean, AcceptingType, boolean]> => {
    const u = await getBusiness(usc).catch((e: Error) => console.log("Can't get acc in toggles", e.message));
    return ([u.data.allowing_requests, checkAutoAccept(u.data.auto_accept_requests, u.data.gpt_accept_requests), u.data.block_explicit]);
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

// const getQueue = async (resetAnyway?: boolean, resetSomethingPressed?: boolean): Promise<{ isLocked: boolean | undefined, top: SongType | undefined }> => {

// const getQueueIsLocked = async (resetAnyway?: boolean, resetSomethingPressed?: boolean): Promise<{ isLocked: boolean | undefined, top: SongType | undefined }> => {

const getQueue = async (usc: UserSessionContextType): Promise<[CurrentlyPlayingType | undefined, SongType[] | undefined, { isLocked: boolean | undefined, top: SongType | undefined }]> => {
    return fetchWithToken(usc, `business/queue/`, 'GET').then(response => response.json())
        .then(json => {
            if (!json.data) {
                return [undefined, undefined, { isLocked: undefined, top: undefined }];
            }
            const data = json.data;
            const isLocked: boolean | undefined = json.data.reorder_locked;

            const npD = data.now_playing;
            const npS: SongType | undefined = npD ? parseSongJson(npD) : undefined;

            const paused = npD ? npD.state === "paused" : true;

            const np: CurrentlyPlayingType | undefined = npS ? [npS, { progressMs: npD.progress_ms, durationMs: npD.duration_ms, paused: paused }] : undefined;
            const qD = data.queue;
            const q: SongType[] = [];
            qD.forEach((e: any) => {
                const song: SongType = parseSongJson(e);
                q.push(song);
            })

            return [np, q, { isLocked: isLocked, top: q[0] }];
        })
}

function NotPlaying() {
    return (
        <div style={{ padding: padding, backgroundColor: "#FFF1", borderRadius: radius, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <span style={{ textAlign: 'center' }}>Start playing music on your streaming app to accept requests and view the queue!</span>
        </div>
    )
}

function SearchBar() {
    const window = useWindowDimensions();
    const [hovered, setHovered] = useState(false);
    return (
        <div onClick={() => router.navigate("/search")} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ padding: padding, backgroundColor: hovered ? "#FFF2" : "#FFF1", borderRadius: radius * 2, display: 'flex', justifyContent: 'flex-start', alignItems: 'center', cursor: 'pointer' }}>
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <span style={{ textAlign: 'center', color: "#fffa", paddingLeft: padding, paddingRight: padding, minWidth: Math.min(500, window.width / 3), textAlignLast: 'left' }}>Add a song to queue...</span>
        </div>
    )
}