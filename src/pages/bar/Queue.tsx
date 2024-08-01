import FlatList from "flatlist-react/lib";
import { SongType } from "../../lib/song";
import Song from "../../components/Song";
import { padding } from "../../lib/Constants";

export default function Queue(props: { current: SongType | undefined, queue: SongType[] | undefined }) {
    const queue = props.queue;
    const current = props.current;

    return (
        <div style={{ width: "100%" }}>
            <span style={{ padding: 7, backgroundColor: "#8883", borderRadius: 10 }}>Now playing:</span>
            <div style={{ paddingBottom: padding }} />
            <Song song={current ?? { title: "No song playing", artists: ["No artist"], id: "", albumart: "", explicit: false }}></Song>
            <div style={{ paddingBottom: padding * 2 }} />
            <span style={{ padding: 7, backgroundColor: "#8883", borderRadius: 10 }}>Next up:</span>
            <div style={{ paddingBottom: padding }} />
            {queue ?
                <FlatList
                    list={queue}
                    renderItem={(s, k) => <><Song key={k} song={s} /><div style={{ paddingBottom: padding }}></div></>}
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