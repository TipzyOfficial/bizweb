import { Modal, Spinner, ToggleButton } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import { Colors, padding as basePadding, padding, radius, useFdim } from "../../lib/Constants";
import { DisplayOrLoading } from "../../components/DisplayOrLoading";
import { memo, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BarType } from "../../lib/bar";
import { fetchWithToken } from "../..";
import { UserSessionContext, UserSessionContextType } from "../../lib/UserSessionContext";
import { getCookies, shuffle, shuffleWithUserID, useCallbackRef, useInterval } from "../../lib/utils";
import TZSearchButton from "../../components/TZSearchButton";
import { ArtistType, SongRequestType, SongType, songRequestCompare } from "../../lib/song";
import Song, { SongList } from "../../components/Song";
import Artist from "../../components/Artist";
import { ScrollMenu } from 'react-horizontal-scrolling-menu';
import 'react-horizontal-scrolling-menu/dist/styles.css';
import useWindowDimensions from "../../lib/useWindowDimensions";
import { router } from "../../App";
import ProfileButton from "../../components/ProfileButton";
import ToggleTab from "../../components/ToggleTab";
import RequestsContent from "./Requests";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { NotFoundPage } from "./NotFoundPage";
import Lottie from 'react-lottie';
import speakerAnimation from '../../assets/Speakers.json';
import AnimateHeight from 'react-animate-height';

import '../../App.css'
import React from "react";
import FlatList from "flatlist-react/lib";
import { fetchNoToken } from "../../lib/serverinfo";
import defaultBackground from "../../assets/default_background.png"
import TZButton from "../../components/TZButton";
import TopBar from "../../components/TopBar";

const utf8Encode = new TextEncoder();

function parseSongIHateMeku(s: any): SongType {
    return { id: s.id, title: s.name, artists: [s.artist], albumart: s.image_url, explicit: s.explicit ?? false }
}

function parseSong(s: any): SongType {
    return { id: s.id, title: s.name, artists: s.artists, albumart: s.images[2].url, albumartbig: s.images[0].url, explicit: s.explicit }
}

function parseBusiness(b: any): BarType {
    return {
        id: b.id,
        name: b.business_name,
        type: b.business_type,
        description: b.description,
        active: b.active,
        allowingRequests: b.allowing_requests,
        image_url: b.image_url
    }
}

const LoadingScreen = () =>
    <div className="App-header">
        <Spinner style={{ color: Colors.primaryRegular, width: 75, height: 75 }} />
        <br></br>
        <span>Loading bar information...</span>
    </div>;

let currentPCache: SongType | undefined = undefined;
let pendingReqsCache: SongRequestType[] = [];
let allReqsCache: SongRequestType[] = [];

export const fetchBarInfo = async (userContext: UserSessionContextType, id: number, noSetBar?: boolean) => {
    const bar: BarType | undefined = await fetchNoToken(`tipper/business/${id}`, 'GET').then(r => r.json())
        .then(json => {
            return {
                id: json.id,
                name: json.business_name,
                type: json.business_type,
                image_url: json.image_url,
                description: json.description,
                active: json.active,
                allowingRequests: json.allowing_requests,
            }
            // setBar(bar);
        }).catch((e: Error) => {
            // alert("Error loading your bar: " + e.message);
            return undefined;
        })

    if (!bar) {
        userContext.barState.setBar(bar)
        return undefined;
    }

    await fetchNoToken(`tipper/business/top/?business_id=${id}`, 'GET').then(r => r.json()).then(json => {
        const data = json.data;
        const artistData = data.artists;
        const songData = data.songs;

        const artists: ArtistType[] = [];

        artistData.forEach((e: any) => {
            const artist: ArtistType = { name: e.name, image: e.images.teaser, id: e.id }
            artists.push(artist);
        })

        bar.topArtists = artists;

        const songs: SongType[] = [];

        let j = 0;

        songData.forEach((e: any) => {
            j++;
            const song: SongType = { title: e.name, albumart: e.images?.thumbnail ?? "", albumartbig: e.images?.teaser ?? "", id: e.id, explicit: e.explicit, artists: e.artists }
            songs.push(song);
        })

        const top = shuffleWithUserID(songs.splice(0, 20), userContext.user);

        bar.topSongs = top.concat(songs);
    }).catch(e => console.log("cant get top artists", e));

    if (!noSetBar) {
        if (!userContext.barState.bar || JSON.stringify(userContext.barState.bar) !== JSON.stringify(bar))
            userContext.barState.setBar(bar)
    }
    return bar;
}

export default function Bar() {
    const [searchParams] = useSearchParams();
    const usc = useContext(UserSessionContext);
    const [ready, setReadyUn] = useState(false);
    const [view, setViewInner] = useState(0);
    // const [requestNoti, setRequestNoti] = useState(false)
    // const [requests, setRequests] = useState<SongRequestType[]>([]);
    const cookies = getCookies();
    const bar = usc.barState.bar;
    const topSongs = bar?.topSongs ?? [];
    const topArtists = bar?.topArtists ?? [];
    const id = searchParams.get("id") ?? (usc.barState.bar ? usc.barState.bar.id : cookies.get("bar_session"));
    const wdim = useWindowDimensions();
    const fdim = useFdim();
    const padding = basePadding;//fdim ? Math.max(Math.min(fdim / 50, 30), basePadding) : basePadding;
    const songDims = fdim ? Math.max(Math.min(fdim / 10, 75), 50) : 50;
    const artistDims = fdim ? Math.max(Math.min(fdim / 4.3, 200), 50) : 120;
    const searchDims = fdim ? Math.max(Math.min(fdim / 17, 40), 20) : 20;
    const minHeaderHeight = wdim.height && wdim.width ? Math.max(wdim.height / 4, 250) : 250; // Math.max(Math.min(wdim.width / 5, wdim.height / 4), 250) : 250;
    // const toggleRef = useRef<HTMLDivElement>(null);
    // const [topBarRef] = useHookWithRefCallback(); //useRef<HTMLDivElement>(null);

    const [height, setHeight] = useState<number | undefined>();
    // const [tbheight, setTBHeight] = useState<number | undefined>();
    const [topBar, topBarRef] = useCallbackRef<HTMLDivElement>();
    const [toggle, toggleRef] = useCallbackRef<HTMLDivElement>();

    const [pendingReqs, setPendingReqsUn] = useState<SongRequestType[]>(pendingReqsCache);
    const [allReqs, setAllReqsUn] = useState<SongRequestType[]>(allReqsCache);
    const [cload, setCloadUn] = useState(false);
    const timeout = 10000;
    const [current, setCurrentUn] = useState<SongType | undefined>(currentPCache);
    const [queue, setQueueUn] = useState<SongType[]>([]);
    const [topRequest, setTopRequest] = useState<SongRequestType | undefined>();
    const [disableEverything, setDisableEverything] = useState(false);
    const topBarColor = Colors.background + "bc";


    const notisCookie = cookies.get("notis")

    const [requestNoti, setRequestNotiIn] = useState(notisCookie ? parseInt(notisCookie) : 0);

    const setRequestNoti = (n: number) => {
        console.log(n);
        const v = Math.max(n, 0);
        cookies.set("notis", v);
        setRequestNotiIn(v);
    }

    const setPendingReqs = useCallback((p: SongRequestType[]) => setPendingReqsUn(p), [setPendingReqsUn]);
    const setAllReqs = useCallback((r: SongRequestType[]) => setAllReqsUn(r), [setAllReqsUn]);
    const setCurrent = useCallback((c: SongType | undefined) => setCurrentUn(c), [setCurrentUn]);
    const setQueue = useCallback((c: SongType[]) => { setQueueUn(c) }, [setQueueUn]);
    const setCload = useCallback((c: boolean) => setCloadUn(c), [setCloadUn]);
    const setReady = useCallback((r: boolean) => setReadyUn(r), [setReadyUn]);

    const setView = (v: number) => {
        if (v !== view) {
            // window.scrollTo({
            //     top: 0,
            //     left: 0,
            //     behavior: "instant",
            // })
            setHeight((toggle?.offsetHeight ?? 0) + (topBar?.offsetHeight ?? 0));
            setViewInner(v);
            if (v === 1) {
                setRequestNoti(0);
            }
        }
    }

    useLayoutEffect(() => {
        setHeight((toggle?.offsetHeight ?? 0) + (topBar?.offsetHeight ?? 0));
    }, [topBar, toggle])

    const getCurrentQueue = async (): Promise<[SongType | undefined, SongType[]] | undefined | null> => {
        return fetchNoToken(`tipper/business/queue/?business_id=${id}`, "GET").then(response => {
            if (response === null) throw new Error("null response");
            if (!response.ok) throw new Error("Bad response:" + response.status);
            return response.json();
        }).then(json => {
            if (json.data === undefined) return undefined;
            const np = json.data.now_playing;
            const nowplaying = np ? { title: np.track_name, artists: np.artists, albumart: np.images.thumbnail, albumartbig: np.images.teaser, id: np.track_id, duration: np.duration_ms, explicit: np.explicit } : undefined;
            const q: SongType[] = [];
            json.data.queue.forEach((e: any) => {
                const song: SongType = { title: e.name, artists: e.artist, albumart: e.images.thumbnail, albumartbig: e.images.teaser, id: e.id, duration: e.duration_ms, explicit: e.explicit, manuallyQueued: e.manually_queued };
                q.push(song);
            });
            return [nowplaying, q];
        });
    }

    const refreshCurrent = () => {
        getCurrentQueue().then((r) => {
            if (!r) return;
            const [c, q] = r;
            if (!c) {
                setDisableEverything(true);
            } else {
                if (setDisableEverything) setDisableEverything(false)
            }
            setCurrent(c);
            setQueue(
                hasManuallyQueued(q) ? q.filter((e) => e.manuallyQueued) : q.splice(0, 1));
            currentPCache = c;
        })
    }

    const refreshAllReqs = async (indicator: boolean) => {

        console.log("refrehing all")
        if (usc.user.user.access_token === "") return;
        if (indicator) setCload(true);

        if (topRequest) {
            console.log("toppy time!!")
            const firstJson = await fetchWithToken(usc, `tipper/requests/business?business_id=${id}&limit=${1}&offset=${0}`, 'GET').then(r => r.json())
            const req = parseRequest(firstJson.data[0]);
            if (req.id === topRequest.id && req.status === topRequest.status) {
                return;
            }
            // setTopRequest(req);
        }

        const allr = await fetchWithToken(usc, `tipper/requests/business?business_id=${id}&limit=${15}&offset=${0}`, 'GET').then(r => r.json()).then(json => {
            setTopRequest(parseRequest(json.data[0]));
            console.log("allr", json)

            const reqs = new Array<SongRequestType>();
            const preqs = new Array<SongRequestType>();
            json.data.forEach((r: any) => {
                const req = parseRequest(r);
                if (req.bar.id === parseInt(id)) {
                    if (req.status === "PENDING") preqs.push(req);
                    else reqs.push(req);
                }
            })
            return [preqs, reqs];
        }).catch(() => { setCload(false); return [new Array<SongRequestType>(), new Array<SongRequestType>()] });

        const [p, r] = allr;

        const psort = p.sort(songRequestCompare);
        const asort = r.sort(songRequestCompare);

        if (JSON.stringify(psort) !== JSON.stringify(pendingReqsCache)) {
            setPendingReqs(psort);
            pendingReqsCache = psort;
        }

        if (JSON.stringify(asort) !== JSON.stringify(allReqsCache)) {
            // console.log(allReqsCache);
            if (allReqsCache.length !== 0 && view === 0) {
                // console.log("allReqsCache" + allReqsCache.length);
                if (asort.length - allReqs.length > 0) setRequestNoti(requestNoti + asort.length - allReqs.length);
            }
            setAllReqs(asort);
            allReqsCache = asort;
        }

        setCload(false);
    }

    const allRefresh = (indicator: boolean) => {
        // console.log("refreshing data...")
        refreshCurrent();
        refreshAllReqs(indicator);
    }

    // useEffect(() => console.log("rerendered everything"), [])
    useInterval(() => allRefresh(false), timeout, 500);

    useEffect(() => {
        getCookies().remove("artist_session");

        if (!id) {
            router.navigate("/code");
            return;
        }
        if (usc.barState.bar && id === usc.barState.bar.id.toString() && usc.barState.bar.allowingRequests) {
            setReady(true);
            fetchBarInfo(usc, id);
            return;
        }
        fetchBarInfo(usc, id).then(() => setReady(true))
            .catch(e => {
                usc.barState.setBar(undefined)
                setReady(true);
            });
        allRefresh(true);
    }, [])

    if (ready === false)
        return <LoadingScreen />
    else if (bar === undefined)
        return <NotFoundPage body="That bar doesn't seem to exist...are you sure you got the right bar ID?" backPath="./code" />

    return (
        <DisplayOrLoading condition={ready} loadingScreen={<LoadingScreen />}>
            <div className="App-body-top" style={bar.allowingRequests ? undefined : { overflow: 'hidden', height: "100%", position: 'fixed' }}>
                <DisableRequests show={!bar.allowingRequests || disableEverything} bar={bar} />
                <div ref={topBarRef}
                    style={{
                        flex: 1, alignSelf: "stretch", display: "flex", alignItems: 'center', backgroundColor: topBarColor, position: 'fixed', top: 0, zIndex: 20, width: "100%",
                        WebkitBackdropFilter: 'blur(5px)',
                        backdropFilter: 'blur(5px)',
                    }}>
                    <TopBar />

                </div>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                    <div style={{
                        width: '100%', minHeight: minHeaderHeight,
                        objectFit: 'cover', backgroundImage: (bar.image_url && bar.image_url.length > 0) ? `url(${bar.image_url})` : `url(${defaultBackground})`,
                        backgroundRepeat: "no-repeat",
                        backgroundSize: "cover",
                        display: "flex",
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        justifyContent: 'flex-end',
                        backgroundColor: "#000",
                        boxShadow: 'inset 0px -30vh 30vh rgba(23, 23, 30, 0.7)',
                    }}
                    >
                        <div style={{ height: topBar?.clientHeight ? topBar.clientHeight : 0 }}></div>
                        <div style={{ paddingBottom: padding / 2, paddingTop: padding * 2, width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'flex-end' }}>
                            <span className='App-title' style={{ flex: 7, width: '100%', textAlign: 'center' }}>{bar.name}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', flexDirection: 'row-reverse' }}>
                            <span className='App-typetitle' style={{
                                flex: 1,
                                color: Colors.tertiaryLight,
                                paddingRight: padding,
                                textAlign: 'right',
                            }}>{bar.type ?? "Bar"}</span>
                        </div>
                    </div>
                    <div style={{ paddingBottom: padding / 2 }}></div>
                    <div ref={toggleRef} style={{
                        position: 'sticky', top: topBar?.clientHeight ? topBar.clientHeight - 0.5 : 0, zIndex: 2,
                        paddingRight: padding,
                        paddingLeft: padding,
                        // paddingTop: padding / 2,
                        paddingBottom: padding / 2,
                        backgroundColor: topBarColor,
                        display: 'flex',
                        justifyContent: 'center',
                        WebkitBackdropFilter: 'blur(5px)',
                        backdropFilter: 'blur(5px)',
                    }}
                    >
                        <div style={{ flex: 1 }}>
                            <ToggleTab labels={[{ label: "Songs", noti: 0 }, { label: "Requests", noti: requestNoti }]} value={view} setValue={setView}></ToggleTab>
                            <div style={{ paddingTop: padding / 2, width: '100%', }}>
                                <TZSearchButton dims={searchDims} onClick={() => { router.navigate(`/search`) }} />
                            </div>
                        </div>
                    </div>


                    <>
                        {
                            view === 0 ?
                                <SongContent topArtists={topArtists} topSongs={topSongs} songDims={songDims} artistDims={artistDims} refreshRequests={() => refreshAllReqs(false)} />
                                :
                                <RequestsContentMemo height={height} padding={padding} pr={pendingReqs} cr={allReqs} cload={cload} refresh={() => refreshAllReqs(false)} />
                        }
                        <div style={{
                            position: "fixed",
                            bottom: 0,
                            width: wdim.width,
                            display: 'flex',
                            // flexDirection: 'column',
                            alignItems: 'flex-end',
                            justifyContent: current ? 'center' : 'flex-end',
                            zIndex: 10,
                        }}>
                            {current ? <div style={{
                                flex: 1, paddingBottom: padding, paddingLeft: padding, paddingRight: padding, paddingTop: padding, maxWidth: 800,
                            }}>
                                <CurrentlyPlaying current={current} queue={queue} songDims={songDims} />
                            </div> : <></>}
                        </div>
                    </>


                    <div>
                        <div style={{ padding: padding, opacity: 0 }}>
                            <div style={{ flexShrink: 1, justifyContent: 'flex-end', display: 'flex', paddingRight: padding }}>
                                <div style={{
                                    width: "100%",
                                    padding: padding,
                                    display: 'flex',
                                    alignItems: 'center',
                                }}>
                                    <div style={{ flexGrow: 1 }}>
                                        <Song song={{ title: "No song playing", artists: ["No artist"], explicit: false, id: "-1", albumart: "" }} dims={songDims ? songDims * 0.9 : undefined}></Song>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DisplayOrLoading>

    );
}

export function parseRequests(json: any): SongRequestType[] {
    const reqs = new Array<SongRequestType>();
    json.data.forEach((r: any) => {
        const req: SongRequestType = {
            id: r.id, song: parseSongIHateMeku(r.song_json), bar: parseBusiness(r.business_info), date: new Date(r.request_time), status: r.status
        }
        reqs.push(req);
    })
    return reqs.sort(songRequestCompare);
}

const hasManuallyQueued = (s?: SongType[]) => {
    return s && s.length > 0 && s[0].manuallyQueued
}


export function parseRequest(r: any): SongRequestType {
    const req: SongRequestType = { id: r.id, song: parseSongIHateMeku(r.song_json), bar: parseBusiness(r.business_info), date: new Date(r.request_time), status: r.status }
    return req;
}

function CurrentlyPlaying(props: { current?: SongType, queue: SongType[], songDims?: number }): JSX.Element {
    const current = props.current;
    const [v, setV] = useState(false);
    const rad = Math.max(Math.min(useWindowDimensions().width / 100, radius), 5);

    // const speakerAnimationOptions = {
    //     loop: true,
    //     autoplay: true,
    //     animationData: speakerAnimation,
    //     rendererSettings: {
    //       preserveAspectRatio: "xMidYMid slice"
    //     }
    //   };

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column-reverse' }}>
            <div style={{
                paddingLeft: rad, paddingRight: rad, width: "100%",
            }}>

                <div style={{
                    zIndex: 10,
                    width: "100%", backgroundColor: Colors.secondaryDark,
                    borderBottomLeftRadius: rad,
                    borderBottomRightRadius: rad,
                    boxShadow: '0px 5px 10px rgba(0, 0, 0, 0.4)',
                    minHeight: padding / 2,
                    // transition: "paddingBottom 0.6s ease",
                    // paddingBottom: padding / 2,
                    paddingRight: padding,
                    paddingLeft: padding,
                }}>
                    <AnimateHeight
                        id="currentlyplaying"
                        duration={300}
                        height={v ? 'auto' : 0} // see props documentation below
                    >
                        <div style={{ paddingTop: padding / 2, paddingBottom: padding / 4 }}>
                            {hasManuallyQueued(props.queue) ?
                                <span className="App-tertiarytitle">Next up:</span>
                                :
                                <>
                                    <div style={{ display: "block" }}>
                                        <span className="App-tertiarytitle">Next up:</span>
                                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', width: '100%', padding: padding / 2 }}>
                                            <div style={{ display: 'inline-block', justifyContent: 'center', padding: padding / 1.5, textAlign: "center", flexDirection: 'column', backgroundColor: "#fff3", borderRadius: radius }}>
                                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', width: '100%' }}>
                                                    <span style={{ fontWeight: 'bold' }}>Your song could be here!</span>
                                                    <span> Request a song to hear it played next.</span>
                                                </div>
                                            </div>
                                        </div>
                                        <span className="App-normaltext" style={{ fontWeight: 500 }}>Next from shuffle:</span>
                                    </div>
                                </>
                            }
                        </div>
                        <FlatList
                            list={props.queue}
                            renderItem={(item, key) =>
                                <div key={item.id + key}>
                                    <Song song={item}></Song>
                                    <div style={{ paddingBottom: padding }}></div>
                                </div>
                            }
                        />
                    </AnimateHeight>
                </div>
            </div>
            <div style={{
                width: "100%", backgroundColor: Colors.secondaryRegular, borderRadius: rad,
                padding: padding,
                boxShadow: '0px 5px 10px rgba(0, 0, 0, 0.4)',
                display: 'flex',
                alignItems: 'center',
                zIndex: 15,
                cursor: 'pointer',
            }}
                onClick={() => setV(!v)}
            >
                <div style={{ flexGrow: 1 }}>
                    <Song song={current ?? { title: "No song playing", artists: ["No artist"], explicit: false, id: "-1", albumart: "" }} dims={props.songDims ? props.songDims * 0.9 : undefined}></Song>
                </div>
                <div style={{ width: (props.songDims ?? 40) * 0.7 }}>
                    <Lottie
                        options={
                            {
                                loop: true,
                                autoplay: true,
                                animationData: speakerAnimation,
                                rendererSettings: {
                                    preserveAspectRatio: "xMidYMid slice"
                                }
                            }
                        }
                        speed={current ? 1 : 0}
                        height={(props.songDims ?? 40) * 0.7}
                        width={(props.songDims ?? 40) * 0.7}
                    />
                </div>
            </div>
        </div>
    )
}

const RequestsContentMemo = memo(RequestsContent);

const SongListMemo = memo(SongList, () => true);

const SongContent = React.memo((props: { topArtists: ArtistType[], topSongs: SongType[], songDims: number, artistDims: number, refreshRequests: () => Promise<void> }) => {

    const topArtists = props.topArtists;
    const topSongs = props.topSongs;

    const window = useWindowDimensions();

    return (
        <div style={{ justifyContent: 'flex-start', alignItems: 'flex-start', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ paddingTop: padding }}>
                <div style={{ paddingLeft: padding, paddingBottom: padding }}>
                    <span className='App-subtitle'>Top Artists</span>
                </div>
                <div style={{ paddingBottom: padding / 3 }}></div>
                <div style={{ overflow: 'hidden', width: window.width ?? 200 }}>
                    <ScrollMenu
                    >
                        {topArtists.map((e, index) => (
                            <div key={index + e.id} style={{ opacity: 1, paddingLeft: padding }}><Artist artist={e} dims={props.artistDims} onClick={() => router.navigate(`/search/artist`, { state: { artist: e } })}></Artist></div>
                        ))}
                    </ScrollMenu>
                </div>
            </div>
            <div style={{ padding: padding, width: '100%' }}>
                <div style={{ paddingBottom: padding, paddingTop: padding }}>
                    <span className='App-subtitle'>Popular</span>
                </div>
                <SongListMemo songs={topSongs} dims={props.songDims} refreshRequests={props.refreshRequests} />
            </div>
        </div>
    )
})

const DisableRequests = (props: { show: boolean, bar: BarType }) => {
    return (
        props.show ?
            <div className="App-bluroverlay">
                <span className="App-subtitle" style={{ color: Colors.primaryRegular, }}>{"Sorry!"}</span>
                <span className="App-normaltext" style={{ textAlign: 'center', padding: padding }}>Unfortunately, {props.bar.name} isn't accepting requests at the moment.</span>
                <div style={{ cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: padding, borderRadius: radius, borderWidth: 1, borderColor: Colors.primaryRegular, borderStyle: "solid", }} onClick={() => {
                    router.navigate("/code");
                }}>
                    <FontAwesomeIcon color={Colors.primaryRegular} icon={faArrowLeft}></FontAwesomeIcon>
                    <span className="App-normaltext" style={{ color: Colors.primaryRegular, fontWeight: 'bold', paddingLeft: 5 }}>See more bars</span>
                </div>
            </div> : <></>
    )
}