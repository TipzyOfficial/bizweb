import { useState } from "react";
import { Colors, padding, radius, smallPadding } from "../lib/Constants";
import { useInterval } from "../lib/utils";
import { CurrentlyPlayingType } from "../pages/bar/Dashboard";
import Song from "./Song";
import PlaybackComponent from "../pages/bar/PlaybackComponent";
import { PlaybackButton } from "./PlaybackButton";
import { faForwardStep, faPause, faPauseCircle, faPlay, faPlayCircle } from "@fortawesome/free-solid-svg-icons";
import { Spinner } from "react-bootstrap";

type CurrentlyPlayingBarProps = {
    queueLoading: boolean,
    pauseOverride: boolean,
    current: CurrentlyPlayingType | undefined,
    onPause: () => any,
    onSkip: () => any,
    lastPullTime: number
}

export default function CurrentlyPlayingBar(props: CurrentlyPlayingBarProps) {
    const current = props.current;
    const progress = current ? current[1] : { progressMs: 0, durationMs: 0, paused: true };
    const paused = props.pauseOverride === undefined ? progress.paused : props.pauseOverride;
    const [pos, setPos] = useState(0);
    const queueLoading = props.queueLoading;

    useInterval(() => {
        if (!paused) {
            setPos(Date.now() - props.lastPullTime);
        }
        console.log("pos", (current ? current[1].progressMs : 0) + Date.now() - props.lastPullTime, current ? current[1].progressMs : 0, Date.now() - props.lastPullTime)
    }, 100);

    if (!current) return (<></>);



    return (
        <div style={{ position: "relative", width: "100%" }}>
            <div style={{ width: "100%", padding: padding * 1.5, backgroundColor: Colors.darkBackground, display: "flex", opacity: queueLoading ? 0.5 : 1 }}>
                <div style={{ flex: 1 }}>
                    <Song song={current[0]} />
                </div>
                <div style={{ flex: 2, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div style={{ width: "100%", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ padding: padding }} />
                        <PlaybackButton icon={paused ? faPlay : faPause} onClick={props.onPause} disable={queueLoading} />
                        <div style={{ padding: padding }} />
                        <PlaybackButton icon={faForwardStep} onClick={props.onSkip} disable={queueLoading} />
                    </div>
                    <div style={{ width: "100%", height: 5, backgroundColor: "#fff3", borderRadius: radius, overflow: 'hidden' }}>
                        <div className="App-animated-gradient-fast-light" style={{ width: `${((current[1].progressMs + pos) / current[1].durationMs) * 100}%`, height: 5, borderRadius: radius, overflow: 'hidden' }} />
                    </div>
                </div>
                <div style={{ flex: 1 }}>

                </div>
            </div>
            {queueLoading ? <div style={{
                position: 'absolute', width: "100%", height: "100%", top: 0, display: 'flex', justifyContent: 'center', alignItems: 'center',
                zIndex: 100, backgroundColor: "#0003"
            }}>
                <Spinner />
            </div> : <></>}
        </div>
    )
}