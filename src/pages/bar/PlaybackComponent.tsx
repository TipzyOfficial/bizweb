import FlatList from "flatlist-react/lib";
import { SongType } from "../../lib/song";
import Song, { SongRenderItem } from "../../components/Song";
import { Colors, modalZ, padding, radius, useFdim } from "../../lib/Constants";
import LogoLetter from "../../assets/LogoLetter.svg"
import { useContext, useEffect, useState } from "react";
import { UserSessionContext, UserSessionContextType } from "../../lib/UserSessionContext";
import { fetchWithToken, getBusiness, updateBusiness } from "../..";
import TZButton from "../../components/TZButton";
import { Modal, Spinner } from "react-bootstrap";
import { styles } from "../Login";
import { ServerInfo } from "../../lib/serverinfo";

type getSSReturnType = {
    streamingService: string, playlistName: string | undefined
}
export async function getStreamingService(usc: UserSessionContextType): Promise<getSSReturnType> {
    const json = await fetchWithToken(usc, "business/", "GET").then((r) => r.json());
    const streamingService = json.data.streaming_service;
    const playlistName = json.data.playlist_name;

    return ({ streamingService: streamingService, playlistName: playlistName })
}

export default function PlaybackComponent(props: { setDisableTyping: (b: boolean) => void, setStreamingService?: (b: boolean) => any }) {
    const [ss, setSS] = useState<string | null>("...");
    const usc = useContext(UserSessionContext);
    const [currentPlaylist, setCurrentPlaylistIn] = useState("loading...");
    const [visible, setVisibleIn] = useState(false);

    const setVisible = (b: boolean) => {
        props.setDisableTyping(b);
        setVisibleIn(b);
    }

    const setCurrentPlaylist = (p: string) => {
        setCurrentPlaylistIn(p);
    }

    const igetStreamingService = async () => {
        console.log("updating")
        setSS("...");
        setCurrentPlaylist("...");

        const res = await getStreamingService(usc);
        const streamingService = res.streamingService;
        if (streamingService === "NONE") {
            setSS(null);
            if (props.setStreamingService) props.setStreamingService(false);
        } else {
            setSS(streamingService);
            setCurrentPlaylist(res.playlistName ?? "");
            if (props.setStreamingService) props.setStreamingService(true);
        }
    }

    useEffect(() => {
        igetStreamingService();
    }, [])

    // useEffect(() => {
    //     const unsubscribe = props.navigation.addListener('focus', () => {
    //         getStreamingService();
    //     });
    //     return unsubscribe;
    // }, [props.navigation])


    // const onConnectSpotify = () => {
    //     if (ss != "...")
    //         props.navigation.navigate("SpotifySetup")
    // }

    const onConnectSoundtrack = () => {
        if (ss != "...") console.log('')
        // props.navigation.navigate("SoundtrackSetup", { streaming: ss === "SOUNDTRACK", setVibe: setCurrentPlaylist })
    }

    // const onConnect = ss === "SPOTIFY" ? onConnectSpotify : onConnectSoundtrack;
    // const onOtherConnect = ss === "SPOTIFY" ? onConnectSoundtrack : onConnectSpotify;

    //perma migration to soundtrack
    const onConnect = onConnectSoundtrack;

    // const onWhatIsThisFor = () => {
    //     alert("Playlist Vibe", "The playlist you upload here is what we use to tell Tipzy AI what kind of music you want to hear!\n\nThese are also the first songs patrons see when visiting your bar.")
    // }

    const [opacity, setOpacity] = useState(1);

    return (
        <>
            <div style={{ width: "100%", padding: padding, backgroundColor: Colors.tertiaryDark, borderRadius: radius, cursor: 'pointer', opacity: opacity }} onMouseEnter={() => setOpacity(0.5)} onMouseLeave={() => setOpacity(1)} onClick={() => setVisible(true)}>
                {ss ?
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="App-montserrat-smallertext" style={{}}>Current playlist:</span>
                        <span className="App-montserrat-normaltext" style={{ paddingBottom: 5, fontWeight: 'bold', color: Colors.primaryLight }}>{currentPlaylist}</span>
                        <span className="App-smalltext" style={{ color: "#fff8" }}>(Click to change)</span>
                    </div>
                    :
                    <span className="App-montserrat-normaltext" style={{ paddingBottom: 7, fontWeight: 'bold', color: Colors.primaryLight }}>Set up your streaming service!</span>
                }
            </div>
            <PlaybackModal show={visible} setShow={setVisible} streaming={ss !== null && ss !== undefined} update={igetStreamingService} />

            <div style={{ paddingBottom: padding }} />
        </>
    )
}

export type PlaylistType = {
    id: string,
    name: string,
    image: string,
}


function PlaybackModal(props: { show: boolean, setShow: (b: boolean) => void, streaming: boolean, update: () => Promise<void> }) {
    const usc = useContext(UserSessionContext);
    const [page, setPage] = useState(0);
    const [loginLoading, setLoginLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [playlists, setPlaylists] = useState<PlaylistType[] | undefined>(undefined);
    const [done, setDone] = useState(false);
    const [toggleLogin, setToggleLogin] = useState(false);
    const streamingService = usc.user.streaming_service;
    const [soundtrackPage, setSoundtrackPage] = useState(streamingService === 'SPOTIFY' ? false : true);
    const [spotifySelectPlaylist, setSpotifySelectPlaylist] = useState(false);

    const pageIsStreamed = (soundtrackPage && streamingService === "SOUNDTRACK") || (!soundtrackPage && streamingService === "SPOTIFY");

    const streaming = props.streaming && pageIsStreamed;

    const SOUNDTRACK_COLOR = "#f23440";
    const SPOTIFY_COLOR = "#1ED760";

    const playlistPage = () => {
        setPage(1);
        getPlaylists();
    }

    const onLoginSoundtrack = async () => {
        setLoginLoading(true);
        if (email.length === 0 || password.length === 0) {
            alert("Error: Please fill out all login fields.")
            setLoginLoading(false);
            return;
        }

        const response = await fetchWithToken(usc, `business/connect_soundtrack/`, 'POST', JSON.stringify({
            email: email,
            password: password
        }))

        if (!response) return;

        const json = await response.json();

        console.log("json", json)

        if (!json) alert("Error, Null json response. Contact support.");

        const error = json.error;

        if (error) throw new Error(error);

        await updateBusiness(usc);

        playlistPage();
        // Alert.alert(`${json.status === 200 ? "Success" : "Error " + json.status}`, `${json.error ? json.error : json.message}`);
    }

    const onLoginSpotify = async () => {
        // const response = await fetch("https://tipzyapi.com/business/connect_spotify/",
        //     {
        //         method: 'GET',
        //         headers: {
        //             Authorization: `Bearer ${usc.user.user.access_token}`,
        //             'Content-Type': 'application/json'
        //         },
        //         body: "",
        //     }
        // ) 
        const response = await fetchWithToken(usc, "business/connect_spotify/", "GET");
        if (!response) throw new Error("null/undefined response");
        const json = await response.json();
        const url = json.url;
        if (!url) throw new Error(`bad response ${response}`);
        setSpotifySelectPlaylist(true);
        window.open(url, "_blank");
        // window.location.href = `/business/connect_spotify/`
    }

    const getPlaylists = async () => {
        const json = await fetchWithToken(usc, `business/playlists/`, 'GET').then(r => r.json());
        if (!json.status || json.status !== 200) throw new Error("bad response in getPlaylists: " + json.status + " data " + json.data);
        const data = json.data;
        const playlists: PlaylistType[] = [];
        data.forEach((e: any) => {
            playlists.push({
                id: e.id,
                name: e.name,
                image: e.images,
            })
        })

        setPlaylists(playlists);
    }

    const submitPlaylist = async (id: string) => {
        setDone(true);
        await fetchWithToken(usc, `business/playlist/`, 'POST', JSON.stringify({
            playlist_id: id
        })).then(r => r?.json())
            .then(json => {
                if (json.status !== 200) throw new Error("Playlist not accepted. Try again later. Status: " + json.status + " Detail: " + json.detail + " Error: " + json.error)
                console.log(json);
            })
            .catch((e: Error) => { throw new Error("Error" + e.message) });

        await updateBusiness(usc);
        props.setShow(false);
        props.update();
    }

    const imgDims = useFdim() / 15;

    const RenderItem = (props: { playlist: PlaylistType }) => {
        const [opacity, setOpacity] = useState(1);
        const e = props.playlist;
        return (
            <>
                <div style={{ paddingTop: padding }} />
                <div onClick={() => {
                    if (!done) submitPlaylist(e.id).catch((e) => { alert(e.message); setDone(false); });
                }} style={{ padding: 5, backgroundColor: "#fff1", borderRadius: radius, opacity: done ? 0.5 : opacity, cursor: 'pointer' }} onMouseEnter={() => setOpacity(0.5)} onMouseLeave={() => setOpacity(1)}>
                    <img src={e.image} alt={e.name} style={{ height: imgDims, width: imgDims, borderRadius: radius - 5, objectFit: "cover" }} />
                    <span style={{ paddingLeft: padding }}>{e.name}</span>
                </div>
            </>
        )
    }

    return (
        <Modal show={props.show} data-bs-theme={"dark"}
            style={{ zIndex: modalZ }}
            onShow={() => {
                setToggleLogin(false);
                setLoginLoading(false);
                setSpotifySelectPlaylist(false);
                setDone(false);
                setPage(0);
            }}
            onHide={() => {
                props.setShow(false);
            }}>
            {page === 0 ?
                <Modal.Body style={{ color: "white" }}>
                    <div style={{ display: 'flex', width: "100%", backgroundColor: "#0003", borderRadius: radius }}>
                        <TZButton title="Soundtrack" backgroundColor={soundtrackPage ? SOUNDTRACK_COLOR : "#0000"} onClick={() => setSoundtrackPage(true)} />
                        <TZButton title="Spotify" backgroundColor={soundtrackPage ? "#0000" : SPOTIFY_COLOR} color={soundtrackPage ? undefined : "#121212"} onClick={() => setSoundtrackPage(false)} />
                    </div>
                    <div style={{ paddingTop: padding }} />
                    {streaming ?
                        <>
                            Select a playlist here:
                            <div style={{ paddingTop: padding, paddingBottom: padding }}>
                                <TZButton title="Select Playlist" color={"#121212"} backgroundColor={streamingService === "SPOTIFY" ? SPOTIFY_COLOR : SOUNDTRACK_COLOR} onClick={() => playlistPage()}></TZButton>
                            </div>
                        </> : <></>
                    }
                    {streaming && !toggleLogin ?
                        <span style={{ color: Colors.primaryRegular, cursor: 'pointer' }} onClick={() => setToggleLogin(true)}>Not logged in?</span>
                        :
                        soundtrackPage ? <>
                            {streaming ? "Log in to Soundtrack here." : "To select a playlist, please log in to Soundtrack first."} We won't store your login details!
                            <div style={{ paddingTop: padding }} />
                            <input className="input" style={{ width: "100%" }} placeholder="email@address.com" onChange={(e) => setEmail(e.target.value)} />
                            <div style={{ paddingTop: padding }} />
                            <input className="input" style={{ width: "100%" }} placeholder="Password" type="password" onChange={(e) => setPassword(e.target.value)} />
                            <div style={{ paddingTop: padding }} />
                            <TZButton title="Connect to Soundtrack" backgroundColor={SOUNDTRACK_COLOR}
                                loading={loginLoading}
                                onClick={() =>
                                    onLoginSoundtrack().catch(e => { alert(`Login failed. Check if your credentials are entered in correctly. If you still have issues, contact support. (${e})`); setLoginLoading(false); })
                                }
                            />
                        </>
                            :
                            <>
                                {streaming ? "Log in to Spotify here." : "To select a playlist, please connect to Spotify first."} We won't store your login details!
                                <div style={{ paddingTop: padding }} />
                                <TZButton title={spotifySelectPlaylist ? "Reconnect to Spotify" : "Connect to Spotify"} backgroundColor="#1ED760" color="#121212"
                                    loading={loginLoading}
                                    onClick={() =>
                                        onLoginSpotify()
                                            .catch(e => { alert(`Problem connecting with Spotify. If you still have issues, contact support. (${e})`); setLoginLoading(false); })
                                    }
                                />
                                {/* <a href={`${ServerInfo.baseurl}business/connect_spotify/`}>connect spotify</a> */}
                                <div style={{ paddingTop: padding }} />
                                {spotifySelectPlaylist ?
                                    <div style={{ paddingTop: padding, paddingBottom: padding }}>
                                        <TZButton title="Select Playlist" backgroundColor={SPOTIFY_COLOR} onClick={() => playlistPage()}></TZButton>
                                    </div>
                                    : <></>}
                            </>
                    }
                </Modal.Body>
                :
                <Modal.Body style={{ color: "white" }}>
                    {playlists ?
                        <div>
                            {"Please select your playlist. "}
                            {done ? <Spinner size="sm" /> : <></>}
                            <FlatList list={playlists}
                                renderItem={(e) => <RenderItem playlist={e} />

                                }
                            />
                        </div> : <div><Spinner></Spinner></div>}
                </Modal.Body>
            }
        </Modal>
    )
}