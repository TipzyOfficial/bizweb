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
import { CurrentlyPlayingType } from "./Dashboard";


type SongDraggableType = SongType// { id: string, song: SongType }
export interface SongCardProps {
    id: string,
    song: SongType,
    moveCard: (id: string, to: number) => void,
    findCard: (id: string) => { index: number },
    dims?: number,
    onDrop: () => void,
    disable?: boolean
};
interface Item {
    id: string
    originalIndex: number
};

type QueueProps = {
    current: CurrentlyPlayingType,
    queueOrder: [SongType[], React.Dispatch<React.SetStateAction<SongType[]>>],
    editingQueue: [boolean, React.Dispatch<React.SetStateAction<boolean>>],
    songDims?: number,
    reorderQueue: () => Promise<any>,
    disable?: boolean,
}

export default function Queue(props: QueueProps) {
    // const queue = props.queue;
    const current = props.current[0];
    const progress = props.current[1];
    const fdim = useFdim();

    const queueOrder = props.queueOrder[0];
    const [editingQueue, setEditingQueue] = props.editingQueue;

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

    return (
        <div style={{ width: "100%" }}>
            <span className="App-montserrat-normaltext" style={{ paddingBottom: 7 }}>Now playing:</span>
            <div style={{ paddingBottom: padding }} />
            <div style={{ padding: padding, backgroundColor: "#fff1", borderRadius: radius }}>
                <Song song={current ?? { title: "No song playing", artists: ["No artist"], id: "", albumart: "", explicit: false }} dims={props.songDims}></Song>
                {progress ?
                    <>
                        <div style={{ paddingBottom: padding }} />
                        <div style={{ width: "100%", height: playbackHeight, backgroundColor: "#fff2" }}>
                            <div className="App-animated-gradient-fast-light" style={{ width: `${(progress.progressMs / progress.durationMs) * 100}%`, height: "100%", backgroundColor: 'white' }}></div>
                        </div>
                    </> : <></>}
            </div>
            <div style={{ paddingBottom: padding * 2 }} />
            {
                editingQueue ?
                    <div style={{ display: 'flex' }}>
                        <TZButton title="Save changes" onClick={onSave} backgroundColor={Colors.green}></TZButton>
                        <div style={{ width: padding }} />
                        <TZButton title="Cancel" onClick={onCancel} backgroundColor={Colors.red}></TZButton>
                    </div> : <></>
            }
            <span className="App-montserrat-normaltext" style={{ paddingBottom: 7 }}>Next up: (drag to reorder)</span>
            <div style={{ paddingBottom: padding }} />
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
    data: [SongDraggableType[], (s: SongDraggableType[]) => void],
    editingQueue: [boolean, React.Dispatch<React.SetStateAction<boolean>>],
    dims?: number,
    disable?: boolean,
}) {
    const [cards, setCards] = props.data;
    // const setCards = props.data[1];

    const [editingQueue, setEditingQueue] = props.editingQueue;

    const findCard = useCallback(
        (id: string) => {
            const card = cards.filter((c) => `${c.id}` === id)[0] as SongType
            return {
                card,
                index: cards.indexOf(card),
            }
        },
        [cards],
    )

    const moveCard = useCallback(
        (id: string, atIndex: number) => {
            const { card, index } = findCard(id);
            setCards(
                update(cards, {
                    $splice: [
                        [index, 1],
                        [atIndex, 0, card],
                    ],
                }),
            )
        },
        [findCard, cards, setCards],
    )

    const [, drop] = useDrop(() => ({ accept: 'card' }))
    return (
        <div ref={drop} style={{ flex: 1 }}>
            {cards.map((card) => (
                <SongCard
                    key={card.id}
                    id={card.id}
                    song={card}
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
    const fdim = useFdim();
    const originalIndex = findCard(id).index;
    const [{ isDragging }, drag] = useDrag(
        () => ({
            type: 'card',
            item: { id, originalIndex },
            collect: (monitor) => ({
                isDragging: monitor.isDragging(),
            }),
            canDrag: !disable,
            end: (item, monitor) => {
                const { id: droppedId, originalIndex } = item
                const didDrop = monitor.didDrop()
                if (!didDrop) {
                    moveCard(droppedId, originalIndex)
                } else {
                    onDrop();
                }
            },
        }),
        [id, originalIndex, moveCard],
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