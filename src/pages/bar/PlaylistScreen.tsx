import { memo, useContext, useEffect, useRef, useState } from "react";
import { Colors, padding, radius, useFdim } from "../../lib/Constants";
import { Input } from "../../components/GiantInput";

import React from "react";
import TZButton from "../../components/TZButton";
import { fetchWithToken } from "../..";
import { UserSessionContext } from "../../lib/UserSessionContext";
import { SongType } from "../../lib/song";
import { parseSongJson, useInterval } from "../../lib/utils";
import { Modal, ProgressBar, Spinner } from "react-bootstrap";
import Song, { artistsStringListToString } from "../../components/Song";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircle as faCircleEmpty } from "@fortawesome/free-regular-svg-icons";
import { faChevronLeft, faChevronRight, faCircle as faCircleFilled, faCirclePlay, faCirclePlus, faQuestion, faQuestionCircle, faWarning, faX, faXmark, faXmarkCircle } from "@fortawesome/free-solid-svg-icons";
import _ from "lodash";
import PlaybackComponent from "./PlaybackComponent";
import { AlertContentType } from "../../components/Modals";
import LoadingBar from "../../components/LoadingBar";
import useWindowDimensions from "../../lib/useWindowDimensions";

const AITABWIDTH = 20;

type PlaylistScreenProps = {
    visibleState: [boolean, (b: boolean) => any],
    setDisableTyping: (b: boolean) => any,
    setAlertContent: (a: AlertContentType) => any,
    djSongList?: SongType[]
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

const TabButton = (props: { tab: number, id: number, onClick: (v: number) => any, text: string }) => {
    const [opacity, setOpacity] = useState(1);

    return (
        <div style={{
            width: "100%", padding: padding, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
            backgroundColor: props.tab === props.id ? "#FFF1" : "#FFF0", color: props.tab === props.id ? "#FFF" : "#FFFA",
        }}
            onPointerLeave={() => {
                setOpacity(1);
            }}
            onPointerEnter={() => {
                setOpacity(0.85);
            }}
            onPointerDown={() => {
                setOpacity(0.5);
            }}
            onPointerUp={() => {
                setOpacity(1);
            }}
            onClick={() => props.onClick(props.id)}
        >
            <span className="App-tertiarytitle">{props.text}</span>
        </div>
    )
}

export function PlaylistScreen(props: PlaylistScreenProps) {
    const [focused, setFocusedIn] = useState(false);
    const [loading, setLoading] = useState(false);
    const [prompt, setPrompt] = useState("");
    const [show, setShow] = useState(false);
    const [songs, setSongs] = useState<SongType[] | undefined | null>(undefined);
    const [tab, setTab] = useState(0);
    const [selectedSongs, setSelectedSongs] = useState<Set<string>>(new Set());
    const [visible, setVisible] = props.visibleState;

    // const [selectedSongs, setSelectedSongs] = useState<Set<string>>(new Set([]));
    const usc = useContext(UserSessionContext)

    const setDisableTyping = props.setDisableTyping;

    const setFocused = (b: boolean) => {
        setFocusedIn(b);
        setDisableTyping(b);
    }

    // const timeout = async () => {
    //     await setTimeout(() => { }, 1578);
    //     return DEFAULT_RESULT;
    // }

    // const generateDefault = async () => {
    //     // const s = await timeout();
    //     const ms = 1578;
    //     const start = Date.now();
    //     while (Date.now() - start < ms);
    //     return DEFAULT_RESULT;
    // }

    const generatePlaylist = async () => {
        const json = await fetchWithToken(usc, `business/generate/tracks/?prompt=${btoa(prompt)}`, 'GET').then(r => r.json());
        const s: SongType[] = [];
        console.log("gp json", json)
        if (json) {
            const data = json.data
            for (const song of data) {
                s.push(parseSongJson(song));
            }
        }

        console.log("PLAYLISTRESULT", s);

        return s;
    }

    const onSubmit = async () => {
        if (prompt.length === 0) return;
        if (loading) return;
        setSongs(undefined);
        setShow(true);
        setLoading(true);
        const s = await generatePlaylist().catch(e => { console.log("Error generating", e); return null });
        setSongs(s);
        setLoading(false);

        // setTimeout(() => {
        //     setSongs(DEFAULT_RESULT);
        //     setLoading(false);
        // }, 1578)
    }

    const onHide = () => {
        setSongs(undefined);
        setSelectedSongs(new Set<string>());
        setTimeout(() => { setLoading(false); }, 1000);
        setShow(false);
    }

    const onCancelClick = () => {
        onHide();
    }

    const onSelectAllClick = (songs: SongType[] | undefined) => {
        if (songs) {
            setSelectedSongs(new Set<string>(songs?.map(s => s.id)));
        }
    }

    const onDeselectAllClick = () => {
        setSelectedSongs(new Set<string>());
    }


    const internalRequest = async (song: SongType) => {
        const json = await fetchWithToken(usc, `business/request/`, 'POST', JSON.stringify({
            track_id: song?.id ?? "",
            track_name: song?.title ?? "No title",
            artist: song ? artistsStringListToString(song.artists) : "No artist",
            image_url: song?.albumart ?? "",
            price: 0,
            token_count: 0,
            explicit: song.explicit,
            duration_ms: song.duration,
        })).then(r => r.json()).catch(() => { return { status: 501 } });

        if (json.status === 200) {
            alert(`Successfully queued up ${song.title} by ${artistsStringListToString(song.artists)}!`);
        } else {
            throw new Error(`Problem queueing that song: ${JSON.stringify(json)}`);
        }
    }

    const onQueueClick = async (song: SongType) => {
        props.setAlertContent({
            title: "Queue Song", text: `You're about to queue ${song.title} by ${artistsStringListToString(song.artists)}.`,
            buttons: [{ text: "Cancel", color: Colors.red }, { text: "Continue", color: Colors.tertiaryDark, onClick: () => internalRequest(song) }]
        })
        // await internalRequest(song);
    }

    return (
        visible ?
            <div style={{ backgroundColor: "#0003", display: "flex" }}>
                <AISideTab close onClick={() => setVisible(false)} />
                <div style={{ display: "flex", flexDirection: 'column', flex: 1 }}>
                    {show ?
                        <></>
                        :
                        <>
                            <div style={{ padding: padding, display: 'flex', flexDirection: 'column' }}>
                                <span className="App-montserrat-aitext" style={{ fontWeight: 'bold', textAlign: 'center' }}>✨ Find songs that match your vibe ✨</span>
                            </div>
                            <div style={{ width: "100%", paddingLeft: padding, paddingRight: padding, flex: 0 }}>
                                <Input
                                    placeholder="What do you want to listen to?"
                                    value={prompt} onChange={(e) => setPrompt(e.target.value)}
                                    style={{ fontSize: 15 }}
                                    multiline
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            onSubmit();
                                        }
                                    }}

                                    maxRows={5}
                                    focused={focused}
                                    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                                />
                                <div style={{ height: padding }}></div>
                                {/* <div style={{ display: 'flex' }}>
                                                    <TZButton title="Generate" loading={loading} onClick={onSubmit}></TZButton>
                                                </div> */}
                            </div>
                        </>
                    }
                    <div style={{ position: "sticky", top: 0, backgroundColor: Colors.background, width: "100%", display: 'flex', flex: 0, flexDirection: 'column', alignItems: 'center' }}>
                        {/* <div style={{ display: 'flex', width: "100%", }}>
                            <TabButton text="By You ✨" tab={tab} id={0} onClick={setTab}></TabButton>
                            <TabButton text="Playlists" tab={tab} id={1} onClick={setTab}></TabButton>
                        </div > */}
                        {tab === 0 && ((songs && songs.length !== 0) || (props.djSongList && props.djSongList.length !== 0)) ?
                            <>
                                <div style={{ width: "100%", display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: "white" }}>
                                    <>
                                        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                                            {show ? <div style={{ display: 'flex' }}>
                                                <TZButton backgroundColor={"#0000"} title="Cancel" fontSize={15} onClick={onCancelClick}></TZButton>
                                            </div> : <></>}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            {<span className="onelinetextplain" style={{ textAlign: 'center', fontSize: "calc(10px + 0.5vmin)", textOverflow: 'ellipsis' }}>{songs ? `Results for "${prompt}"` : "Virtual DJ's picks"}</span>}
                                        </div>
                                        <div style={{ flex: 1, minWidth: "-webkit-min-content", display: 'flex', justifyContent: 'flex-end', flexBasis: 0 }}>
                                            <div style={{ display: 'flex' }}>
                                                <TZButton color={Colors.green} backgroundColor={"#0000"} title="Select all" fontSize={15} onClick={() => onSelectAllClick(songs ?? props.djSongList)}></TZButton>
                                            </div>
                                            <div>
                                                <TZButton color={Colors.red} backgroundColor={"#0000"} title="Deselect all" fontSize={15} onClick={onDeselectAllClick}></TZButton>
                                            </div>
                                        </div>
                                    </>
                                </div>
                            </>
                            : <></>//<div style={{ height: padding }}></div>
                        }
                    </div>

                    <div style={{ width: "100%", display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center', }}>
                        {tab === 0 ? //AI SCREEN
                            <>
                                <div style={{ width: "100%", display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                                    {show ?
                                        <div style={{ width: "100%", overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                            <PGMMemo prompt={prompt} show={show}
                                                selectedSongs={selectedSongs}
                                                setSelectedSongs={setSelectedSongs}
                                                onHide={onHide} songs={songs}
                                                onQueueClick={onQueueClick}
                                            />
                                        </div> :
                                        <>
                                            {
                                                props.djSongList ?
                                                    <div style={{ width: "100%", flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', }}>
                                                        <div style={{ width: "100%", overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column', }}>
                                                            <PGMMemo prompt={undefined} show={true}
                                                                selectedSongs={selectedSongs}
                                                                setSelectedSongs={setSelectedSongs}
                                                                onHide={onHide} songs={props.djSongList}
                                                                onQueueClick={onQueueClick}
                                                            />
                                                        </div>
                                                    </div>
                                                    : <></>
                                            }
                                        </>
                                    }
                                </div>
                            </>

                            : <PBCMemo setDisableTyping={setDisableTyping} />}
                    </div>
                </div>
            </div>
            :
            <AISideTab onClick={() => setVisible(true)} />
    );
}

const PBCMemo = memo(
    (props: { setDisableTyping: (b: boolean) => any }) => {
        return (
            <div style={{ padding: padding, width: "100%" }}>
                <PlaybackComponent setDisableTyping={props.setDisableTyping} />
            </div>
        );
    }
);

const PGMMemo = memo(PlaylistGeneratorModal, (a, b) => {
    return a.songs === b.songs &&
        a.show === b.show &&
        a.onHide === b.onHide
        && a.selectedSongs === b.selectedSongs &&
        a.setSelectedSongs === b.setSelectedSongs &&
        a.onQueueClick === b.onQueueClick;
});

function PlaylistGeneratorModal(props: {
    prompt?: string, show: boolean, onHide: () => any, songs: SongType[] | undefined | null,
    selectedSongs: Set<string>, setSelectedSongs: (s: Set<string>) => any, onQueueClick: (s: SongType) => any
}) {
    const songs = props.songs;
    // const [defaultSelect, setDefaultSelect] = useState(false); //dummy to basically force rerender
    const usc = useContext(UserSessionContext);
    const [sending, setSending] = useState(false);
    const [selectedSongs, setSelectedSongs] = [props.selectedSongs, props.setSelectedSongs] //useState<Set<string>>(new Set());


    const setSelected = (b: boolean, song: SongType) => {
        const s = _.cloneDeep(selectedSongs);

        if (b) {
            setSelectedSongs(
                s.add(song.id)
            );
        } else {
            s.delete(song.id)
            setSelectedSongs(s);
        }
        // setChange(!change);
    }

    const addSongsToPlaylist = async (name: string, selectedSongs: string[]) => {
        const sending = JSON.stringify({
            name: name,
            description: props.prompt,
            track_ids: JSON.stringify(selectedSongs)
        });

        console.log("SENDING:", sending);

        const json = await fetchWithToken(usc, `business/playlist/save/`, 'POST', sending).then(r => r.json());

        const data = json.data;

        if (json.status === 200) {
            alert(`Successfully created ${data.name}, id: ${data.id}`);
            props.onHide();
        } else {
            throw new Error(`Code ${json.status}: ${json.detail}${json.error}`)
        }
    }

    const onAddSongsClick = async () => {
        if (sending) return;
        setSending(true);
        //alert(selectedSongs.size);
        const name = prompt("What do you want to call your playlist?");

        const ids = [...selectedSongs];

        if (name) {
            await addSongsToPlaylist(name, ids).catch((e: Error) => {
                alert(e.message.substring(0, 300));
                console.log(e.message)
            });
        }

        setSending(false);
    }

    const BackButton = () => {
        return (
            <TZButton title="Back" fontSize={"calc(10px + 0.5vmin)"} backgroundColor="#0000" color={Colors.primaryRegular} onClick={props.onHide} />
        )
    }

    return (
        // <Modal centered show={props.show} backdrop="static" onHide={() => {
        //     setSelectedSongs(new Set<string>());
        //     props.onHide();
        // }} data-bs-theme={"dark"} size={"lg"} >
        // <Modal.Header closeButton style={{ color: "white", }}>
        //         <span className="onelinetextplain" style={{ fontSize: "calc(15px + 0.5vmin)", height: "100%", textOverflow: 'ellipsis' }}>Results for "{props.prompt}"</span>
        //     </Modal.Header>
        props.show ?
            <div style={{ width: "100%", flex: 1, display: 'flex', flexDirection: 'column', }}>
                {
                    songs ?
                        songs.length === 0 ?
                            <div style={{
                                paddingLeft: padding, paddingRight: padding, paddingTop: padding * 2, paddingBottom: padding * 2,
                                width: "100%", display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
                            }}>
                                <FontAwesomeIcon icon={faQuestionCircle} color="white"></FontAwesomeIcon>
                                <span className="App-smalltext" style={{ textAlign: 'center', padding: padding }}>Hm. We can't seem to find any songs matching "{props.prompt}".<br />Try telling us the general atmopshere you want, and artists/genres that you want included.</span>
                                <BackButton />
                            </div>
                            :
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', }}>
                                <div className="remove-scrollbar" style={{
                                    display: 'flex', flex: "1 0 0", flexDirection: 'column', overflowY: "scroll", width: "100%",
                                }}>
                                    <div style={{ height: padding }} />
                                    {songs.map((song) => <PGMRenderItem song={song} setSelected={(b) => setSelected(b, song)} selectedSongs={selectedSongs} onQueueClick={props.onQueueClick} />)}
                                </div>
                                <div style={{
                                    width: "100%", flex: 0, padding: padding,
                                    // paddingRight: padding, paddingBottom: padding 
                                }}>
                                    <TZButton title={selectedSongs.size > 0 ? `Create playlist with ${selectedSongs.size} songs` : "Select songs"} onClick={onAddSongsClick} loading={sending} disabled={selectedSongs.size === 0} />
                                </div>
                            </div>
                        :
                        <div style={{ padding: padding, width: "100%", minHeight: window.screen.height * 0.3, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                            {songs === null ?
                                <>
                                    <FontAwesomeIcon icon={faWarning} color="white"></FontAwesomeIcon>
                                    <div style={{ height: padding }} />
                                    <span className="App-smalltext">Unfortunately, there was an error getting your songs. Please try again.</span>
                                    <BackButton />
                                </>
                                :
                                <>
                                    <LoadingBar width={100} />
                                    <div style={{ height: padding }} />
                                    <span className="App-smalltext" >Hang on...this may take a moment.</span>
                                    <BackButton />
                                </>
                            }
                        </div>
                }

            </div > : <></>

        // {songs && songs.length !== 0 ?
        //     <Modal.Footer style={{ color: "white", overflow: 'scroll', }}>
        //         <TZButton title={selectedSongs.size > 0 ? `Create playlist with ${selectedSongs.size} songs` : "Select songs"} onClick={onAddSongsClick} loading={sending} disabled={selectedSongs.size === 0} />
        //     </Modal.Footer>
        //     : <></>}
        // </Modal>
    )
}

const PGMRenderItem = (props: { song: SongType, setSelected: (b: boolean) => any, selectedSongs: Set<string>, onQueueClick: (song: SongType) => Promise<any> }) => {
    const [hoverStatus, setHoverStatus] = useState(0);
    // const [selected, setSelected] = useState(false);
    const selectedSongs = props.selectedSongs;
    const selected = selectedSongs.has(props.song.id);
    const [queueLoading, setQueueLoading] = useState(false);
    const songDims = useWindowDimensions().width / 40;


    const QueueButton = () => {
        const [hoverStatus, setHoverStatus] = useState(0);

        return (
            <div onClick={async () => {
                if (queueLoading) return;
                setQueueLoading(true);
                await props.onQueueClick(props.song).catch((e) => {
                    console.log(e);
                    setQueueLoading(false);
                });
                setQueueLoading(false);
            }}
                onPointerEnter={() => setHoverStatus(0.5)} onPointerLeave={() => setHoverStatus(0)} onPointerDown={() => setHoverStatus(1)} onPointerUp={() => setHoverStatus(0.5)}
                style={{ display: 'flex', backgroundColor: `#fff${3 - hoverStatus * 2}`, alignItems: 'center', padding: 5, borderRadius: radius }}>
                <FontAwesomeIcon color={"white"} icon={faCirclePlus}></FontAwesomeIcon>
                <span style={{ paddingLeft: 5 }}>Queue</span>
                {queueLoading ?
                    <>
                        <div style={{ width: 5 }} />
                        <Spinner size="sm"></Spinner>
                    </>
                    : <></>}
            </div>)
    }

    return (
        <div style={{ width: "100%", paddingBottom: padding }}>
            <div style={{
                width: "100%", display: 'flex', paddingLeft: padding, paddingRight: padding,
                backgroundColor: hoverStatus === 1 ? "#fff3" : hoverStatus === 0.5 ? "#fff1" : "#fff0", cursor: 'Pointer'

            }}>
                <div
                    onPointerEnter={() => setHoverStatus(0.5)} onPointerLeave={() => setHoverStatus(0)} onPointerDown={() => setHoverStatus(1)} onPointerUp={() => setHoverStatus(0.5)}
                    style={{
                        width: "100%", display: "flex", alignItems: 'center',
                    }}
                    onClick={() => {
                        // setSelected(!selected);
                        props.setSelected(!selected);
                    }}
                >
                    <div style={{ paddingRight: padding, }}>
                        <FontAwesomeIcon color={selected ? Colors.primaryRegular : "#fff8"} icon={selected ? faCircleFilled : faCircleEmpty}></FontAwesomeIcon>
                    </div>
                    <Song song={props.song} dims={songDims} />
                </div>
                <div style={{ paddingLeft: 5, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <QueueButton />
                </div>
            </div>
        </div >

    )
}

const DEFAULT_RESULT: SongType[] =
    [
        {
            "id": "soundtrack:track:3cVBGhcUKMVpn7A5Ys2mSU",
            "title": "One for You, One for Me",
            "artists": [
                "La Bionda"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduC4tg4hsbULATpvrHsCzpFssz8D9dX9kS",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduC4tg4hsbULATpvrHsCzpFssz8D9dX9kS",
            "explicit": false,
            "duration": 213000
        },
        {
            "id": "soundtrack:track:77SSlCC3K7HtQbskQpgoCH",
            "title": "Morirò Per Te (2001 Remaster)",
            "artists": [
                "Mina"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJXfqLW6XrnGT8xnchZx8vixPk5wdmmwvn",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJXfqLW6XrnGT8xnchZx8vixPk5wdmmwvn",
            "explicit": false,
            "duration": 260000
        },
        {
            "id": "soundtrack:track:27JAJFojpabuFWU97x0nTe",
            "title": "Automatic Dub",
            "artists": [
                "Wolfram"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhxRiJQDbXWaJ165fVTusjieeuD9FEAWJaqoc",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhxRiJQDbXWaJ165fVTusjieeuD9FEAWJaqoc",
            "explicit": false,
            "duration": 410000
        },
        {
            "id": "soundtrack:track:32hqFvaPnoY3UXR1maZkl3",
            "title": "Caught By Surprise",
            "artists": [
                "Laban"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduZDbSKpaGWNstSvge3PMgHPTJjo1TcEge",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduZDbSKpaGWNstSvge3PMgHPTJjo1TcEge",
            "explicit": false,
            "duration": 225000
        },
        {
            "id": "soundtrack:track:3scFhdSNUturc1dGGZDxTT",
            "title": "Passion",
            "artists": [
                "The Flirts"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvh7zBReEw7M9ha1AymVK8noxyE9CxsDHQwp",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvh7zBReEw7M9ha1AymVK8noxyE9CxsDHQwp",
            "explicit": false,
            "duration": 303000
        },
        {
            "id": "soundtrack:track:5Azj1WUKzznze7TEjl32FV",
            "title": "Stop the Rain in the Night",
            "artists": [
                "Silent Circle"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJiFCXo9rMSf5qc5Lv67JwZ9QgUTRPcxfx",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJiFCXo9rMSf5qc5Lv67JwZ9QgUTRPcxfx",
            "explicit": false,
            "duration": 219000
        },
        {
            "id": "soundtrack:track:2Ft7OtUKio6m0n0ylSUOLx",
            "title": "Your Love - Radio Edit",
            "artists": [
                "Lime"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvehsGpzDuu5EFjv9PppTJfGBX9sRkVPcNiJ",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvehsGpzDuu5EFjv9PppTJfGBX9sRkVPcNiJ",
            "explicit": false,
            "duration": 243000
        },
        {
            "id": "soundtrack:track:09R5sTnvBoJ1Qrh4jTzFOr",
            "title": "Go Go Yellow Screen",
            "artists": [
                "Digital Emotion"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvfuno7w2qfyrkLsQweQLmzfj28tbPsvfKgA",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvfuno7w2qfyrkLsQweQLmzfj28tbPsvfKgA",
            "explicit": false,
            "duration": 227000
        },
        {
            "id": "soundtrack:track:7B5Lp8IThi4OTVKLaKsUCk",
            "title": "Stay with Me Tonight",
            "artists": [
                "Patty Ryan"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBi1yjofkWHyHvwgdTFSUihztKZCrWUn6Ktbxr",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBi1yjofkWHyHvwgdTFSUihztKZCrWUn6Ktbxr",
            "explicit": false,
            "duration": 199000
        },
        {
            "id": "soundtrack:track:7Cal9Bi9KKKFDfpbIeI6la",
            "title": "Jet Airliner",
            "artists": [
                "Modern Talking"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduC4tg4kJCBm4sw3sXkAenxZ4iXs16c8zz",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduC4tg4kJCBm4sw3sXkAenxZ4iXs16c8zz",
            "explicit": false,
            "duration": 261000
        },
        {
            "id": "soundtrack:track:7fGek5IIr7y41ceX1iGEz0",
            "title": "Strangers by Night - Maxi-Version",
            "artists": [
                "C.C. Catch"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduTvttF1M8EK4XJJj6psFoEmpQ494rP6bY",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduTvttF1M8EK4XJJj6psFoEmpQ494rP6bY",
            "explicit": false,
            "duration": 342000
        },
        {
            "id": "soundtrack:track:5ce3DRujFmF6aZqtrZ3I6M",
            "title": "My Darling",
            "artists": [
                "Rainbow Team"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvdueWFYUvMAPcxXvdz1s9MAX8i7n6E62NK8",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvdueWFYUvMAPcxXvdz1s9MAX8i7n6E62NK8",
            "explicit": false,
            "duration": 275000
        },
        {
            "id": "soundtrack:track:6GfCVrJbjAOUjTMxwerqaa",
            "title": "La vita nuova - Daniele Baldelli & Marco Dionigi Remix",
            "artists": [
                "Christine and the Queens",
                "Caroline Polachek",
                "Daniele Baldelli",
                "Marco Dionigi"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhxRj2hdfxRgDFt7qquiB1vqnpkEL7RxFufCr",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhxRj2hdfxRgDFt7qquiB1vqnpkEL7RxFufCr",
            "explicit": false,
            "duration": 385000
        },
        {
            "id": "soundtrack:track:19tXGp1v0NuaCurFnar6Tl",
            "title": "Dancing in My Dream",
            "artists": [
                "Retronic Voice"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhxUXfd8Aeuc6inUu26iqT8A7U8wV6UuBgWXG",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhxUXfd8Aeuc6inUu26iqT8A7U8wV6UuBgWXG",
            "explicit": false,
            "duration": 279000
        },
        {
            "id": "soundtrack:track:7LF0CNDX6MuCJNuCMzKeNu",
            "title": "Whisper To A Scream",
            "artists": [
                "Bobby O"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvh7zBReJNhHxieDrwrreoJHCXjMSAqeNEdL",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvh7zBReJNhHxieDrwrreoJHCXjMSAqeNEdL",
            "explicit": false,
            "duration": 421000
        },
        {
            "id": "soundtrack:track:64hN8fVF02qQazwaiCpIwx",
            "title": "Hello",
            "artists": [
                "Joy",
                "Joy"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvf7PTADDY5yPaDv87t27UPCdpAajvKT5SrA",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvf7PTADDY5yPaDv87t27UPCdpAajvKT5SrA",
            "explicit": false,
            "duration": 292000
        },
        {
            "id": "soundtrack:track:57hbx5WBXhXeCDpplnhEg1",
            "title": "Vamos a la playa",
            "artists": [
                "Righeira"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJM6X8NRru1z2absQFLDwkT25nPMxz9hW6",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJM6X8NRru1z2absQFLDwkT25nPMxz9hW6",
            "explicit": false,
            "duration": 218000
        },
        {
            "id": "soundtrack:track:5uXYOCtS9xJ6vUhDiHY7eL",
            "title": "Brother Louie",
            "artists": [
                "Modern Talking"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJcxWXKXRsJCBoPDuTxQad9jsWk3uGE98z",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJcxWXKXRsJCBoPDuTxQad9jsWk3uGE98z",
            "explicit": false,
            "duration": 221000
        },
        {
            "id": "soundtrack:track:113WC4j6G35wrujtnziuo2",
            "title": "Megahit Mix - Special Version",
            "artists": [
                "Silent Circle"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvf7PTBZoVfqL18ZJ74Q7kvqGH4uVK82uX5x",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvf7PTBZoVfqL18ZJ74Q7kvqGH4uVK82uX5x",
            "explicit": false,
            "duration": 374000
        },
        {
            "id": "soundtrack:track:5dAkZGGBILg7CfirspNvMa",
            "title": "Atlantis Is Calling (S.O.S. for Love)",
            "artists": [
                "Modern Talking"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJcxWXKXRsJCBoPDuTxQad9jsWk3uGE98z",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJcxWXKXRsJCBoPDuTxQad9jsWk3uGE98z",
            "explicit": false,
            "duration": 228000
        },
        {
            "id": "soundtrack:track:4VvGVP3Z728P7qwWjoUbeL",
            "title": "Try It Out",
            "artists": [
                "Gino Soccio"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduTvvFKae7E43ijBCePQoADAdwh5D5g22r",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduTvvFKae7E43ijBCePQoADAdwh5D5g22r",
            "explicit": false,
            "duration": 496000
        },
        {
            "id": "soundtrack:track:0g1zIvFPsxZFCqXhDs2Vuy",
            "title": "Never Say Goodbye",
            "artists": [
                "Chip Chip"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJM6W2yGqAU12hX6rLV3WzCxTZ9tupdLJJ",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJM6W2yGqAU12hX6rLV3WzCxTZ9tupdLJJ",
            "explicit": false,
            "duration": 273000
        },
        {
            "id": "soundtrack:track:0MKz0DIIlLpdeqtLpuLGnl",
            "title": "Woody Boogie",
            "artists": [
                "Baltimora",
                "Baltimora"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvdu6nCPyLWXjtogYdNGLaMf26mkCvf2V4vA",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvdu6nCPyLWXjtogYdNGLaMf26mkCvf2V4vA",
            "explicit": false,
            "duration": 356000
        },
        {
            "id": "soundtrack:track:2QzPfzFSICrGm55EMuqO6K",
            "title": "Winter in My Heart (Radio Version)",
            "artists": [
                "Joy Peters"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhxQv5ddcEwW4hb4qTPjJvF5FTxv1kyo3sZHQ",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhxQv5ddcEwW4hb4qTPjJvF5FTxv1kyo3sZHQ",
            "explicit": false,
            "duration": 239000
        },
        {
            "id": "soundtrack:track:72nSLeNRGE4hRaSYiln04I",
            "title": "Bryllyant",
            "artists": [
                "Boytronic"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhzCjTq367hqkeMnPXfAb9gjYaFBqYemLm4jg",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhzCjTq367hqkeMnPXfAb9gjYaFBqYemLm4jg",
            "explicit": false,
            "duration": 306000
        },
        {
            "id": "soundtrack:track:6qWwgMYR7iFFIC8UpZGvym",
            "title": "Only You",
            "artists": [
                "Savage",
                "Savage"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJM6X888pCj8xSWU6Qr5fyxHCzu8v7bEXx",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJM6X888pCj8xSWU6Qr5fyxHCzu8v7bEXx",
            "explicit": false,
            "duration": 233000
        },
        {
            "id": "soundtrack:track:6BEOz3Emql42LphuRWIbur",
            "title": "Money for Your Love",
            "artists": [
                "Monte Kristo"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJiFDd53towjoYMpWwMKrpVAtznGwHLjRQ",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJiFDd53towjoYMpWwMKrpVAtznGwHLjRQ",
            "explicit": false,
            "duration": 185000
        },
        {
            "id": "soundtrack:track:2DDEaf1j8ZOzVc3esYrjVN",
            "title": "Balla..Balla! (Italien Hit Connection)",
            "artists": [
                "Francesco Napoli"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBi1yjofkWJ3LG8jU9ReBTAvyKGbGNSGFDMYEz",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBi1yjofkWJ3LG8jU9ReBTAvyKGbGNSGFDMYEz",
            "explicit": false,
            "duration": 352000
        },
        {
            "id": "soundtrack:track:1Ur8PldjdEHRsVTwOCdOnw",
            "title": "Only You (Remastered) - Remastered",
            "artists": [
                "Savage",
                "Savage"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJM6X885ajmu5tNJjRg8ofVm1YRkpxBc2a",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJM6X885ajmu5tNJjRg8ofVm1YRkpxBc2a",
            "explicit": false,
            "duration": 230000
        },
        {
            "id": "soundtrack:track:2AEMNhJh4ESTAk9VXl1aKG",
            "title": "Love Reaction",
            "artists": [
                "Divine"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvh7zBReEw7M9ha1AymVK8noyi3fQXWqZ5SE",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvh7zBReEw7M9ha1AymVK8noyi3fQXWqZ5SE",
            "explicit": false,
            "duration": 335000
        },
        {
            "id": "soundtrack:track:1Sz6mhM4MvBbaJW1go1bJB",
            "title": "The Girl of Lucifer",
            "artists": [
                "Monte Kristo"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJiFDd53towjoYMpWwMKrpVAtznGwHLjRQ",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJiFDd53towjoYMpWwMKrpVAtznGwHLjRQ",
            "explicit": false,
            "duration": 234000
        },
        {
            "id": "soundtrack:track:1FLRkF2fNmSuPucs5vCwMe",
            "title": "I Can Lose My Heart Tonight - Extended Club Remix",
            "artists": [
                "C.C. Catch"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJSPBW5y564HB8oU4J97WNYFEGxh5CYJGN",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJSPBW5y564HB8oU4J97WNYFEGxh5CYJGN",
            "explicit": false,
            "duration": 353000
        },
        {
            "id": "soundtrack:track:1dhOQ9GEDnArk0leBDWeBn",
            "title": "Big in Japan - Remaster",
            "artists": [
                "Alphaville"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvhXEViChk4gLnYdPbH5JvWVhfFmCKgdMcHU",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvhXEViChk4gLnYdPbH5JvWVhfFmCKgdMcHU",
            "explicit": false,
            "duration": 285000
        },
        {
            "id": "soundtrack:track:7Ha0C2tb0iCxllnunhFrsY",
            "title": "Zwei - Extended Dub",
            "artists": [
                "Electric Mind"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduZDbAeFRVSiF3iP1o7AroT6hYbrNFwmCA",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduZDbAeFRVSiF3iP1o7AroT6hYbrNFwmCA",
            "explicit": false,
            "duration": 340000
        },
        {
            "id": "soundtrack:track:6OpnrVS4ai3soszL1tXie2",
            "title": "Love Attack",
            "artists": [
                "Tom Hooker"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvdueWEjKWECg7VNobDTBzf19bG1fgQUbx7p",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvdueWEjKWECg7VNobDTBzf19bG1fgQUbx7p",
            "explicit": false,
            "duration": 336000
        },
        {
            "id": "soundtrack:track:0W0WQNOGB45iT3YxpGjtDw",
            "title": "Tonight",
            "artists": [
                "Ken Laszlo"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvgK37Rra8GENuXip9FJrCjhad9riju1UvFG",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvgK37Rra8GENuXip9FJrCjhad9riju1UvFG",
            "explicit": false,
            "duration": 229000
        },
        {
            "id": "soundtrack:track:5Fo0H2BnaQMROIKeSjSahk",
            "title": "In Your Eyes - Original Extended Version",
            "artists": [
                "Reeds"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJM6VDkH3bZNowMgawYN9ysB4VuhoUT1XU",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJM6VDkH3bZNowMgawYN9ysB4VuhoUT1XU",
            "explicit": false,
            "duration": 319000
        },
        {
            "id": "soundtrack:track:0gsRNZi3Veo2Gxn9XAlCNQ",
            "title": "Voice (In the Night) - Vocal Extended",
            "artists": [
                "Martinelli",
                "Martinelli"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvgiZHmtUzoC7B7z8spxLFpArXnNWme19WZt",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvgiZHmtUzoC7B7z8spxLFpArXnNWme19WZt",
            "explicit": false,
            "duration": 519000
        },
        {
            "id": "soundtrack:track:37uSnS21epZtq1LWNwmPq3",
            "title": "Lover on the Line",
            "artists": [
                "Bad Boys Blue"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhxS86ScHbbtFeQva3mLAw5vs75ALnhLWneut",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhxS86ScHbbtFeQva3mLAw5vs75ALnhLWneut",
            "explicit": false,
            "duration": 229000
        },
        {
            "id": "soundtrack:track:6zgc4JSYHhNep7TDHPjAKS",
            "title": "Il Veliero",
            "artists": [
                "The Chaplin Band"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhzCijXbw2SorX584CT3A1nsv134vce3o2RP4",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhzCijXbw2SorX584CT3A1nsv134vce3o2RP4",
            "explicit": false,
            "duration": 205000
        },
        {
            "id": "soundtrack:track:6TQQnilg3ybrYJEdfdp0iZ",
            "title": "Give Me Love",
            "artists": [
                "Cerrone"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhxRiPgv8vu4ATSiy5tP28Te6PHHHJwBBFEea",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhxRiPgv8vu4ATSiy5tP28Te6PHHHJwBBFEea",
            "explicit": false,
            "duration": 462000
        },
        {
            "id": "soundtrack:track:6aoVGiC75XFspEnDCUuVFy",
            "title": "Baila Bolero - 7\" Radio Mix",
            "artists": [
                "Fun Fun"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvgivSUfAvcXCTg9Qk1h7P1oS4y3exJ8qkVt",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvgivSUfAvcXCTg9Qk1h7P1oS4y3exJ8qkVt",
            "explicit": false,
            "duration": 236000
        },
        {
            "id": "soundtrack:track:1P7ey8VeQH3dOxUUToKKn8",
            "title": "Space Hopper",
            "artists": [
                "Proxyon"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvehghWWDw5WpxRhvpT2UmwVVe1EdzWT4i6A",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvehghWWDw5WpxRhvpT2UmwVVe1EdzWT4i6A",
            "explicit": false,
            "duration": 381000
        },
        {
            "id": "soundtrack:track:5WMeLztOk9xQSfxBclV5E3",
            "title": "Geronimo's Cadillac",
            "artists": [
                "Modern Talking"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduC4tg4kJCBm4sw3sXkAenwpFCLJMULUWa",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhvduC4tg4kJCBm4sw3sXkAenwpFCLJMULUWa",
            "explicit": false,
            "duration": 196000
        },
        {
            "id": "soundtrack:track:315YrKV5tgRIU75sIMC2eL",
            "title": "Touch in the Night - Radio Version",
            "artists": [
                "Silent Circle"
            ],
            "albumart": "https://i.soundcdn.com/default/150/150/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJiFCXo9rMSf5qc5Lv67JwZ9QgUTRPcxfx",
            "albumartbig": "https://i.soundcdn.com/default/500/500/PB8ro82ZpZNznW2rHMNFbvBJkp9tkV3iHjzFhCHurQYHddwdNYz2PVKWicKNok7JCXc3ypoZJvNBhveJiFCXo9rMSf5qc5Lv67JwZ9QgUTRPcxfx",
            "explicit": false,
            "duration": 218000
        },

    ]