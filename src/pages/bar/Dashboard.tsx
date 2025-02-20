import { Accordion, Col, Modal, Spinner } from "react-bootstrap";
import { DisplayOrLoading } from "../../components/DisplayOrLoading";
import { Colors, modalZ, padding, radius, smallPadding, topBarZ, useFdim } from "../../lib/Constants";
import { Dispatch, memo, SetStateAction, useContext, useEffect, useState } from "react";
import { UserSessionContext, UserSessionContextType } from "../../lib/UserSessionContext";
import ProfileButton from "../../components/ProfileButton";
import Queue from "./Queue";
import { fetchWithToken, getBusiness } from "../..";
import { FitAnalysisType, SongRequestType, SongType } from "../../lib/song";
import { etaBuffer, getCookies, millisToMinutesAndSeconds, parseSongJson, useInterval, stringArrayToStringFormatted, numberToPrice, isMobile } from "../../lib/utils";
import _, { eq } from "lodash";
import BigLogo, { SmallLogo } from "../../components/BigLogo";
import Song, { compactSongStyle } from "../../components/Song";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faChevronLeft, faChevronRight, faCheckCircle, faQuestionCircle, faWarning, faXmark, faXmarkCircle, IconDefinition } from "@fortawesome/free-solid-svg-icons";
import Dropdown from 'react-bootstrap/Dropdown';
import TZHeader from "../../components/TZHeader";
import Stats from "./Stats";
import PlaybackComponent, { getStreamingService } from "./PlaybackComponent";
import Price from "./Price";
import useWindowDimensions from "../../lib/useWindowDimensions";
import { router } from "../../App";
import { AlertContentType, AlertModal } from "../../components/Modals";
import { PlaylistScreen } from "./PlaylistScreen";
import DJSettings from "./DJSettings";
import TZToggle from "../../components/TZToggle";
import { Search } from "./Search";
import Border from "../../components/Border";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { NotFoundPage } from "./NotFoundPage";
import TZButton from "../../components/TZButton";
import Account from "../profile/Account";
import CurrentlyPlayingBar from "../../components/CurrentlyPlayingBar";
import SearchBar from "../../components/SearchBar";
import { MenuSelection } from "../../components/MenuSelection";
import QueueRequestsDJ from "./QueueDJ";
import NotPlaying from "../../components/NotPlaying";
import Finances from "./Finances";

const BACKEND_STATUS = ["OPENING", "PEAK", "CLOSING"];

export type PageType = "Queue" | "Requests" | "Account" | "Settings" | "Loading" | "Finances" | "Unknown";
const PAGES: PageType[] = ["Queue", "Requests", "Finances", "Account"];


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

export type CategoryType = "location" | "era" | "instrumental";

export type TagType = {
    label: string,
    category: CategoryType
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

export type QueueOrderType = {
    song: SongType,
    id: string,
}

const songToQOID = (v: SongType, i: number) => {
    return { song: v, id: v.id + "_" + i };
}

const queueToQueueID = (q: SongType[]) => {
    return q.map(songToQOID);
}

export default function Dashboard() {
    const usc = useContext(UserSessionContext);
    const bar = usc.user;
    const location = useLocation();

    const pathname = location.pathname.split("/")[1];
    // const [PAGE, setPage] = useState<PageType>("Loading");

    let PAGE: PageType = "Loading";
    const setPage = (page: PageType) => router.navigate("/" + page.toLowerCase());

    let DEFAULT_FINPAGE = 1;
    const [params, setParams] = useSearchParams();

    // alert(pathname);

    switch (pathname) {
        case "dashboard":
            PAGE = "Queue";
            break;
        case "account":
            PAGE = "Account";
            break;
        case "requests":
            PAGE = "Requests";
            break;
        case "queue":
            PAGE = "Queue";
            break;
        case "finances":
            PAGE = "Finances";
            DEFAULT_FINPAGE = parseInt(params.get("page") ?? "1");
            break;
        default:
            PAGE = "Unknown";
            break;
    }

    const [ready, setReady] = useState(false);
    const [isSetup, setIsSetup] = useState(false);
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

    const initialQO: QueueOrderType[] = queue ? queueToQueueID(queue) : []
    const qO = useState<QueueOrderType[]>(initialQO);

    const [queueOrder, setQueueOrder] = qO; //queue AFTER we mess w it. what we actually display.
    const [editingQueue, setEditingQueueIn] = useState(false); //is "editing" on?
    const setEditingQueue: Dispatch<SetStateAction<boolean>> = (b: boolean | ((prevState: boolean) => boolean)) => {
        setEditingQueueIn(b);
    }
    const eQ: [boolean, Dispatch<SetStateAction<boolean>>] = [editingQueue, setEditingQueue]; //is "editing" on?
    const [reordering, setReordering] = useState(false); //is actively reordering queue?
    const [lastPullTime, setLastPullTime] = useState(-1);

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
    const [djSongs, setDJSongs] = useState<SongType[] | undefined>();
    const [djTags, setDJTags] = useState<TagType[]>([]);

    const [shuffleValue, setShuffleValue] = useState<ShuffleType>("Playlist");

    const songRequestSongRatio = 40;
    const compactSongDim = 40;
    const compactRequestSecondHalfCols = `1fr 1.5fr 2fr 0.5fr`;

    //finances
    const [finSongRequestHistory, setFinSongRequestHistory] = useState<SongRequestType[]>([]);
    const [finHistoryPageCount, setFinHistoryPageCount] = useState(0);
    const [finTotalAmount, setFinTotalAmount] = useState(0);

    const finHistoryPage = DEFAULT_FINPAGE;

    //TODO REMOVE THIS LATER
    const sessionStarted = true//djSettingPlayingNumber !== undefined;

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
        updateFinancesHistory(finHistoryPage);
    }, [finHistoryPage])

    useEffect(() => {
        console.log("editingQueue", editingQueue)
        if (editingQueue) {
            const q = queue;
            const qDef = q ?? [];
            const newQ: SongType[] = [];
            const qids = qDef.map(v => v.id);
            // console.log(q)

            if (q !== undefined && qids.length !== 0 && JSON.stringify(q) !== JSON.stringify(queueOrder)) {
                for (let i = 0; i < queueOrder.length; i++) {
                    if (qids.indexOf(queueOrder[i].id) !== -1) {
                        console.log("pushing", newQ)
                        newQ.push(queueOrder[i].song);
                    }
                }
                for (let i = newQ.length; i < qDef.length; i++) {
                    newQ.push(q[i]);
                }
                console.log("setting Qo", newQ);
                setQueueOrder(queueToQueueID(newQ));
            }
        } else {
            setQueueOrder(queueToQueueID(queue ?? []));
        }
    }, [queue, setQueueOrder, editingQueue])

    const setQueue = (q: SongType[] | undefined, reset?: boolean) => {
        setQueueIn(q);
    }

    async function reorderQueue() {
        if (reordering) return;
        setReordering(true);

        const minimumTimeLeft = 30000;
        const timeSinceLastPull = lastPullTime > 0 ? Date.now() - lastPullTime : 0;
        console.log("tslpNEW", timeSinceLastPull, "left:", currentlyPlaying ? currentlyPlaying[1].durationMs - currentlyPlaying[1].progressMs - timeSinceLastPull : "NaN");

        if (!currentlyPlaying || currentlyPlaying[1].durationMs - currentlyPlaying[1].progressMs - timeSinceLastPull < minimumTimeLeft) {
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

        const map = queueOrder.map((q) => {
            const v = q.song
            return {
                artist: v.artists, explicit: v.explicit, duration_ms: v.duration ?? 0,
                id: v.id, images: { thumbnail: v.albumart }, manually_queued: v.manuallyQueued, name: v.title,
            }
        });

        let lastEditedIndex = 0;

        for (let i = queueOrder.length - 1; i > 0; i--) {
            if (queueOrder[i].song.manuallyQueued || JSON.stringify(queueOrder[i]) !== JSON.stringify(queue[i])) {
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

        console.log("reorder OUT", message);

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

    const updateFinancesHistory = async (n: number) => {
        const [fhistory, pcount, totalAmount] = await getFinancesHistory(usc, n).catch((e) => { console.log("ERROR", e); return [] });
        setFinTotalAmount(totalAmount * 0.75);
        setFinHistoryPageCount(pcount);
        if (!_.isEqual(fhistory, finSongRequestHistory)) setFinSongRequestHistory(fhistory);
    }

    const refreshAllData = async () => {
        console.log("refreshing all");
        //reqs
        const requests = await getRequests(usc, deletedIds, deletedCheckAgain);

        console.log("requests", requests)

        if (!_.isEqual(requests, songRequests)) setSongRequests(requests);

        //queue
        const cq = await refreshQueue();
        setLastPullTime(Date.now());

        //stats
        // const stats = await getFinancesStats(usc);
        // console.log("bar stats", stats)
        // if (!_.isEqual(stats, financeStats)) setFinanceStats(stats);

        //finance history?
        await updateFinancesHistory(finHistoryPage);

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

        const decadesStrings: string[] = b.dj_decades ?? [];
        const decades: TagType[] = decadesStrings.map(v => { return { label: v, category: "era" } })

        //TODO: Aggregate all tags here!
        const tags: TagType[] = [...decades]

        const index = BACKEND_STATUS.indexOf(status);

        setDJSettingPlayingNumberIn(index);
        setDJCurrentSettingNumberIn(index);

        setDJTags(tags);
        setDJEnergy(energy * 10);
        setDJBangersOnly(energy * 10);
        const setting: DJSettingsType = {
            genres: genres.toString().split(", "),
            energy: energy * 10,
            popularity: popularity * 10,
        }

        const settings = [...djSettings];
        settings[index] = setting;

        setDJSettings(settings);
    }

    const checkIfSetup = async () => {
        const res = await getStreamingService(usc);
        const streamingService = res.streamingService;
        if (streamingService === "NONE") {
            setIsSetup(false);
        } else {
            setIsSetup(true);
        }
    }

    const initAll = async () => {
        await initDJ();
        await checkIfSetup();
        // await updateFinancesHistory(finHistoryPage);
        await refreshAllData();
    }

    useEffect(() => {
        refreshPrice(true);
        initAll().then(() => {
            console.log("ready!")
            setReady(true);
        }
        ).catch((e) => { console.error(e); setReady(true) });
    }, []);

    useInterval(refreshAllData, refreshQueueTime, 500, false);

    // console.log("UE REFRESH ALL")
    ///() => rejectAll()

    const toggleTakeRequests = async (b: boolean) => {
        await setAllowingRequests(usc, b);
        setToggles(...await getToggles(usc));
    }

    const Requests = () => {
        const outlineColor = Colors.tertiaryDark;
        return (
            <div style={{ paddingTop: padding, paddingBottom: padding, width: "100%", height: "100%", borderRadius: radius, overflow: isMobile() ? 'scroll' : undefined }}>
                <div style={{ paddingLeft: padding, paddingRight: padding }}>
                    <span className="App-tertiarytitle">Pending Requests</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: padding / 2 }}>
                        <RejectAllButton onClick={rejectAll} />
                        <div style={{ display: 'flex' }}>
                            <TZToggle title="Explicit" value={!toggleBlockExplicitRequests} onClick={async () => {
                                await setBlockExplcitRequests(usc, !toggleBlockExplicitRequests);
                                setToggles(...await getToggles(usc));
                            }} />
                            <div style={{ width: padding }} />
                            <TZToggle title="Take requests" value={toggleAllowRequests} onClick={() =>
                                toggleTakeRequests(!toggleAllowRequests)
                            } />
                        </div>
                    </div>
                    <Border />
                    {/* <div style={{ width: 50, height: 2000, backgroundColor: 'red' }}></div> */}

                    <div className="App-smalltext" style={{ width: "100%", display: 'flex', paddingBottom: smallPadding, fontWeight: 'bold', color: "#fff8" }}>
                        <div style={{ flex: songRequestSongRatio, }}>
                            <div style={compactSongStyle(compactSongDim)}>
                                <div>SONG</div>
                            </div>
                        </div>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: compactRequestSecondHalfCols,
                            flex: 100 - songRequestSongRatio,
                        }}>
                            <div>PRICE</div>
                            <div>USER</div>
                            <div>ADD TO QUEUE</div>
                            <span style={{ textAlign: 'right' }}>MATCH</span>
                        </div>
                    </div>
                </div>
                {currentlyPlaying && sessionStarted ?
                    (songRequests.length > 0 ?
                        <div style={{ width: "100%" }}>
                            {/* <div style={{ display: 'flex', justifyContent: "flex-end" }}>
                                <div style={{ position: 'relative', right: 10, backgroundColor: outlineColor, paddingBottom: 5, paddingLeft: 5, paddingRight: 5, borderStartStartRadius: radius, borderStartEndRadius: radius }}>
                                    <span className="App-smalltext" style={{ fontWeight: 'bold' }}> [ 1 ] to Accept</span>
                                </div>
                                <div style={{ position: 'relative', right: 10, backgroundColor: outlineColor, paddingBottom: 5, paddingLeft: 5, paddingRight: 5, borderStartStartRadius: radius, borderStartEndRadius: radius }}>
                                    <span className="App-smalltext" style={{ fontWeight: 'bold' }}> [ 2 ] to Reject</span>
                                </div>
                            </div> */}
                            <SongRequestRenderItem request={songRequests[0]} index={0} first />
                        </div>
                        : <div style={{ padding: padding, width: "100%", display: 'flex', justifyContent: 'center', opacity: 0.7, textAlign: 'center' }}>
                            {acceptRadioValue === "Auto" ? <span>Since you're auto-accepting new requests, you won't see requests show up here for review.</span> :
                                acceptRadioValue === "TipzyAI" ? <span>You're letting Virtual DJ check if each request is a good fit. If it doesn't think a song matches your vibe, it'll put it here for you to decide.</span>
                                    : (toggleAllowRequests ? <span>No new song requests...yet!</span> : <span>You're currently not taking any more requests.</span>)}
                        </div>)
                    : <div style={{ padding: padding }}><NotPlaying /></div>
                }
                {songRequests.length > 1 ?
                    songRequests.slice(1).map((r, i) =>
                        <div style={{ paddingTop: smallPadding }}>
                            <SongRequestRenderItem request={r} key={i + "key"} index={i + 1} />
                        </div>
                    )
                    : <></>
                }
            </div>
        )
    }

    const SongRequestRenderItem = (props: { request: SongRequestType, index: number, first?: boolean }) => {
        const request = props.request;

        const dim = compactSongDim;

        const Button = (props: { icon: IconDefinition, color: string, onClick: () => void }) => {
            const [mouseHover, setMouseHover] = useState(false);

            return (
                <div
                    onMouseEnter={() => setMouseHover(true)}
                    onMouseLeave={() => setMouseHover(false)}
                    onClick={props.onClick}

                    style={{
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        width: dim - smallPadding, height: dim - smallPadding, transform: `scale(${(mouseHover ? 1.2 : 1)})`,
                        borderRadius: "100%", borderStyle: "solid", borderColor: props.color,
                        transition: "transform .1s ease", WebkitTransition: ".1s ease",
                        cursor: "pointer"
                    }}>
                    <FontAwesomeIcon icon={props.icon} fontSize={dim * 0.5} color={props.color}></FontAwesomeIcon>
                </div>
            )
        }

        const colEl: React.CSSProperties = { height: "100%", display: "inline-flex", flexDirection: 'column', justifyContent: 'center', overflow: "hidden", minWidth: 0, paddingRight: padding }
        const first = props.first;

        const parseFitAnalysis = (str: string): FitAnalysisType => {
            const first = str.substring(0, 1);

            switch (first) {
                case "G":
                    return "GOOD";
                case "O":
                    return "OK";
                case "B":
                    return "BAD";
                case "P":
                    return "PENDING";
                default:
                    return "UNKNOWN";
            }
        }

        const FitAnalysis = (): JSX.Element => {
            const fitAnalysis = parseFitAnalysis(request.fitAnalysis.toUpperCase())

            switch (fitAnalysis) {
                case "GOOD":
                    return <FontAwesomeIcon fontSize={dim * 0.5} icon={faCheckCircle} color={Colors.green} />;
                case "OK":
                    return <FontAwesomeIcon fontSize={dim * 0.5} icon={faQuestionCircle} color={Colors.primaryRegular} />;
                case "BAD":
                    return <FontAwesomeIcon fontSize={dim * 0.5} icon={faXmarkCircle} color={Colors.red} />;
                case "PENDING":
                    return <Spinner size={"sm"} />;
                default:
                    return <FontAwesomeIcon fontSize={dim * 0.5} icon={faWarning} color={"white"} />;
            }
        }

        return (
            <div style={{
                width: "100%",
                //paddingTop: first ? smallPadding : 0, paddingBottom: first ? smallPadding : 0, 
                paddingLeft: padding, paddingRight: padding,
                paddingTop: smallPadding, paddingBottom: smallPadding,
                backgroundColor: props.index % 2 === 1 ? "#0002" : undefined
            }}>
                {/* <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                        <span className="App-smalltext" style={{ fontWeight: 'bold', color: Colors.primaryRegular }}> {request.price === 0 ? "FREE REQUEST" : `$${numberToPrice(request.price)}`}</span>
                    </div>
                    <span className="App-smalltext">{request.user.first_name} {request.user.last_name}</span>
                </div> */}
                <div style={{ display: "flex", alignItems: 'center', }}>
                    <div style={{ flex: songRequestSongRatio }}>
                        <Song song={request.song} dims={dim} requestDate={request.date} compact />
                    </div>
                    <div style={{ flex: 100 - songRequestSongRatio, display: 'grid', gridTemplateColumns: compactRequestSecondHalfCols, }}>
                        <span style={{ lineHeight: 2 }} className="onelinetextplain">{request.price === 0 ? "FREE" : `$${numberToPrice(request.price)}`}</span>
                        <span style={{ lineHeight: 2 }} className="onelinetextplain">{request.user.first_name} {request.user.last_name}</span>
                        <div style={{ display: "flex", alignItems: 'center' }}>
                            <Button icon={faXmark} color={"white"} onClick={() => rejectOnPress(request.id, props.index)}></Button>
                            <div style={{ paddingLeft: padding }}></div>
                            <Button icon={faCheck} color={Colors.primaryRegular} onClick={() => acceptOnPress(request, props.index).catch((e: Error) => alert(`Error accepting request. ${e.message}`))}></Button>
                        </div>
                        <div style={{ display: "flex", alignItems: 'center', justifyContent: 'flex-end', }}>
                            <FitAnalysis></FitAnalysis>
                        </div>
                    </div>

                    {/* <div style={{ flex: 1, display: "flex", alignItems: 'center' }}>
                        <Button icon={faXmark} color={"white"} onClick={() => rejectOnPress(request.id, props.index)}></Button>
                        <div style={{ paddingLeft: padding }}></div>
                        <Button icon={faCheck} color={Colors.primaryRegular} onClick={() => acceptOnPress(request, props.index).catch((e: Error) => alert(`Error accepting request. ${e.message}`))}></Button>
                    </div> */}
                </div>
                {/* <span className="App-smalltext" style={{ fontWeight: "bold" }}>Vibe check: {request.fitAnalysis}. </span>
                <span className="App-smalltext">{request.fitReasoning}</span> */}
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

    const sendDJSettings = async () => {
        const current = djSettings[djCurrentSettingNumber];

        console.log("current", djSettings)


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
                dj_status: BACKEND_STATUS[djCurrentSettingNumber] ?? "PEAK",
                dj_decade: stringArrayToStringFormatted(djTags.filter(v => v.category === "era").map(v => v.label))
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

            setDJSongs(_.shuffle(tracks));

            getQueueUpdatePause();

            console.log("DJ Settings response json", json);
            console.log("DJ TRACKS", tracks)
        }
    }

    const setFinancesPage = async (n: number) => {
        router.navigate(`/finances?page=${n}`)
    }

    return (
        <DisplayOrLoading condition={ready} loadingScreen={<LoadingScreen />}>
            <div className="App-body-main">
                <Modal dialogClassName="search-modal" show={searchVisible} onShow={() => {
                    setDisableTyping(true);
                }} onHide={onSearchModalClose}
                    style={{ color: "white", zIndex: modalZ }}

                    data-bs-theme={"dark"}>
                    {/* <Modal.Title>
                {props.content?.title}
            </Modal.Title> */}
                    {/* <Modal.Body style={{ color: "white", padding: 0, }}> */}
                    <Search onClose={onSearchModalClose} />
                    {/* </Modal.Body> */}
                </Modal>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: "100%", padding: padding, backgroundColor: Colors.black, position: 'sticky', top: 0, zIndex: topBarZ }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <SmallLogo />
                        {/* <span className="App-montserrat-normaltext" style={{ paddingLeft: padding, fontWeight: 'bold', color: "#fff8" }}>Biz Dashboard</span> */}
                        <div style={{ display: 'flex', alignItems: 'center', paddingLeft: padding }}>
                            {/* <span style={{ paddingRight: padding, fontWeight: 'bold' }}>Bar's ID: {bar.business_id}</span> */}
                            <ProfileButton position="relative" name={bar.business_name}></ProfileButton>
                        </div>
                    </div>
                    <div style={{}}>
                        <SearchBar onClick={() => setSearchVisible(true)} />
                    </div>
                </div>
                {
                    !isSetup ?
                        PAGE === "Account" ? <Account /> :
                            <SetupPage setIsSetup={setIsSetup} setDisableTyping={setDisableTyping} />
                        :
                        <>
                            {
                                !toggleAllowRequests ?
                                    <div style={{ width: "100%", textAlign: "center", padding: padding, backgroundColor: Colors.tertiaryDark, display: "flex", justifyContent: 'center', alignItems: 'center' }}>
                                        <span><FontAwesomeIcon icon={faWarning} /> You have requests disabled.</span>
                                        <span onClick={() => toggleTakeRequests(true)} style={{ color: Colors.primaryLight, paddingLeft: 5, cursor: 'pointer' }}><b>Turn on</b></span>
                                    </div> :
                                    (!currentlyPlaying || !sessionStarted) ?
                                        <div style={{ width: "100%", textAlign: "center", padding: padding, backgroundColor: Colors.tertiaryDark, display: "flex", justifyContent: 'center', alignItems: 'center' }}>
                                            <span><FontAwesomeIcon icon={faWarning} /> Start playing music on your streaming service to accept requests and view the queue!</span>
                                        </div>
                                        :
                                        <></>

                            }
                            <div style={{
                                // display: 'grid', gridTemplateColumns: '200px, 1fr', 
                                display: 'flex',
                                flexDirection: isMobile() ? 'column-reverse' : 'row',
                                width: "100%", height: "100%", overflow: "scroll"
                            }}>
                                <MenuSelection currentPage={PAGE} pages={PAGES} setPage={setPage} />
                                {isMobile() ? <CurrentlyPlayingBar queueLoading={queueLoading} pauseOverride={pausedUI} current={currentlyPlaying} onPause={onPause} onSkip={onSkip} lastPullTime={lastPullTime} /> : <></>}
                                {
                                    PAGE === "Queue" ?
                                        <QueueRequestsDJMemo
                                            energyState={[djEnergy, setDJEnergy]}
                                            bangersState={[djBangersOnly, setDJBangersOnly]}
                                            tagsState={[djTags, setDJTags]}
                                            sendDJSettings={sendDJSettings}
                                            djSettingPlayingNumberState={[djSettingPlayingNumber, setDJSettingPlayingNumber]}
                                            djSettingsState={[djSettings, setDJSettings]}
                                            djCurrentSettingNumberState={[djCurrentSettingNumber, setDJCurrentSettingNumber]}
                                            acceptRadioValueState={[acceptRadioValue, setAcceptRadioValue]}
                                            shuffleRadioValueState={[shuffleValue, setShuffleValue]}
                                            onSetShuffle={onSetShuffle}
                                            onSetAccept={onSetAccept}
                                            disableTypingState={[disableTyping, setDisableTyping]}
                                            setToggles={setToggles}
                                            toggleBlockExplicitRequestsState={[toggleBlockExplicitRequests, setToggleBlockExplcitRequests]}
                                            onPause={onPause}
                                            onSkip={onSkip}
                                            queueLoading={queueLoading}
                                            queueOrder={qO}
                                            editingQueue={eQ}
                                            currentlyPlaying={currentlyPlaying}
                                            reorderingState={[reordering, setReordering]}
                                            sessionStarted={sessionStarted}
                                            reorderQueue={async () => {
                                                console.log('reordering', reordering)
                                                if (!reordering) {
                                                    try {
                                                        await reorderQueue().catch((e: Error) => {
                                                            //alert(e.message);
                                                            throw e;
                                                        });
                                                        setReordering(false);
                                                    }
                                                    catch (e) {
                                                        setReordering(false);
                                                        throw e;
                                                    }
                                                }
                                            }}
                                        />
                                        : PAGE === "Account" ? <Account />
                                            : PAGE === "Finances" ? <Finances
                                                totalRevenue={finTotalAmount}
                                                minPriceState={[miniumumPrice, setMinimumPrice]}
                                                currPriceState={[currentPrice, setCurrentPrice]}
                                                refresh={getPrice}
                                                requests={finSongRequestHistory}
                                                page={finHistoryPage}
                                                setPage={setFinancesPage}
                                                songCount={finHistoryPageCount} />
                                                : PAGE === "Requests" ? <Requests />
                                                    : <NotFoundPage title="404" body="We can't seem to find that page. Make sure you have the correct address!" backPath={-1} />
                                }
                                {/* </div> */}
                            </div>
                            {isMobile() ? <></> : <CurrentlyPlayingBar queueLoading={queueLoading} pauseOverride={pausedUI} current={currentlyPlaying} onPause={onPause} onSkip={onSkip} lastPullTime={lastPullTime} />}
                        </>
                }
                <AlertModal onHide={() => setAlertContent(undefined)} content={alertContent} />
            </div >
        </DisplayOrLoading >
    )
}

const QueueRequestsDJMemo = memo(QueueRequestsDJ);

const SetupPage = (props: { setIsSetup: (b: boolean) => any, setDisableTyping: (b: boolean) => void }) => {
    return (
        <div style={{ padding: padding, overflow: isMobile() ? 'scroll' : undefined, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span className="App-subtitle">One last step!</span>
            <span style={{ padding: padding, textAlign: 'center' }}>To start the music, tap below to set up your streaming service!</span>
            <div style={{ display: 'flex' }}>
                <PlaybackComponent setHasStreamingService={props.setIsSetup} setDisableTyping={props.setDisableTyping} />
            </div>
        </div>
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

const parseRequestJSON = (json: any): SongRequestType => {
    const user = {
        first_name: json.tipper_info?.tipper_info.first_name,
        last_name: json.tipper_info?.tipper_info.last_name,
        email: json.tipper_info?.tipper_info.email
    }

    const songJSON = json.song_json;
    return ({
        user: user,
        id: json.id,
        song: { title: songJSON.name, artists: [songJSON.artist], albumart: songJSON.image_url, id: songJSON.id, explicit: songJSON.explicit ?? false },
        price: json.price,
        fitAnalysis: json.fit_analysis,
        fitReasoning: json.fit_reasoning,
        date: new Date(json.request_time),
    })
}

const getRequests = async (usc: UserSessionContextType, deletedIds: Map<number, number>, deletedCheckAgain: number): Promise<SongRequestType[]> => {
    return fetchWithToken(usc, "business/requests/", "GET").then(response => {
        // console.log("Refresh Request" + (performance.now() - start))
        if (!response) throw new Error("null response");
        if (!response.ok) throw new Error("Bad response " + response.status);
        // console.log(response);
        return response.json();
    }).then(json => {
        console.log("requests json", json);

        const out: SongRequestType[] = [];

        for (const item of json.data) {
            const songJSON = item.song_json;
            const exptime = deletedIds.get(item.id);
            console.log("requests exptime", exptime)
            if (!exptime || exptime + deletedCheckAgain < Date.now()) {
                console.log("req pushing out!", item)
                out.push(parseRequestJSON(item))
            }
        }

        console.log("requests out", out)

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

export const setBlockExplcitRequests = async (usc: UserSessionContextType, b: boolean) => {
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
                display: 'flex', alignItems: 'flex-start', cursor: 'pointer'
            }} onClick={props.onClick}>
            <div style={{ display: 'inline-flex' }}>
                <div
                    onMouseEnter={() => setOpacity(0.7)}
                    onMouseLeave={() => setOpacity(1)}
                    onMouseDown={() => setOpacity(0.5)}
                    style={{
                        display: 'inline-block', paddingBottom: 1, paddingLeft: 3, paddingRight: 3, borderRadius: 5, fontSize: fdim / 50, fontWeight: 'bold',
                        opacity: opacity, backgroundColor: Colors.red,
                        transition: "all 0.2s"
                    }}>
                    <span className="App-montserrat-smallertext">
                        Reject All
                    </span>
                </div>
            </div>
        </div >
    )
}

export const getToggles = async (usc: UserSessionContextType): Promise<[boolean, AcceptingType, boolean]> => {
    const u = await getBusiness(usc).catch((e: Error) => console.log("Can't get acc in toggles", e.message));
    return ([u.data.allowing_requests, checkAutoAccept(u.data.auto_accept_requests, u.data.gpt_accept_requests), u.data.block_explicit]);
}

const getFinancesStats = async (usc: UserSessionContextType): Promise<FinanceStatsType | undefined> => {
    const json = await fetchWithToken(usc, `get_bar_stats/`, 'GET').then(r => r.json()).catch((e: Error) => { console.log("Can't get acc in toggles", e.message); return undefined; });
    if (json.status !== 200) {
        console.log("bad response getting finance stats.", json)
        return undefined
    }
    if (!json || !json.stats) return undefined;
    const stats: FinanceStatsType = {
        pendingBarCut: json.stats.Pending_bar_cut,
        pendingRequests: json.stats.pending_requests,
        barCut: json.stats.bar_cut,
        totalRequests: json.stats.count_requests,
        totalCustomers: json.total_customers,
    }
    return stats;
}

//all requests, count, totalamount
const getFinancesHistory = async (usc: UserSessionContextType, page: number): Promise<[SongRequestType[], number, number]> => {
    const json = await fetchWithToken(usc, `business/get_song_request_history/?page=${page}`, 'GET').then(r => r.json()).catch((e: Error) => { console.log("Can't get song request history", e.message); return undefined; });
    if (json.status !== 200) {
        console.log("bad response getting song request history.", json)
        return [[], -1, -1];
    }

    const data = json.data;

    console.log("finances history", json);

    const count = data.requests.count;
    const results = data.requests.results;
    const totalAmount = data.total_amount;

    const out: SongRequestType[] = [];

    for (const result of results) {
        out.push(parseRequestJSON(result));
        // console.log("pushing to prj", result)
    }

    console.log("prj out", out);

    // const stats: FinanceStatsType = {
    //     pendingBarCut: json.stats.Pending_bar_cut,
    //     pendingRequests: json.stats.pending_requests,
    //     barCut: json.stats.bar_cut,
    //     totalRequests: json.stats.count_requests,
    //     totalCustomers: json.total_customers,
    // }
    return [out, count, totalAmount];
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
            console.log("raw data", json)

            qD.forEach((e: any) => {
                const song: SongType = parseSongJson(e);
                q.push(song);
            })

            return [np, q, { isLocked: isLocked, top: q[0] }];
        })
}

// const DJSettingsMemo = memo(DJSettings, (prev, next) => {
//     return true;
// });
