import FlatList from "flatlist-react/lib";
import { SongType } from "../../lib/song";
import Song, { SongRenderItem } from "../../components/Song";
import { Colors, padding, radius, useFdim } from "../../lib/Constants";
import LogoLetter from "../../assets/LogoLetter.svg"
import { useContext, useEffect, useState } from "react";
import { UserSessionContext } from "../../lib/UserSessionContext";
import { fetchWithToken } from "../..";
import TZButton from "../../components/TZButton";
import { Modal, Spinner } from "react-bootstrap";
import { styles } from "../Login";

export default function PlaybackComponent() {
    const [ss, setSS] = useState<string | null>("...");
    const usc = useContext(UserSessionContext);
    const [currentPlaylist, setCurrentPlaylistIn] = useState("loading...");
    const [visible, setVisible] = useState(false);

    const setCurrentPlaylist = (p: string) => {
        setCurrentPlaylistIn(p);
    }

    const getStreamingService = async () => {
        console.log("updating")
        setSS("...");
        setCurrentPlaylist("...");

        const json = await fetchWithToken(usc, "business/", "GET").then((r) => r.json());
        const streamingService = json.data.streaming_service;
        if (streamingService === "NONE") {
            setSS(null)
        } else {
            setSS(streamingService);
            setCurrentPlaylist(json.data.playlist_name);
        }
    }

    useEffect(() => {
        getStreamingService();
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
            <div style={{ width: "100%", padding: padding, backgroundColor: Colors.tertiaryDark + "aa", borderRadius: radius, cursor: 'pointer', opacity: opacity }} onMouseEnter={() => setOpacity(0.5)} onMouseLeave={() => setOpacity(1)} onClick={() => setVisible(true)}>
                {ss ?
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="App-montserrat-smallertext" style={{}}>Current playlist:</span>
                        <span className="App-montserrat-normaltext" style={{ paddingBottom: 5, fontWeight: 'bold', color: Colors.primaryRegular }}>{currentPlaylist}</span>
                        <span className="App-smalltext" style={{ color: "#fff8" }}>(Click to change)</span>
                    </div>
                    :
                    <span className="App-montserrat-normaltext" style={{ paddingBottom: 7, fontWeight: 'bold', color: Colors.primaryRegular }}>Set up your streaming service!</span>
                }
            </div>
            <PlaybackModal show={visible} setShow={setVisible} streaming={ss !== null || ss !== undefined} update={getStreamingService} />

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

        playlistPage();
        // Alert.alert(`${json.status === 200 ? "Success" : "Error " + json.status}`, `${json.error ? json.error : json.message}`);
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
            onShow={() => {
                setLoginLoading(false);
                setDone(false);
                setPage(0);
            }}
            onHide={() => {
                props.setShow(false);
            }}>
            {page === 0 ?
                <Modal.Body style={{ color: "white" }}>
                    Select a playlist here:
                    <div style={{ paddingTop: padding, paddingBottom: padding }}>
                        <TZButton title="Select Playlist" backgroundColor="#f23440" onClick={() => playlistPage()}></TZButton>
                    </div>
                    {props.streaming ? "You're using your most recent Soundtrack credentials right now, but here is the log in screen you need to log in again for any reason." : "To select a Soundtrack playlist, please log in to Soundtrack first."} We won't store your login details!
                    <div style={{ paddingTop: padding }}></div>
                    <input className="input" style={{ width: "100%" }} placeholder="email@address.com" onChange={(e) => setEmail(e.target.value)} />
                    <div style={{ paddingTop: padding }}></div>
                    <input className="input" style={{ width: "100%" }} placeholder="Password" type="password" onChange={(e) => setPassword(e.target.value)} />
                    <div style={{ paddingTop: padding }}></div>
                    <TZButton title="Sign in to Soundtrack" backgroundColor="#f23440"
                        loading={loginLoading}
                        onClick={() =>
                            onLoginSoundtrack().catch(e => { alert(`Login failed. Check if your credentials are entered in correctly. If you still have issues, contact support. (${e})`); setLoginLoading(false); })
                        }
                    />
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