import FlatList from "flatlist-react/lib";
import { SongType } from "../../lib/song";
import Song, { SongList } from "../../components/Song";
import { Colors, padding, radius, useFdim } from "../../lib/Constants";
import { useDrag, useDrop } from 'react-dnd';
import { FC, memo, useCallback, useEffect, useState } from "react";
import update from 'immutability-helper';
import _ from "lodash";
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import TZButton from "../../components/TZButton";
import { CurrentlyPlayingType, QueueOrderType } from "./Dashboard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRightArrowLeft, faArrowsUpDown, faForwardStep, faPause, faPlay, faRightLeft, faVolumeDown, faVolumeLow, faVolumeMute, faVolumeUp, IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { millisToHoursMinutes, millisToMinutesAndSeconds, useInterval } from "../../lib/utils";
import { PlaybackButton } from "../../components/PlaybackButton";


// type SongDraggableType = { id: string, song: SongType }
export interface SongCardProps {
    id: string,
    song: SongType,
    moveCard: (id: string | undefined, to: number | undefined) => void,
    findCard: (id: string | undefined) => { index: number },
    dims?: number,
    onDrop: () => void,
    disable?: boolean
};
interface Item {
    id: string
    originalIndex: number
};

type QueueProps = {
    // pauseOverride?: boolean;
    current: CurrentlyPlayingType,
    queueOrder: [QueueOrderType[], React.Dispatch<React.SetStateAction<QueueOrderType[]>>],
    editingQueue: [boolean, React.Dispatch<React.SetStateAction<boolean>>],
    // volumeState: [number, React.Dispatch<React.SetStateAction<number>>]
    songDims?: number,
    reorderQueue: () => Promise<any>,
    disable?: boolean,
    // onPauseClick: () => any,
    // onSkipClick: () => any,
    // lastPullTime: number,
}

export default function Queue(props: QueueProps) {
    // const queue = props.queue;
    const current = props.current[0];
    const progress = props.current[1];
    // const paused = props.pauseOverride === undefined ? progress.paused : props.pauseOverride;

    const queueOrder = props.queueOrder[0];

    // useEffect(() => {
    //     setSDQueueOrder(queueOrder.map(v => { return { song: v, id: v.id } }))
    // }, queueOrder)

    // console.log("qol", queueOrder.length)

    const [editingQueue, setEditingQueue] = props.editingQueue;
    // const [volume, setVolume] = props.volumeState;
    // const [pos, setPos] = useState(0);

    // console.log("QO", props.queueOrder);

    const onSave = async () => {
        //setEditingQueue(false);
        await props.reorderQueue();
        // setEditingQueue(false);
    }

    const onCancel = () => {
        setEditingQueue(false);
    }

    const playbackHeight = 3;

    // console.log("tslp", Date.now() - props.lastPullTime);

    // useInterval(() => {
    //     setPos(Date.now() - props.lastPullTime)
    // }, 1000);

    const totalMs = (): number => {
        if (!queueOrder || queueOrder.length === 0) return 0;
        return queueOrder.reduce((prev, curr) => { return { ...curr, duration: (prev.song.duration ?? 0) + (curr.song.duration ?? 0) } }).song.duration ?? 0;
    }

    return (
        <div style={{ width: "100%", display: 'flex', flexDirection: 'column' }}>
            <span className="App-smalltext">{queueOrder.length} tracks · {millisToHoursMinutes(totalMs())}</span>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ paddingRight: 7 }}>
                    <FontAwesomeIcon style={{ transform: "rotate(90deg) scaleX(-1)" }} icon={faArrowRightArrowLeft}></FontAwesomeIcon>
                </div>
                <span className="App-smalltext">Drag to reorder the queue</span>
            </div>
            {/* <div style={{ display: 'flex' }}>
                <div style={{ padding: padding, backgroundColor: "#fff1", borderRadius: radius, flex: 1 }}>
                    <div style={{ display: 'flex' }}>
                        <div style={{ flexGrow: 1, width: '100%' }}>
                            <Song song={current ?? { title: "No song playing", artists: ["No artist"], id: "", albumart: "", explicit: false }} dims={props.songDims}></Song>
                        </div>
                        <div style={{ width: "100%", display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, paddingLeft: padding, paddingRight: padding }}>
                            <PlaybackButton icon={paused ? faPlay : faPause} disable={props.disable} onClick={props.onPauseClick} />
                            <div style={{ width: padding * 2 }} />
                            <PlaybackButton icon={faForwardStep} disable={props.disable} onClick={props.onSkipClick} />
                        </div>
                    </div>
                    {progress ?
                        <>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <div style={{ width: "100%", height: playbackHeight, backgroundColor: "#fff2" }}>
                                    <div className="App-animated-gradient-fast-light" style={{ width: `${((progress.progressMs + Date.now() - props.lastPullTime) / progress.durationMs) * 100}%`, height: "100%", backgroundColor: 'white' }}></div>
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'row', position: "relative", justifyContent: 'flex-end', alignItems: 'center' }}>
                                    <div style={{ position: "absolute", left: padding }}>
                                        <FontAwesomeIcon icon={volume > 50 ? faVolumeUp : volume > 0 ? faVolumeDown : faVolumeMute}></FontAwesomeIcon>
                                    </div>
                                    <div style={{ width: padding }} />
                                    <div style={{ padding: padding }} />
                                    <div style={{ display: 'flex', height: "100%" }}>
                                        <input type="range" className="slider-volume"
                                            style={{ width: 100 }}
                                            min={0} max={100}
                                            step={10}
                                            value={volume}
                                            onChange={(e) => setVolume(parseInt(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </> : <></>}
                </div>
            </div> */}
            <div style={{ paddingBottom: padding }} />
            {
                editingQueue ?
                    <div style={{ display: 'flex', paddingBottom: padding }}>
                        <TZButton title="Save changes" onClick={onSave} backgroundColor={Colors.green}></TZButton>
                        <div style={{ width: padding }} />
                        <TZButton title="Cancel" onClick={onCancel} backgroundColor={Colors.red}></TZButton>
                    </div> : <></>
            }
            {
                queueOrder ?
                    <Container disable={props.disable} data={props.queueOrder} dims={props.songDims} editingQueue={props.editingQueue} />
                    :
                    <div>
                        <span>There was a problem getting your queue... are you sure you've set up everything completely?</span>
                    </div>
            }
        </div >
    )
}

const Container = memo(function Container(props: {
    data: [QueueOrderType[], (s: QueueOrderType[]) => void],
    editingQueue: [boolean, React.Dispatch<React.SetStateAction<boolean>>],
    dims?: number,
    disable?: boolean,
}) {
    const [cards, setCards] = props.data;
    // const setCards = props.data[1];

    const [editingQueue, setEditingQueue] = props.editingQueue;

    const findCard = useCallback(
        (id: string | undefined) => {
            if (id === undefined) return { card: undefined, index: -1 };
            const card = cards.filter((c) => `${c.id}` === id)[0] as QueueOrderType
            return {
                card,
                index: cards.indexOf(card),
            }
        },
        [cards],
    )

    const moveCard = useCallback(
        (id: string | undefined, atIndex: number | undefined) => {
            if (id === undefined || atIndex === undefined) {
                return;
            }
            const { card, index } = findCard(id);
            if (card) {
                setCards(
                    update(cards, {
                        $splice: [
                            [index, 1],
                            [atIndex, 0, card],
                        ],
                    }),
                )
            }
        },
        [findCard, cards, setCards],
    )

    const [, drop] = useDrop(() => ({ accept: 'card' }))
    return (
        <div ref={drop} style={{ flex: 1 }}>
            {cards.map((card) => (
                card === undefined ?
                    <></>
                    :
                    <SongCard
                        key={card.id}
                        id={card.id}
                        song={card.song}
                        moveCard={moveCard}
                        findCard={findCard}
                        dims={props.dims}
                        onDrop={() => setEditingQueue(true)}
                        disable={props.disable}
                    />
            ))}
        </div>
    )
});

const SongCard: FC<SongCardProps> = memo(function Card({
    id,
    song,
    moveCard,
    findCard,
    dims,
    onDrop,
    disable,
}) {
    const originalIndex = id ? findCard(id).index : undefined;
    const [{ isDragging }, drag] = useDrag(
        () => ({
            type: 'card',
            item: { id, originalIndex },
            isDragging(monitor) {
                const item = monitor.getItem()
                return id === item.id
            },
            collect: (monitor) => ({
                isDragging: monitor.isDragging(),
            }),
            canDrag: !disable,
            end: (item, monitor) => {
                const { id: droppedId, originalIndex } = item
                const didDrop = monitor.didDrop()
                if (!didDrop) {
                    // moveCard(droppedId, originalIndex)
                } else {
                    onDrop();
                }
            },
        }),
        [id, originalIndex, moveCard, disable],
    );

    const [, drop] = useDrop(
        () => ({
            accept: 'card',
            hover({ id: draggedId }: Item) {
                if (draggedId !== id) {
                    const { index: overIndex } = findCard(id)
                    moveCard(draggedId, overIndex)
                }
            },
        }),
        [findCard, moveCard],
    )

    const opacity = disable ? 0.5 : isDragging ? 0.3 : 1;

    return (
        <div ref={(node) => drag(drop(node))} style={{ opacity, paddingBottom: padding, cursor: 'move', display: 'flex', justifyContent: 'space-between' }}>
            <Song song={song} dims={dims} />
        </div>
    )
})

// , (a, b) => {
//     return (
//         // // a.id === b.id &&
//         // a.song === b.song &&
//         // a.dims === b.dims &&
//         // a.disable === b.disable
//         false
//     )
// })