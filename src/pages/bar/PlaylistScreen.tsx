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

export function PlaylistScreen(props: { visibleState: [boolean, (b: boolean) => any], setDisableTyping: (b: boolean) => any, setAlertContent: (a: AlertContentType) => any }) {
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

    const onSelectAllClick = () => {
        if (songs) {
            setSelectedSongs(new Set<string>(songs?.map(s => s.id)));
        }
    }

    const onDeselectAllClick = () => {
        if (songs) {
            setSelectedSongs(new Set<string>());
        }
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
                    <div style={{ position: "sticky", top: 0, backgroundColor: Colors.background, width: "100%", display: 'flex', flex: 0, flexDirection: 'column', alignItems: 'center' }}>
                        {/* <div style={{ display: 'flex', width: "100%", }}>
                            <TabButton text="By You ✨" tab={tab} id={0} onClick={setTab}></TabButton>
                            <TabButton text="Playlists" tab={tab} id={1} onClick={setTab}></TabButton>
                        </div > */}
                        {tab === 0 && songs && songs.length !== 0 ?
                            <>
                                <div style={{ width: "100%", display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: "white" }}>
                                    <>
                                        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                                            <div style={{ display: 'flex' }}>
                                                <TZButton backgroundColor={"#0000"} title="Cancel" fontSize={15} onClick={onCancelClick}></TZButton>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            <span className="onelinetextplain" style={{ textAlign: 'center', fontSize: "calc(10px + 0.5vmin)", textOverflow: 'ellipsis' }}>Results for "{prompt}"</span>
                                        </div>
                                        <div style={{ flex: 1, minWidth: "-webkit-min-content", display: 'flex', justifyContent: 'flex-end', flexBasis: 0 }}>
                                            <div style={{ display: 'flex' }}>
                                                <TZButton color={Colors.green} backgroundColor={"#0000"} title="Select all" fontSize={15} onClick={onSelectAllClick}></TZButton>
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

                    <div
                        style={{ width: "100%", display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center' }}>

                        {tab === 0 ? //AI SCREEN
                            <>
                                <div style={{ width: "100%", display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1, }}>
                                    {show ?
                                        <></>
                                        :
                                        <>
                                            <div style={{ padding: padding, display: 'flex', flexDirection: 'column' }}>
                                                <span className="App-montserrat-aitext" style={{ fontWeight: 'bold', textAlign: 'center' }}>✨ Find songs that match your vibe ✨</span>
                                                <span className="App-smalltext" style={{ textAlign: 'center' }}>Using AI, you can find songs you like instantly from a single prompt!</span>
                                            </div>
                                            <div style={{ width: "75%" }}>
                                                <Input
                                                    placeholder="What do you want to listen to?"
                                                    value={prompt} onChange={(e) => setPrompt(e.target.value)}
                                                    style={{ fontSize: 20 }}
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
                                                <div style={{ display: 'flex' }}>
                                                    <TZButton title="Generate" loading={loading} onClick={onSubmit}></TZButton>
                                                </div>
                                            </div>
                                        </>
                                    }
                                    <div style={{ width: "100%", overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <PGMMemo prompt={prompt} show={show}
                                            selectedSongs={selectedSongs}
                                            setSelectedSongs={setSelectedSongs}
                                            onHide={onHide} songs={songs}
                                            onQueueClick={onQueueClick}
                                        />
                                    </div>
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
    prompt: string, show: boolean, onHide: () => any, songs: SongType[] | undefined | null,
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