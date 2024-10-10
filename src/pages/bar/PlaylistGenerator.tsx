import { memo, useContext, useRef, useState } from "react";
import { Colors, padding, radius } from "../../lib/Constants";
import { Input } from "../../components/GiantInput";

import React from "react";
import TZButton from "../../components/TZButton";
import { fetchWithToken } from "../..";
import { UserSessionContext } from "../../lib/UserSessionContext";
import { SongType } from "../../lib/song";
import { parseSongJson } from "../../lib/utils";
import { Modal, Spinner } from "react-bootstrap";
import Song from "../../components/Song";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircle as faCircleEmpty } from "@fortawesome/free-regular-svg-icons";
import { faCircle as faCircleFilled, faQuestion, faQuestionCircle, faWarning, faX, faXmark, faXmarkCircle } from "@fortawesome/free-solid-svg-icons";
import _ from "lodash";


export function PlaylistGenerator(props: { setDisableTyping: (b: boolean) => any }) {
    const [focused, setFocusedIn] = useState(false);
    const [loading, setLoading] = useState(false);
    const [prompt, setPrompt] = useState("");
    const [show, setShow] = useState(false);
    const [songs, setSongs] = useState<SongType[] | undefined | null>(undefined);
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

    return (
        <div
            style={{ width: "100%", display: 'flex', flex: 1, flexDirection: 'column', alignItems: 'center' }}>
            <span className="App-montserrat-aitext" style={{ fontWeight: 'bold' }}>✨ Find songs that match your vibe ✨</span>
            <span className="App-smalltext" style={{ paddingBottom: padding, textAlign: 'center' }}>Using AI, you can find songs you like instantly from a single prompt!</span>
            <div style={{ width: "75%" }}>
                <Input
                    placeholder="What do you want to listen to?"
                    value={prompt} onChange={(e) => setPrompt(e.target.value)}
                    style={{ fontSize: 20 }}
                    multiline
                    maxRows={5}
                    focused={focused}
                    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                />
                <div style={{ height: padding }}></div>
                <TZButton title="Generate" loading={loading} onClick={onSubmit}></TZButton>
            </div>
            <PGMMemo prompt={prompt} show={show}
                onHide={() => {
                    setShow(false);
                    setTimeout(() => { setLoading(false); }, 1000);
                }} songs={songs}
            // selectedSongs={selectedSongs} setSelectedSongs={setSelectedSongs} 
            />
        </div>
    );
}

const PGMMemo = memo(PlaylistGeneratorModal, (a, b) => {
    return a.songs === b.songs &&
        a.show === b.show &&
        a.onHide === b.onHide
    // && a.selectedSongs === b.selectedSongs &&
    // a.setSelectedSongs === b.setSelectedSongs;
});

function PlaylistGeneratorModal(props: {
    prompt: string, show: boolean, onHide: () => any, songs: SongType[] | undefined | null,
    // selectedSongs: Set<string>, setSelectedSongs: (s: Set<string>) => any 
}) {
    const songs = props.songs;
    const [selectedSongs, setSelectedSongs] = useState<Set<string>>(new Set());
    const [defaultSelect, setDefaultSelect] = useState(false); //dummy to basically force rerender

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

    const onAddSongsClick = () => {
        alert(selectedSongs.size);
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

    return (
        <Modal centered show={props.show} backdrop="static" onHide={() => {
            setSelectedSongs(new Set<string>());
            props.onHide();
        }} data-bs-theme={"dark"} size={"lg"} >
            <Modal.Header closeButton style={{ color: "white", }}>
                <span className="onelinetextplain" style={{ fontSize: "calc(15px + 0.5vmin)", height: "100%", textOverflow: 'ellipsis' }}>Results for "{props.prompt}"</span>
            </Modal.Header>
            <div style={{ position: "relative", display: 'flex', justifyContent: 'flex-start', alignItems: 'center', color: "white" }}>
                {songs && songs.length !== 0 ?
                    <>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', flex: 1, position: 'absolute', zIndex: 100, top: padding, right: padding }}>
                            <div>
                                <TZButton backgroundColor={Colors.green} title="Select all" fontSize={15} onClick={onSelectAllClick}></TZButton>
                            </div>
                            <div style={{ width: padding }} />
                            <div>
                                <TZButton backgroundColor={Colors.red} title="Deselect all" fontSize={15} onClick={onDeselectAllClick}></TZButton>
                            </div>
                        </div>
                    </>
                    : <></>
                }
            </div>

            <Modal.Body style={{ color: "white", overflow: 'scroll', maxHeight: window.screen.height * 0.62, padding: 0 }}>
                {songs ?
                    songs.length === 0 ?
                        <div style={{
                            paddingLeft: padding, paddingRight: padding, paddingTop: padding * 2, paddingBottom: padding * 2,
                            width: "100%", display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
                        }}>
                            <FontAwesomeIcon icon={faQuestionCircle} color="white"></FontAwesomeIcon>
                            <div style={{ height: padding }} />
                            <span className="App-smalltext" style={{ textAlign: 'center' }}>Hm. We can't seem to find any songs matching that prompt.<br />Try telling us the general atmopshere you want, and artists/genres that you want included.</span>
                        </div>
                        :
                        <>
                            <div style={{ height: padding }} />
                            {songs.map((song) => <PGMRenderItem song={song} setSelected={(b) => setSelected(b, song)} selectedSongs={selectedSongs} />)}
                        </>
                    :
                    <div style={{ padding: padding, width: "100%", minHeight: window.screen.height * 0.3, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        {songs === null ?
                            <>
                                <FontAwesomeIcon icon={faWarning} color="white"></FontAwesomeIcon>
                                <div style={{ height: padding }} />
                                <span className="App-smalltext">Unfortunately, there was an error getting your songs. Please try again.</span>
                            </>
                            :
                            <>
                                <Spinner />
                                <div style={{ height: padding }} />
                                <span className="App-smalltext" >Hang on...this may take a moment.</span>
                            </>
                        }
                    </div>
                }
            </Modal.Body>
            {songs && songs.length !== 0 ?
                <Modal.Footer style={{ color: "white", overflow: 'scroll', }}>
                    <TZButton title={selectedSongs.size > 0 ? `Select ${selectedSongs.size} songs` : "Select songs"} onClick={onAddSongsClick} disabled={selectedSongs.size === 0} />
                </Modal.Footer>
                : <></>}
        </Modal>
    )
}

const PGMRenderItem = (props: { song: SongType, setSelected: (b: boolean) => any, selectedSongs: Set<string> }) => {
    const [hoverStatus, setHoverStatus] = useState(0);
    // const [selected, setSelected] = useState(false);
    const selectedSongs = props.selectedSongs;
    const selected = props.selectedSongs.has(props.song.id);

    return (
        <div style={{ width: "100%", paddingBottom: padding }}>
            <div
                onPointerEnter={() => setHoverStatus(0.5)} onPointerLeave={() => setHoverStatus(0)} onPointerDown={() => setHoverStatus(1)} onPointerUp={() => setHoverStatus(0.5)}
                style={{
                    width: "100%", display: "flex", alignItems: 'center', paddingLeft: padding, paddingRight: padding,
                    backgroundColor: hoverStatus === 1 ? "#fff3" : hoverStatus === 0.5 ? "#fff1" : "#fff0", cursor: 'Pointer'
                }}
                onClick={() => {
                    // setSelected(!selected);
                    props.setSelected(!selected);
                }}
            >
                <div style={{ paddingRight: padding, opacity: selected ? 1 : 0.5 }}>
                    <FontAwesomeIcon icon={selected ? faCircleFilled : faCircleEmpty}></FontAwesomeIcon>
                </div>
                <Song song={props.song} />
            </div>
        </div>

    )
}