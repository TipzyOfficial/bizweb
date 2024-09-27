import FlatList from "flatlist-react/lib";
import { SongType } from "../../lib/song";
import Song, { SongList } from "../../components/Song";
import { padding, useFdim } from "../../lib/Constants";
import LogoLetter from "../../assets/LogoLetter.svg";
import { useDrag, useDrop } from 'react-dnd';
import { FC, memo, useCallback, useEffect, useState } from "react";
import update from 'immutability-helper';
import _ from "lodash";
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'


type SongDraggableType = SongType// { id: string, song: SongType }
export interface SongCardProps {
    id: string,
    song: SongType,
    moveCard: (id: string, to: number) => void,
    findCard: (id: string) => { index: number },
    dims?: number
};
interface Item {
    id: string
    originalIndex: number
};

export default function Queue(props: { current: SongType | undefined, queueOrder: [SongType[], React.Dispatch<React.SetStateAction<SongType[]>>], songDims?: number }) {
    // const queue = props.queue;
    const current = props.current;
    const fdim = useFdim();
    const logoDim = fdim / 30;

    const [queueOrder, setQueueOrder] = props.queueOrder;

    // console.log("QO", props.queueOrder);

    return (
        <DndProvider backend={HTML5Backend}>
            <div style={{ width: "100%" }}>
                <span className="App-montserrat-normaltext" style={{ paddingBottom: 7 }}>Now playing:</span>
                <div style={{ paddingBottom: padding }} />
                <Song song={current ?? { title: "No song playing", artists: ["No artist"], id: "", albumart: "", explicit: false }} dims={props.songDims}></Song>
                <div style={{ paddingBottom: padding * 2 }} />
                <span className="App-montserrat-normaltext" style={{ paddingBottom: 7 }}>Next up:</span>
                <div style={{ paddingBottom: padding }} />
                {queueOrder ?
                    // <FlatList
                    //     list={queue}
                    //     renderItem={(s, k) => <>
                    //         <div style={{ display: 'flex', alignItems: 'center' }}>
                    //             <Song key={k} song={s} dims={props.songDims} />
                    //             {s.manuallyQueued ?
                    //                 <img src={LogoLetter} style={{ width: logoDim, height: logoDim }} alt="This song was requested by a tipper." />
                    //                 : <></>
                    //             }
                    //         </div>
                    //         <div style={{ paddingBottom: padding }} />
                    //     </>
                    //     }
                    //     renderWhenEmpty={
                    //         <div>
                    //             <span>Queue is empty...</span>
                    //         </div>
                    //     }
                    // />
                    <Container data={props.queueOrder} dims={props.songDims} />
                    :
                    <div>
                        <span>There was a problem getting your queue... are you sure you've set up everything completely?</span>
                    </div>
                }
            </div>
        </DndProvider>
    )
}

const Container = memo(function Container(props: { data: [SongDraggableType[], (s: SongDraggableType[]) => void], dims?: number }) {
    const cards = props.data[0];
    const setCards = props.data[1];

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
            const { card, index } = findCard(id)
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
}) {
    const originalIndex = findCard(id).index
    const [{ isDragging }, drag] = useDrag(
        () => ({
            type: 'card',
            item: { id, originalIndex },
            collect: (monitor) => ({
                isDragging: monitor.isDragging(),
            }),
            end: (item, monitor) => {
                const { id: droppedId, originalIndex } = item
                const didDrop = monitor.didDrop()
                if (!didDrop) {
                    moveCard(droppedId, originalIndex)
                }
            },
        }),
        [id, originalIndex, moveCard],
    )

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

    const opacity = isDragging ? 0 : 1
    return (
        <div ref={(node) => drag(drop(node))} style={{ opacity, paddingBottom: padding }}>
            <Song song={song} dims={dims} />
        </div>
    )
})