import FlatList from "flatlist-react/lib";
import { SongType } from "../../lib/song";
import Song from "../../components/Song";
import { padding } from "../../lib/Constants";

export default function Queue(props: { current: SongType | undefined, queue: SongType[] | undefined }) {
    const queue = props.queue;
    const current = props.current;









    return (
        <div style={{ width: "100%", height: "100%" }}>
            <div className="App-headertop">
                <span className="App-subtitle" style={{ paddingBottom: padding, width: "100%", textAlign: "center" }}>Requests</span>
            </div>
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