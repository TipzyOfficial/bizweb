import { Dispatch, memo, SetStateAction, useContext, useEffect } from "react";
import { SongType } from "../../lib/song";
import { AcceptingType, CurrentlyPlayingType, DJSettingsType, getToggles, QueueOrderType, setBlockExplcitRequests, ShuffleType, TagType } from "./Dashboard";
import { UserSessionContext } from "../../lib/UserSessionContext";
import { Colors, padding, radius, useFdim } from "../../lib/Constants";
import PlaybackComponent from "./PlaybackComponent";
import TZToggle from "../../components/TZToggle";
import { Spinner } from "react-bootstrap";
import Queue from "./Queue";
import NotPlaying from "../../components/NotPlaying";
import DJSettings from "./DJSettings";

const GENRES = [
    "Rock",
    "Alt Rock",
    "Blues",
    "Rap",
    "Pop",
    "Dance",
    "RnB",
    "Country",
    "Singalong",
]

type QRDJProps = {
    energyState: [number, (n: number) => any];
    bangersState: [number, (n: number) => any];
    tagsState: [TagType[], (t: TagType[]) => any];
    sendDJSettings: () => any;
    djSettingPlayingNumberState: [number | undefined, (n: number | undefined) => any];
    djSettingsState: [DJSettingsType[], (d: DJSettingsType[]) => any];
    djCurrentSettingNumberState: [number, (n: number) => any];
    acceptRadioValueState: [AcceptingType, (a: AcceptingType) => any];
    shuffleRadioValueState: [ShuffleType, (s: ShuffleType) => any];
    onSetShuffle: (s: ShuffleType) => any;
    onSetAccept: (a: AcceptingType) => any;
    disableTypingState: [boolean, (b: boolean) => any];
    setToggles: (allow: boolean, accept: AcceptingType, noExplicit: boolean) => void;
    toggleBlockExplicitRequestsState: [boolean | undefined, (b: boolean | undefined) => any];
    onPause: () => any;
    onSkip: () => any;
    queueLoading: boolean;
    queueOrder: [QueueOrderType[], Dispatch<SetStateAction<QueueOrderType[]>>]
    editingQueue: [boolean, Dispatch<SetStateAction<boolean>>]
    reorderingState: [boolean, (b: boolean) => any];
    currentlyPlaying: CurrentlyPlayingType | undefined;
    sessionStarted: boolean;
    reorderQueue: (() => Promise<any>)
}

const DJSettingsMemo = memo(DJSettings);

export default function QueueRequestsDJ(props: QRDJProps) {

    const usc = useContext(UserSessionContext);
    const fdim = useFdim();

    const [disableTyping, setDisableTyping] = props.disableTypingState;
    const [toggleBlockExplicitRequests, setToggleBlockExplcitRequests] = props.toggleBlockExplicitRequestsState;
    const [reordering, setReordering] = props.reorderingState;

    const queueLoading = props.queueLoading;
    const currentlyPlaying = props.currentlyPlaying;
    const sessionStarted = props.sessionStarted;

    const setToggles = props.setToggles;
    const onPause = props.onPause;
    const onSkip = props.onSkip;

    const songDims = fdim / 15;

    return (
        <div style={{
            position: 'relative', height: "100%",
            width: "100%",
            // gridTemplateColumns: aiTabVisible ? "1.5fr 3.5fr 1.5fr" : "1.5fr 5fr"
            display: 'flex',
            justifyContent: "space-between",
        }}>

            <div style={{ display: 'flex', flexDirection: 'column', height: "100%", paddingRight: 0, flex: 3 }}>
                {/* <input value={djLocation} onChange={(e) => setDJLocation(e.target.value)}></input> */}
                <div style={{ display: "flex", justifyContent: 'space-between' }}>
                    <DJSettingsMemo
                        genres={GENRES}
                        energyState={props.energyState}
                        bangersState={props.bangersState}
                        tagsState={props.tagsState}
                        sendDJSettings={props.sendDJSettings}
                        djSettingPlayingNumberState={props.djSettingPlayingNumberState}
                        djSettingsState={props.djSettingsState}
                        djCurrentSettingNumberState={props.djCurrentSettingNumberState}
                        acceptRadioValueState={props.acceptRadioValueState}
                        shuffleRadioValueState={props.shuffleRadioValueState}
                        onSetShuffle={props.onSetShuffle}
                        onSetAccept={props.onSetAccept}

                        ExplicitButton={
                            <></>
                        }
                        PlaylistScreen={
                            <>
                                <PlaybackComponent setDisableTyping={setDisableTyping} />
                                <div style={{ display: "flex" }}>
                                    <TZToggle title="Explicit" value={!toggleBlockExplicitRequests} onClick={async () => {
                                        await setBlockExplcitRequests(usc, !toggleBlockExplicitRequests);
                                        setToggles(...await getToggles(usc));
                                    }} />
                                </div>

                            </>

                        }
                    />

                </div>
            </div>
            <div style={{ padding: padding, flex: 1 }}>
                <div className="remove-scrollbar" style={{
                    padding: padding, borderRadius: radius,
                    height: "100%", overflowY: 'scroll', position: 'relative', backgroundColor: Colors.lightBackground, width: "100%"
                }}>
                    {queueLoading ? <div style={{
                        position: 'absolute', width: "100%", height: "100%", top: 0, display: 'flex', justifyContent: 'center', alignItems: 'center',
                        zIndex: 100,
                    }}>
                        <Spinner />
                    </div> : <></>}
                    {/* <Price minPrice={miniumumPrice} currPrice={currentPrice} setMinPrice={setMinimumPrice} refresh={() => refreshPrice(true)} /> */}
                    {/* <div style={{ paddingBottom: padding }} /> */}
                    <span className="App-tertiarytitle">Up next</span>
                    {currentlyPlaying && sessionStarted ?
                        <Queue disable={queueLoading} queueOrder={props.queueOrder} current={currentlyPlaying} songDims={songDims} editingQueue={props.editingQueue} reorderQueue={props.reorderQueue} />
                        :
                        <NotPlaying />
                    }
                </div>
            </div>
        </div>
    )
}