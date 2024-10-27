import { Modal, Spinner } from "react-bootstrap";
import { DisplayOrLoading } from "../../components/DisplayOrLoading";
import { Colors, padding, radius, useFdim } from "../../lib/Constants";
import { Dispatch, memo, SetStateAction, useContext, useEffect, useState } from "react";
import { UserSessionContext, UserSessionContextType } from "../../lib/UserSessionContext";
import ProfileButton from "../../components/ProfileButton";
import Queue from "./Queue";
import { fetchWithToken, getBusiness } from "../..";
import { SongRequestType, SongType } from "../../lib/song";
import { etaBuffer, getCookies, millisToMinutesAndSeconds, parseSongJson, useInterval, stringArrayToStringFormatted, numberToPrice } from "../../lib/utils";
import _, { eq } from "lodash";
import BigLogo, { SmallLogo } from "../../components/BigLogo";
import Song from "../../components/Song";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faChevronLeft, faChevronRight, faMagnifyingGlass, faXmark, IconDefinition } from "@fortawesome/free-solid-svg-icons";
import Dropdown from 'react-bootstrap/Dropdown';
import TZHeader from "../../components/TZHeader";
import Stats from "./Stats";
import PlaybackComponent from "./PlaybackComponent";
import Price from "./Price";
import useWindowDimensions from "../../lib/useWindowDimensions";
import { router } from "../../App";
import { AlertContentType, AlertModal } from "../../components/Modals";
import { PlaylistScreen } from "./PlaylistScreen";
import DJSettings from "./DJSettings";
import TZToggle from "../../components/TZToggle";
import { Search } from "./Search";

const BACKEND_STATUS = ["OPENING", "PEAK", "CLOSING"];

const GENRES = [
    "Rock",
    "Alt Rock",
    "Blues",
    "Rap",
    "Pop",
    "Dance",
    "RnB",
    "Country",
    "Singalong",
]

export type DJSettingsType = {
    genres: string[],
    energy: number,
    popularity: number,
};

const defaultDJSetting: DJSettingsType = {
    genres: [],
    energy: 60,
    popularity: 75,
}

const defaultDJSettings: DJSettingsType[] = [defaultDJSetting, defaultDJSetting, defaultDJSetting]

export type AcceptingType = "Manual" | "Auto" | "TipzyAI" | undefined;
export type ShuffleType = "Playlist" | "TipzyAI" | undefined;

export type CurrentlyPlayingType = [SongType, { progressMs: number, durationMs: number, paused: boolean }];

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

const AITABWIDTH = 17;

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
    const [volume, setVolume] = useState(70);
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

    //show search
    const [searchVisible, setSearchVisible] = useState(false);

    //show AI tab stuff
    const [aiTabVisible, setAITabVisible] = useState(true);

    //DJ Controls
    const [djSettingPlayingNumber, setDJSettingPlayingNumberIn] = useState<number | undefined>();
    const [djCurrentSettingNumber, setDJCurrentSettingNumberIn] = useState(0);
    const [djSettings, setDJSettings] = useState<DJSettingsType[]>(defaultDJSettings);
    const [djExpanded, setDJExpanded] = useState(false);
    // const [djSelectedGenres, setDJSelectedGenres] = useState(new Set<string>());
    const [djEnergy, setDJEnergy] = useState(50);
    const [djBangersOnly, setDJBangersOnly] = useState(75);
    const [djLocation, setDJLocation] = useState("San Francisco, California");
    const [djSongs, setDJSongs] = useState<SongType[] | undefined>(DEFAULT_DJ_SONGS);

    const [shuffleValue, setShuffleValue] = useState<ShuffleType>("TipzyAI");

    //TODO REMOVE THIS LATER
    const sessionStarted = djSettingPlayingNumber !== undefined;

    const setDJCurrentSettingNumber = (n: number) => {
        setDJCurrentSettingNumberIn(n);
        const djSetting = djSettings[n];
        // setDJSelectedGenres(new Set(djSetting.genres));
        setDJEnergy(djSetting.energy);
        setDJBangersOnly(djSetting.popularity);
    }

    const setDJSettingPlayingNumber = (n: number | undefined) => {
        setDJSettingPlayingNumberIn(n);
    }


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

        const shortmap = map.slice(0, bottom + 1);

        const message = JSON.stringify({
            tracks: JSON.stringify(qOrderIds),
            song_jsons: JSON.stringify(shortmap),
        })

        console.log(shortmap);

        const json = await fetchWithToken(usc, `business/queue/reorder/`, 'POST', message).then((r) => r.json());
        console.log("reorder response", json);
        if (json.status !== 200) throw new Error(`${json.detail ?? json.toString()}`);
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

        console.log("qqueue", cur, q, queue, queueOrder);

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

    const initDJ = async () => {
        const b = await getBusiness(usc).then((json) => json.data);
        const status = b.dj_status;
        const genres: string = b.dj_genres ?? "";
        const energy: number = b.dj_energy ?? 7;
        const popularity: number = b.dj_popularity_min ?? 7;
        const index = BACKEND_STATUS.indexOf(status);

        setDJSettingPlayingNumberIn(index);
        setDJCurrentSettingNumberIn(index);

        setDJEnergy(energy * 10);
        setDJBangersOnly(energy * 10);
        const setting: DJSettingsType = {
            genres: genres.split(", "),
            energy: energy * 10,
            popularity: popularity * 10,
        }

        const settings = [...djSettings];
        settings[index] = setting;

        setDJSettings(settings);
    }

    const initAll = async () => {
        await initDJ();
        await refreshAllData();
    }

    useEffect(() => {
        refreshPrice(true);
        initAll().then(() => setReady(true)).catch(() => setReady(true));
    }, []);

    useInterval(refreshAllData, refreshQueueTime, 500, false);

    // console.log("UE REFRESH ALL")
    ///() => rejectAll()

    const Requests = () => {
        const outlineColor = Colors.tertiaryDark;
        return (
            <div style={{ width: "100%", height: "100%", paddingRight: padding }}>
                <TZHeader title="" backgroundColor={Colors.darkBackground}
                    leftComponent={
                        <RejectAllButton onClick={rejectAll} />
                    }
                    rightComponent={
                        <div style={{ display: "flex" }}>
                            <TZToggle title="Explicit" value={!toggleBlockExplicitRequests} onClick={async () => {
                                await setBlockExplcitRequests(usc, !toggleBlockExplicitRequests);
                                setToggles(...await getToggles(usc));
                            }} />
                            <div style={{ width: padding }} />
                            <TZToggle title="Take requests" value={toggleAllowRequests} onClick={async () => {
                                await setAllowingRequests(usc, !toggleAllowRequests);
                                setToggles(...await getToggles(usc));
                            }} />
                        </div>

                    }
                />
                {currentlyPlaying && sessionStarted ?
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
                        : <div style={{ padding: padding, width: "100%", display: 'flex', justifyContent: 'center', opacity: 0.7, textAlign: 'center' }}>
                            {acceptRadioValue === "Auto" ? <span>Since you're auto-accepting new requests, you won't see requests show up here for review.</span> :
                                acceptRadioValue === "TipzyAI" ? <span>You're letting Virtual DJ check if each request is a good fit. If it doesn't think a song matches your vibe, it'll put it here for you to decide.</span>
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
                        <span className="App-smalltext" style={{ fontWeight: 'bold', color: Colors.primaryRegular }}> {request.price === 0 ? "FREE REQUEST" : `$${numberToPrice(request.price)}`}</span>
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

    const onSetShuffle = async (v: ShuffleType) => {
        // await setAccepting(usc, v);
        // setToggles(...await getToggles(usc));
        setShuffleValue(v);
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

    // const window = useWindowDimensions();

    const onSearchModalClose = () => {
        setSearchVisible(false);
        setDisableTyping(false);
    }

    //send DJSettings

    /**
     * path(“business/dj/shuffle/generate/“, views.dj_shuffle_by_prompt),
genres = request.data.get(“genres”)
    energy = int(request.data.get(“energy”))  # scale of 1 to 10
    bangers_only = bool(request.data.get(“bangers_only”))
genres is just a string. send em over like this: “pop, rock, rap”
     */

    const sendDJSettings = async () => {
        const current = djSettings[djCurrentSettingNumber];

        const newDJSettings: DJSettingsType = {
            genres: Array.from(current.genres).sort(),
            energy: current.energy / 10,
            popularity: current.popularity / 10,
        };

        if (JSON.stringify(newDJSettings) !== JSON.stringify(djSettings[djCurrentSettingNumber])) {
            const djs = JSON.stringify({
                dj_genres: stringArrayToStringFormatted(newDJSettings.genres),
                dj_energy: newDJSettings.energy,
                dj_popularity_min: newDJSettings.popularity,
                dj_location: djLocation ?? "No location",
                dj_status: BACKEND_STATUS[djCurrentSettingNumber] ?? "PEAK"
            })

            console.log("newDJSettings", djs)

            const json = await fetchWithToken(usc, 'business/dj/shuffle/generate/', 'POST', djs).then(r => r.json());

            let tracks: SongType[] | undefined = [];

            try {
                for (const t of json.tracks) {
                    tracks.push(parseSongJson(t));
                }
            } catch (e) {
                console.error(e);
                tracks = undefined;
            }

            setDJSongs(tracks);

            console.log("DJ Settings response json", json);
            console.log("DJ TRACKS", tracks)
        }
    }

    return (
        <DisplayOrLoading condition={ready} loadingScreen={<LoadingScreen />}>
            <div className="App-body-top">
                <Modal dialogClassName="search-modal" show={searchVisible} onShow={() => {
                    setDisableTyping(true);
                }} onHide={onSearchModalClose}
                    style={{ color: "white" }}

                    data-bs-theme={"dark"}>
                    {/* <Modal.Title>
                {props.content?.title}
            </Modal.Title> */}
                    {/* <Modal.Body style={{ color: "white", padding: 0, }}> */}
                    <Search onClose={onSearchModalClose} />
                    {/* </Modal.Body> */}
                </Modal>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: "100%", padding: padding, backgroundColor: "#0001" }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <SmallLogo />
                        <span className="App-montserrat-normaltext" style={{ paddingLeft: padding, fontWeight: 'bold', color: "#fff8" }}>Biz Dashboard</span>
                    </div>
                    <div>
                        <SearchBar onClick={() => setSearchVisible(true)} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ paddingRight: padding, fontWeight: 'bold' }}>Bar's ID: {bar.business_id}</span>
                        <ProfileButton position="relative" name={bar.business_name}></ProfileButton>
                    </div>
                </div>
                <div className="App-dashboard-grid" style={{ overflow: 'hidden', position: 'relative', gridTemplateColumns: aiTabVisible ? "1.5fr 3.5fr 1.5fr" : "1.5fr 5fr" }}>
                    <div className="remove-scrollbar" style={{ paddingLeft: padding, paddingRight: padding, height: "100%", overflowY: 'scroll', position: 'relative' }}>
                        {queueLoading ? <div style={{ position: 'absolute', width: "100%", height: "100%", top: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background + "88", zIndex: 100 }}>
                            <Spinner />
                        </div> : <></>}
                        <Price minPrice={miniumumPrice} currPrice={currentPrice} setMinPrice={setMinimumPrice} refresh={() => refreshPrice(true)} />
                        <div style={{ paddingBottom: padding }} />
                        {currentlyPlaying && sessionStarted ?
                            <Queue volumeState={[volume, setVolume]} pauseOverride={pausedUI} disable={queueLoading} queueOrder={qO} current={currentlyPlaying} songDims={songDims} editingQueue={eQ} onPauseClick={onPause} onSkipClick={onSkip} reorderQueue={async () => {
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
                    <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: Colors.darkBackground, height: "100%", overflowY: 'hidden', paddingRight: aiTabVisible ? 0 : AITABWIDTH }}>
                        {/* <input value={djLocation} onChange={(e) => setDJLocation(e.target.value)}></input> */}
                        <div style={{ display: "flex", justifyContent: 'space-between' }}>
                            <DJSettings
                                genres={GENRES}
                                expandState={[djExpanded, setDJExpanded]}
                                // selectedState={[djSelectedGenres, setDJSelectedGenres]}
                                energyState={[djEnergy, setDJEnergy]}
                                bangersState={[djBangersOnly, setDJBangersOnly]}
                                sendDJSettings={sendDJSettings}
                                djSettingPlayingNumberState={[djSettingPlayingNumber, setDJSettingPlayingNumber]}
                                djSettingsState={[djSettings, setDJSettings]}
                                djCurrentSettingNumberState={[djCurrentSettingNumber, setDJCurrentSettingNumber]}
                                acceptRadioValueState={[acceptRadioValue, setAcceptRadioValue]}
                                shuffleRadioValueState={[shuffleValue, setShuffleValue]}
                                onSetShuffle={onSetShuffle}
                                onSetAccept={onSetAccept}
                                ExplicitButton={
                                    <></>
                                }
                                PlaylistScreen={
                                    <>
                                        <PlaybackComponent setDisableTyping={setDisableTyping} />
                                        <div style={{ display: "flex" }}>
                                            <TZToggle title="Explicit" value={!toggleBlockExplicitRequests} onClick={async () => {
                                                await setBlockExplcitRequests(usc, !toggleBlockExplicitRequests);
                                                setToggles(...await getToggles(usc));
                                            }} />
                                        </div>

                                    </>

                                }
                            />

                        </div>
                        <div className="remove-scrollbar" style={{ flex: 1, height: "100%", overflowY: 'scroll', }}>
                            <Requests />
                        </div>
                        {/* <div style={{ padding: padding, backgroundColor: "#0003", display: "flex", justifyContent: 'space-between' }}>
                            <TZToggle title="Explicit" value={!toggleBlockExplicitRequests} onClick={async () => {
                                await setBlockExplcitRequests(usc, !toggleBlockExplicitRequests);
                                setToggles(...await getToggles(usc));
                            }} />
                            <div style={{ paddingLeft: padding }} />
                            <div style={{ display: "flex" }}>
                                <TZToggle title="DJ Mode" disabled value={toggleDJMode ?? false} onClick={async () => await onSetDJMode(!toggleDJMode)}></TZToggle>
                            </div>
                            <div style={{ paddingLeft: padding }} />
                        </div> */}
                    </div>
                    <PlaylistScreen djSongList={djSongs} visibleState={[aiTabVisible, setAITabVisible]} setDisableTyping={setDisableTyping} setAlertContent={setAlertContent} />
                    {/* 
                    {aiTabVisible ?
                        <div style={{ height: "100%", overflowY: 'scroll', position: 'relative', display: 'flex', }}>
                            <AISideTab close onClick={() => setAITabVisible(!aiTabVisible)} />
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <PlaylistScreen visibleState={[aiTabVisible, setAITabVisible]} setDisableTyping={setDisableTyping} setAlertContent={setAlertContent} />
                            </div>
                            <Stats stats={financeStats} seeMore={seeMoreStats} setSeeMore={setSeeMoreStats} />
                            <div style={{ paddingBottom: padding }} />
                        </div>
                        : <AISideTab onClick={() => setAITabVisible(!aiTabVisible)} />
                    } */}
                </div>
                <AlertModal onHide={() => setAlertContent(undefined)} content={alertContent} />
            </div>
        </DisplayOrLoading>
    )
}

const AISideTab = (props: { onClick: () => any, close?: boolean }) => {
    const [hover, setHover] = useState(false);

    return (
        <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
            onClick={props.onClick}
            style={{
                height: "100%", width: AITABWIDTH,
                position: props.close ? 'relative' : 'absolute', display: 'flex',
                flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                backgroundColor: "#fff4", zIndex: 99,
                opacity: hover ? 0.7 : 1, cursor: 'pointer',
                right: props.close !== true ? 0 : undefined,
            }}>
            <FontAwesomeIcon icon={props.close ? faChevronRight : faChevronLeft}></FontAwesomeIcon>
        </div>
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
            {/* <span style={{ textAlign: 'center' }}>Start playing music on your streaming app to accept requests and view the queue!</span> */}
            <span style={{ textAlign: 'center' }}>Start playing music to accept requests and view the queue!</span>
        </div>
    )
}

function SearchBar(props: { onClick: () => any }) {
    const window = useWindowDimensions();
    const [hovered, setHovered] = useState(false);
    return (
        <div onClick={props.onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ padding: padding, backgroundColor: hovered ? "#FFF2" : "#FFF1", borderRadius: radius * 2, display: 'flex', justifyContent: 'flex-start', alignItems: 'center', cursor: 'pointer' }}>
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <span style={{ textAlign: 'center', color: "#fffa", paddingLeft: padding, paddingRight: padding, minWidth: Math.min(500, window.width / 3), textAlignLast: 'left' }}>Add a song to queue...</span>
        </div>
    )
}

// const DJSettingsMemo = memo(DJSettings, (prev, next) => {
//     return true;
// });


const DEFAULT_DJ_SONGS =
    [
        {
            "id": "soundtrack:track:6Kgd6rC9ocyHuTuZx1p7zo",
            "title": "Summer Of '69",
            "artists": [
                "Bryan Adams"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvf7qtYSHHp1SQgESBgxPDwdoSzcpJqEeQkN",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvf7qtYSHHp1SQgESBgxPDwdoSzcpJqEeQkN",
            "explicit": false,
            "duration": 215000
        },
        {
            "id": "soundtrack:track:4Ul6sw0Vgowloa5J1f8Woi",
            "title": "Maneater",
            "artists": [
                "Daryl Hall & John Oates"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvh8ML7L9NUME4xwRNyAzWBUPRjgyiihQxte",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvh8ML7L9NUME4xwRNyAzWBUPRjgyiihQxte",
            "explicit": false,
            "duration": 272000
        },
        {
            "id": "soundtrack:track:4l82igyVfQnkN02Nwowyk9",
            "title": "Don't Dream It's Over",
            "artists": [
                "Crowded House"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvfvRopvCuFYUYiRBqVNxGkyyQu5mQvjJQ5U",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvfvRopvCuFYUYiRBqVNxGkyyQu5mQvjJQ5U",
            "explicit": false,
            "duration": 237000
        },
        {
            "id": "soundtrack:track:2lfpHvDZO0kTuXsfbQL8B2",
            "title": "I'm On Fire",
            "artists": [
                "Bruce Springsteen"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduTvtczVrbWTgurMY5mMWRzerWAcvz7yMY",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduTvtczVrbWTgurMY5mMWRzerWAcvz7yMY",
            "explicit": false,
            "duration": 156000
        },
        {
            "id": "soundtrack:track:3vP7HqHGl2PkrHBLUA1SaS",
            "title": "Rock with You - Single Version",
            "artists": [
                "Michael Jackson"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduNeEnCvpnMCohYw1vcJTe35vKpbTk2wWe",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduNeEnCvpnMCohYw1vcJTe35vKpbTk2wWe",
            "explicit": false,
            "duration": 203000
        },
        {
            "id": "soundtrack:track:1KVf9VtmJDtEh2bxZAYzjW",
            "title": "Beat It - Single Version",
            "artists": [
                "Michael Jackson"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduC4tPtkkRQ7uRSBfyMWCZ5UzTKbGnCAfY",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduC4tPtkkRQ7uRSBfyMWCZ5UzTKbGnCAfY",
            "explicit": false,
            "duration": 258000
        },
        {
            "id": "soundtrack:track:3WkwPKhyFNCSWYubRCUBu6",
            "title": "I Love Rock 'N Roll",
            "artists": [
                "Joan Jett & The Blackhearts"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvh7zBQqG6Hp9pjzkZQTvjXdi84YnSFAjxgv",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvh7zBQqG6Hp9pjzkZQTvjXdi84YnSFAjxgv",
            "explicit": false,
            "duration": 175000
        },
        {
            "id": "soundtrack:track:56mUgXSlPUKf71vnOJEgDK",
            "title": "Another Day in Paradise - 2016 Remaster",
            "artists": [
                "Phil Collins"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvfv4f8xs6wGCVwx63tD4urYZt23NbfdyJFQ",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvfv4f8xs6wGCVwx63tD4urYZt23NbfdyJFQ",
            "explicit": false,
            "duration": 322000
        },
        {
            "id": "soundtrack:track:2jxkAdiGrR4WonqVClAOfZ",
            "title": "Chicago",
            "artists": [
                "Michael Jackson"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvf7PTC7M7ckWJGRDYRQE2qShZBCH3pWqTxS",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvf7PTC7M7ckWJGRDYRQE2qShZBCH3pWqTxS",
            "explicit": false,
            "duration": 245000
        },
        {
            "id": "soundtrack:track:3HEnsoH97euxbCN6B3LDKO",
            "title": "Faith - Remastered",
            "artists": [
                "George Michael"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJSPA98VsrVXpbKBDRwgTT3ACt1JeiZPFt",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJSPA98VsrVXpbKBDRwgTT3ACt1JeiZPFt",
            "explicit": false,
            "duration": 193000
        },
        {
            "id": "soundtrack:track:5r8j6iNxx9AFkBRfM8E8x1",
            "title": "Streets of Philadelphia - Single Edit",
            "artists": [
                "Bruce Springsteen"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvh7zBSBudYHHNQExv5gCYkZKqc6ACJhLNr2",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvh7zBSBudYHHNQExv5gCYkZKqc6ACJhLNr2",
            "explicit": false,
            "duration": 196000
        },
        {
            "id": "soundtrack:track:6VWyR7fWV9UlGhFksRDaNE",
            "title": "Against All Odds (Take a Look at Me Now) - 2016 Remaster",
            "artists": [
                "Phil Collins"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvfvRopvKzYRfjNw6NnK2Q3C8SFyG4fCwZ8r",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvfvRopvKzYRfjNw6NnK2Q3C8SFyG4fCwZ8r",
            "explicit": false,
            "duration": 206000
        },
        {
            "id": "soundtrack:track:1vQ2uODooCEsYjEQiOGZLs",
            "title": "Come On Eileen",
            "artists": [
                "Dexys Midnight Runners"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhxQvGCyAxec5qACsCYAcvB7TDEfs4LZigKJW",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhxQvGCyAxec5qACsCYAcvB7TDEfs4LZigKJW",
            "explicit": false,
            "duration": 287000
        },
        {
            "id": "soundtrack:track:2ibqiCsx1It06iGE22KcAm",
            "title": "Beat It - Single Version",
            "artists": [
                "Michael Jackson"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduC4tPmdqojKJdTZhYhQVDL4pFD5raYyJe",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduC4tPmdqojKJdTZhYhQVDL4pFD5raYyJe",
            "explicit": false,
            "duration": 258000
        },
        {
            "id": "soundtrack:track:3CLVXmZMy5AV7wMWp34pcm",
            "title": "Superstition - Single Version",
            "artists": [
                "Stevie Wonder"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvhXKnRqp6FFe3As2MQ4qaoD9iiqASHg4MqG",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvhXKnRqp6FFe3As2MQ4qaoD9iiqASHg4MqG",
            "explicit": false,
            "duration": 245000
        },
        {
            "id": "soundtrack:track:4R7UcLCFFUa11Ksts1HNCH",
            "title": "Hung Up",
            "artists": [
                "Madonna"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvdu1VWP4tAXJP6mdsEgJwZZ9vNtegfLTADk",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvdu1VWP4tAXJP6mdsEgJwZZ9vNtegfLTADk",
            "explicit": false,
            "duration": 338000
        },
        {
            "id": "soundtrack:track:2LWEvTgOhUmmQkz6ryWjFx",
            "title": "Pour Some Sugar On Me - Remastered 2017",
            "artists": [
                "Def Leppard"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvgieaRiXo9rJNXtSR9aNmmM6mBXiMuxTcJa",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvgieaRiXo9rJNXtSR9aNmmM6mBXiMuxTcJa",
            "explicit": true,
            "duration": 267000
        },
        {
            "id": "soundtrack:track:30fdaAOwlaAMGcQ93uOSZT",
            "title": "Holding Out for a Hero (From \"Footloose\" Soundtrack)",
            "artists": [
                "Bonnie Tyler"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhxRKEfFWkfeZMEv81FZx2vXy521EbCyYySLe",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhxRKEfFWkfeZMEv81FZx2vXy521EbCyYySLe",
            "explicit": false,
            "duration": 349000
        },
        {
            "id": "soundtrack:track:7AyP4MWhW94papy5L6UuoG",
            "title": "Glory Days",
            "artists": [
                "Bruce Springsteen"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduTvtczVrbWTgurMY5mMWRzerWAcvz7yMY",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduTvtczVrbWTgurMY5mMWRzerWAcvz7yMY",
            "explicit": false,
            "duration": 255000
        },
        {
            "id": "soundtrack:track:2JzXkvJfexe5tBF0YBAa44",
            "title": "Smooth Criminal - 2012 Remaster",
            "artists": [
                "Michael Jackson"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveK5PvfNu9yiXQF9fAxLCoKQAnBG8drFxHC",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveK5PvfNu9yiXQF9fAxLCoKQAnBG8drFxHC",
            "explicit": false,
            "duration": 251000
        },
        {
            "id": "soundtrack:track:6rI6Q4c465SNfvWRwf8GNP",
            "title": "This Night Has Opened My Eyes - 2011 Remaster",
            "artists": [
                "The Smiths"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJiFBiddGTpfsaChrP54t9HJPBcr55ewxJ",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJiFBiddGTpfsaChrP54t9HJPBcr55ewxJ",
            "explicit": false,
            "duration": 222000
        },
        {
            "id": "soundtrack:track:5rzGHkn6QeDyaPzsKjwYUR",
            "title": "Like a Prayer",
            "artists": [
                "Madonna"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvdu1VW7SuVDfeBfyjQQwEy6rGNxJcw9Hi3p",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvdu1VW7SuVDfeBfyjQQwEy6rGNxJcw9Hi3p",
            "explicit": false,
            "duration": 341000
        },
        {
            "id": "soundtrack:track:7dPuchUzR5wR347iao7sgE",
            "title": "You Spin Me Round (Like a Record)",
            "artists": [
                "Dead Or Alive"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhxSXccvRkLTUhE5YRBLC2ny79HJRWtk8ti5t",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhxSXccvRkLTUhE5YRBLC2ny79HJRWtk8ti5t",
            "explicit": false,
            "duration": 195000
        },
        {
            "id": "soundtrack:track:0Eqn9Bb6oLaErGwZ8ynUoT",
            "title": "Centerfold",
            "artists": [
                "The J. Geils Band"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvdu6nBqwE8HeaJWgfmpJvQ8HekEpacA4Ukv",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvdu6nBqwE8HeaJWgfmpJvQ8HekEpacA4Ukv",
            "explicit": false,
            "duration": 217000
        },
        {
            "id": "soundtrack:track:6WIW67sPZ22saEBpv5QNDT",
            "title": "How Will I Know",
            "artists": [
                "Whitney Houston"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduC4tfpTFVtuzjqeZhG2NXDHPQv5DBSgFx",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduC4tfpTFVtuzjqeZhG2NXDHPQv5DBSgFx",
            "explicit": false,
            "duration": 275000
        },
        {
            "id": "soundtrack:track:5MercyaTf1c2eCvgeLvPdf",
            "title": "Hysteria",
            "artists": [
                "Def Leppard"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvgieaRiXqaT1oSJYYApFjQvzU9CsHGobPfc",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvgieaRiXqaT1oSJYYApFjQvzU9CsHGobPfc",
            "explicit": false,
            "duration": 354000
        },
        {
            "id": "soundtrack:track:1cX4npJb5Ydyk5oD3hs3E2",
            "title": "Material Girl (2024 Remaster)",
            "artists": [
                "Madonna"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBi21MFNMbNcU1uhJnWcsHRQoKRLsXyU42wwS6",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBi21MFNMbNcU1uhJnWcsHRQoKRLsXyU42wwS6",
            "explicit": false,
            "duration": 242000
        },
        {
            "id": "soundtrack:track:4Gv7QEEh80TzQVOUYq2LZf",
            "title": "Just Like Heaven",
            "artists": [
                "The Cure"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvdu6nBqzgX6hQLsQgCvwa8cUums9GrMFtZk",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvdu6nBqzgX6hQLsQgCvwa8cUums9GrMFtZk",
            "explicit": false,
            "duration": 212000
        },
        {
            "id": "soundtrack:track:1087eyA9fUswU1s39uYjk4",
            "title": "Maniac",
            "artists": [
                "Michael Sembello"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvhXR54amh8gC5DTb91vYWaFMeMNoMWr6JmL",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvhXR54amh8gC5DTb91vYWaFMeMNoMWr6JmL",
            "explicit": false,
            "duration": 245000
        },
        {
            "id": "soundtrack:track:2Pgvu38M3izr9Y3D5WOlyt",
            "title": "Saving All My Love for You",
            "artists": [
                "Whitney Houston"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduC4tfpTFVtuzjqeZhG2NXDHPQv5DBSgFx",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduC4tfpTFVtuzjqeZhG2NXDHPQv5DBSgFx",
            "explicit": false,
            "duration": 237000
        },
        {
            "id": "soundtrack:track:2zxd3P10ratqfZOFWkCqdp",
            "title": "Come Undone",
            "artists": [
                "Duran Duran"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvdu1VVqeK5tbqj1Wr9NPqHBJNdxwaL7n24E",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvdu1VVqeK5tbqj1Wr9NPqHBJNdxwaL7n24E",
            "explicit": false,
            "duration": 257000
        },
        {
            "id": "soundtrack:track:2Pgvu38M3izr9Y3D5WOlyt",
            "title": "Saving All My Love for You",
            "artists": [
                "Whitney Houston"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduC4tfpTFVtuzjqeZhG2NXDHPQv5DBSgFx",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduC4tfpTFVtuzjqeZhG2NXDHPQv5DBSgFx",
            "explicit": false,
            "duration": 237000
        },
        {
            "id": "soundtrack:track:3KwSJ1VCLo4WsLIwLZbQ3x",
            "title": "One More Night - 2016 Remaster",
            "artists": [
                "Phil Collins"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvfut5pDFKwfFzJSfs6rXWLwfVceHCrkXPjC",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvfut5pDFKwfFzJSfs6rXWLwfVceHCrkXPjC",
            "explicit": false,
            "duration": 289000
        },
        {
            "id": "soundtrack:track:3F4rdwhF9vNlxicqvh9qVk",
            "title": "Don't Leave Me This Way (with Sarah Jane Morris)",
            "artists": [
                "The Communards",
                "Sarah Jane Morris"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvgieaSG5V96fiWSY4DJwykZUfwBoYDaiH2v",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvgieaSG5V96fiWSY4DJwykZUfwBoYDaiH2v",
            "explicit": false,
            "duration": 271000
        },
        {
            "id": "soundtrack:track:2tMmdmNLrxubPjtA3SDUEW",
            "title": "Heart Of Glass - Special Mix",
            "artists": [
                "Blondie"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvdu1VWPK4kHgkRoSwpYTC7Bxg2EvaygG2yC",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvdu1VWPK4kHgkRoSwpYTC7Bxg2EvaygG2yC",
            "explicit": true,
            "duration": 276000
        },
        {
            "id": "soundtrack:track:2OstfMXxyuXz4X0neDjT9H",
            "title": "Lessons In Love",
            "artists": [
                "Level 42"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveKAgam7BpDYXe9yW7wZ1wFKpxo5Aw4CDkJ",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveKAgam7BpDYXe9yW7wZ1wFKpxo5Aw4CDkJ",
            "explicit": false,
            "duration": 246000
        },
        {
            "id": "soundtrack:track:3cAkC9IyiTXcHjtqzc6PHJ",
            "title": "I Hate Myself for Loving You",
            "artists": [
                "Joan Jett & The Blackhearts"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduC4tPtj8gvVy9N6zUmXmNE6RqfdWy4Ex6",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduC4tPtj8gvVy9N6zUmXmNE6RqfdWy4Ex6",
            "explicit": false,
            "duration": 246000
        },
        {
            "id": "soundtrack:track:5DVAqWPt1SYQLfUTP4z0fK",
            "title": "Animal",
            "artists": [
                "Def Leppard"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvgieaRiXqaT1oSJYYApFjQvzU9CsHGobPfc",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvgieaRiXqaT1oSJYYApFjQvzU9CsHGobPfc",
            "explicit": false,
            "duration": 244000
        },
        {
            "id": "soundtrack:track:5DVAqWPt1SYQLfUTP4z0fK",
            "title": "Animal",
            "artists": [
                "Def Leppard"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvgieaRiXqaT1oSJYYApFjQvzU9CsHGobPfc",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvgieaRiXqaT1oSJYYApFjQvzU9CsHGobPfc",
            "explicit": false,
            "duration": 244000
        },
        {
            "id": "soundtrack:track:7uydTWaLdwg3PP0WgVbZUJ",
            "title": "Straight From The Heart",
            "artists": [
                "Bryan Adams"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduNeDA12zDVTtNpw2X7Gy2LZURcf1kw8FY",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduNeDA12zDVTtNpw2X7Gy2LZURcf1kw8FY",
            "explicit": false,
            "duration": 210000
        },
        {
            "id": "soundtrack:track:0KzldYyRDF0VP4RtxaBgfm",
            "title": "Somebody's Watching Me",
            "artists": [
                "Rockwell",
                "Rockwell"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhxTjSrYBVPQ9u3EAnSoxppCGWg86Gfi8bPkr",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhxTjSrYBVPQ9u3EAnSoxppCGWg86Gfi8bPkr",
            "explicit": false,
            "duration": 299000
        },
        {
            "id": "soundtrack:track:4Q3thb8WanfpQ1SrA7WYX9",
            "title": "Girls on Film - 2010 Remaster",
            "artists": [
                "Duran Duran"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvdueWGMmfVjM5YZYuqCbBzUdavJVeiTZmpJ",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvdueWGMmfVjM5YZYuqCbBzUdavJVeiTZmpJ",
            "explicit": false,
            "duration": 213000
        },
        {
            "id": "soundtrack:track:3ildtVLbDqZxvs391fjLRf",
            "title": "Rock Me Amadeus - The Gold Mix",
            "artists": [
                "Falco"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvgK37Sw7LUjLnawnFGGkoV8UpULbTkJY1hG",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvgK37Sw7LUjLnawnFGGkoV8UpULbTkJY1hG",
            "explicit": false,
            "duration": 203000
        },
        {
            "id": "soundtrack:track:3WeUZYBDlr4vxBnxRENvBD",
            "title": "Private Eyes - Remastered",
            "artists": [
                "Daryl Hall & John Oates"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduC4tft7mJWtZB6G71HUM3L7RvHKoHW7kA",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduC4tft7mJWtZB6G71HUM3L7RvHKoHW7kA",
            "explicit": false,
            "duration": 217000
        },
        {
            "id": "soundtrack:track:5Fqrdc3y2NDpC8eXQf3Yqg",
            "title": "That's The Way Love Goes",
            "artists": [
                "Janet Jackson"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvdu1VWvjbQKfru9TqtcVLkGHBdZf7Ycq9HQ",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvdu1VWvjbQKfru9TqtcVLkGHBdZf7Ycq9HQ",
            "explicit": true,
            "duration": 265000
        },
        {
            "id": "soundtrack:track:0hL6MKzMn6BHNEXG85Xafj",
            "title": "Don't Let the Sun Go Down on Me",
            "artists": [
                "george michael & elton john",
                "George Michael",
                "Elton John"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJXfqLgpip7ojp3rmT5YxUEayAgpjvEGBp",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJXfqLgpip7ojp3rmT5YxUEayAgpjvEGBp",
            "explicit": false,
            "duration": 347000
        },
        {
            "id": "soundtrack:track:01LatXfQtYB7ioQbLuxOub",
            "title": "Half a Person - 2011 Remaster",
            "artists": [
                "The Smiths"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJiFBiddGTpfsaChrP54t9Fpk9Dimq7cyU",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJiFBiddGTpfsaChrP54t9Fpk9Dimq7cyU",
            "explicit": false,
            "duration": 218000
        },
        {
            "id": "soundtrack:track:0H61Wu9whmPgruUlduFpfh",
            "title": "I Wish It Would Rain Down - 2016 Remaster",
            "artists": [
                "Phil Collins"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvfv4f8xs6wGCVwx63tD4urYZt23NbfdyJFQ",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvfv4f8xs6wGCVwx63tD4urYZt23NbfdyJFQ",
            "explicit": false,
            "duration": 328000
        },
        {
            "id": "soundtrack:track:5ksizPv3eSTshpLNl6Q5c9",
            "title": "Rhythm Of The Night",
            "artists": [
                "DeBarge"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvf7JAVHTio9QExXe5YZm6GCwq5HEkPS3Ujx",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvf7JAVHTio9QExXe5YZm6GCwq5HEkPS3Ujx",
            "explicit": false,
            "duration": 228000
        },
    ]
