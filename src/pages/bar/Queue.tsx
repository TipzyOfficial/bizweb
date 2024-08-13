import FlatList from "flatlist-react/lib";
import { SongType } from "../../lib/song";
import Song from "../../components/Song";
import { padding, useFdim } from "../../lib/Constants";
import LogoLetter from "../../assets/LogoLetter.svg"

export default function Queue(props: { current: SongType | undefined, queue: SongType[] | undefined, songDims?: number }) {
    const queue = props.queue;
    const current = props.current;
    const fdim = useFdim();
    const logoDim = fdim / 30;

    return (
        <div style={{ width: "100%" }}>
            <span className="App-montserrat-normaltext" style={{ paddingBottom: 7 }}>Now playing:</span>
            <div style={{ paddingBottom: padding }} />
            <Song song={current ?? { title: "No song playing", artists: ["No artist"], id: "", albumart: "", explicit: false }} dims={props.songDims}></Song>
            <div style={{ paddingBottom: padding * 2 }} />
            <span className="App-montserrat-normaltext" style={{ paddingBottom: 7 }}>Next up:</span>
            <div style={{ paddingBottom: padding }} />
            {queue ?
                <FlatList
                    list={queue}
                    renderItem={(s, k) => <>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Song key={k} song={s} dims={props.songDims} />
                            {s.manuallyQueued ?
                                <img src={LogoLetter} style={{ width: logoDim, height: logoDim }} alt="This song was requested by a tipper." />
                                : <></>
                            }
                        </div>
                        <div style={{ paddingBottom: padding }} />
                    </>
                    }
                    renderWhenEmpty={
                        <div>
                            <span>Queue is empty...</span>
                        </div>
                    }
                />
                :
                <div>
                    <span>There was a problem getting your queue... are you sure you've set up everything completely?</span>
                </div>
            }
        </div>
    )
}