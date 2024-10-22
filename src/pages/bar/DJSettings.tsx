import React, { ReactNode, useState } from "react";
import TZHeader from "../../components/TZHeader";
import { Colors, padding, radius } from "../../lib/Constants";
import _ from "lodash";
import TZToggle from "../../components/TZToggle";
import { useInterval } from "../../lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faCheck, faLeaf } from "@fortawesome/free-solid-svg-icons";
import { AcceptingType, ShuffleType } from "./Dashboard";
import { Dropdown } from "react-bootstrap";

type DJSettingsProps = {
    genres: string[],
    expandState: [boolean, (b: boolean) => any]
    selectedState: [Set<string>, (s: Set<string>) => any],
    energyState: [number, (n: number) => any],
    bangersState: [boolean, (b: boolean) => any],
    onSetAccept: (s: AcceptingType) => any,
    acceptRadioValueState: [AcceptingType, (s: AcceptingType) => any],
    onSetShuffle: (s: ShuffleType) => any,
    shuffleRadioValueState: [ShuffleType, (s: ShuffleType) => any],
    PlaylistScreen: ReactNode,
    ExplicitButton: ReactNode,
}

function GenreButton(props: { genre: string, selected: Set<string>, onClick: (b: boolean) => any }) {
    const startSelected = props.selected.has(props.genre);

    const [selected, setSelected] = useState(startSelected);

    const onClick = () => {
        const s = selected;
        setSelected(!selected);
        props.onClick(!s);
    }

    return (
        <div style={{ padding: padding, backgroundColor: selected ? Colors.tertiaryDark : "#fff2", borderRadius: radius, cursor: 'pointer' }} onClick={onClick}>
            <span className="onelinetext-montserrat" style={{ fontWeight: 'bold', fontSize: "calc(10px + 0.5vmin)" }}>{props.genre}</span>
        </div>
    )
}

const GenreList = (props: DJSettingsProps & { onGenreClicked: (g: string, b: boolean) => any }) => {
    const genres = props.genres;
    const genresSqrt = Math.ceil(Math.sqrt(genres.length));
    const onGenreClicked = props.onGenreClicked;

    return (
        <div >
            <div style={{ paddingBottom: padding }}>
                <span className="App-montserrat-smallertext" style={{ fontWeight: 'bold' }}>Genres to Play</span>
            </div>
            <div className="App-grid-container" style={{ gridTemplateColumns: `repeat(${genresSqrt}, 1fr)`, gridGap: padding / 2 }}>
                {genres.map(g => <GenreButton genre={g} selected={props.selectedState[0]} onClick={(b) => onGenreClicked(g, b)} />)}
            </div>
        </div>
    )
}

export default function DJSettings(props: DJSettingsProps) {
    const [selected, setSelected] = props.selectedState;
    const [energy, setEnergy] = props.energyState;
    const [bangersOnly, setBangersOnly] = props.bangersState;
    const [expanded, setExpanded] = props.expandState;
    const [acceptRadioValue,] = props.acceptRadioValueState;
    const [shuffleRadioValue,] = props.shuffleRadioValueState;
    const onSetAccept = props.onSetAccept;
    const onSetShuffle = props.onSetShuffle;


    const onGenreClicked = (g: string, add: boolean) => {
        if (add) selected.add(g);
        else selected.delete(g);
        setSelected(_.cloneDeep(selected));
    }

    const onBangersClicked = async () => {
        setBangersOnly(!bangersOnly);
    }

    const onEnergyChange = (n: number) => {
        setEnergy(n);
    }

    const Header = () => {
        const [hovered, setHovered] = useState(false);

        let text = "";

        if (shuffleRadioValue === "Playlist") {
            text += "Shuffling songs off playlist"
        } else {
            text += "Virtual DJ handles shuffle"
        }

        if (acceptRadioValue === "Manual") {
            text += "; you handle requests."
        } else {
            if (shuffleRadioValue === "Playlist") {
                text += "; Virtual DJ "
                if (acceptRadioValue === "TipzyAI") text += " handles "
            } else {
                text += " and "
            }

            if (acceptRadioValue === "Auto") {
                text += "accepts every request."
            } else {
                text += "requests."
            }
        }

        return (
            <div style={{ paddingLeft: padding, paddingRight: padding, paddingTop: padding }}>
                <div className="App-montserrat-normaltext" onClick={() => setExpanded(!expanded)} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
                    style={{ textAlign: 'left', width: "100%", fontWeight: 'bold', display: 'flex', padding: padding, alignItems: 'center', cursor: 'pointer', opacity: hovered ? 0.7 : 1, borderColor: Colors.tertiaryDark, color: "white", borderStyle: "solid", borderWidth: 1, borderRadius: radius }}>
                    {/* <FontAwesomeIcon color={Colors.tertiaryDark} icon={faBars} /> */}

                    {
                        <span>{text}</span>
                    }
                    {expanded ? <></> : <span style={{ paddingLeft: padding, color: Colors.tertiaryLight }}>Configure</span>}

                </div>
            </div>
        )
    }

    const DIR = DropdownItem<AcceptingType>;
    const DIS = DropdownItem<ShuffleType>;

    return (
        <div style={{ width: "100%" }}>
            <Header />
            {
                expanded ?
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ padding: padding, display: 'flex' }}>
                                <div style={{ flexShrink: 1, padding: padding, borderStyle: 'solid', borderColor: Colors.tertiaryDark, borderRadius: radius, borderWidth: 1 }}>
                                    <div className="App-montserrat-smallertext" style={{ fontWeight: 'bold', paddingBottom: 5 }}>Handle requests</div>
                                    <Dropdown>
                                        <Dropdown.Toggle className="App-montserrat-smallertext" variant="tertiary" style={{ height: "100%", color: "white", fontWeight: "bold", padding: padding, borderRadius: radius }} id="dropdown-basic">
                                            {acceptRadioValue === "Manual" ? "Manual" :
                                                acceptRadioValue === "Auto" ? "Accept all" :
                                                    acceptRadioValue === "TipzyAI" ? "Virtual DJ" : "..."}
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu variant="dark" style={{ padding: 0, overflow: 'hidden', borderRadius: radius + 5 }} >
                                            <DIR onSet={onSetAccept} accepting="Manual" val={acceptRadioValue} text="Manual" desc="All requests go by you." />
                                            <DIR onSet={onSetAccept} accepting="Auto" val={acceptRadioValue} text="Accept all" desc={<span>Automatically accepts all reasonable requests.<br />Will only reject songs sent with obviously bad intentions.</span>} />
                                            <DIR onSet={onSetAccept} accepting="TipzyAI" val={acceptRadioValue} text="Virtual DJ" desc={<span>Lets our Virtual DJ accept/reject songs.<br />If it's unsure, it'll defer to you for the final say!</span>} />
                                        </Dropdown.Menu>
                                    </Dropdown>                                    <div className="App-montserrat-smallertext" style={{ fontWeight: 'bold', paddingTop: padding, paddingBottom: 5 }}>Handle shuffle</div>
                                    <Dropdown>
                                        <Dropdown.Toggle className="App-montserrat-smallertext" variant="tertiary" style={{ height: "100%", color: "white", fontWeight: "bold", padding: padding, borderRadius: radius }} id="dropdown-basic">
                                            {shuffleRadioValue === "Playlist" ? "Playlist" :
                                                shuffleRadioValue === "TipzyAI" ? "Virtual DJ" : "..."}
                                        </Dropdown.Toggle>
                                        <Dropdown.Menu variant="dark" style={{ padding: 0, overflow: 'hidden', borderRadius: radius + 5 }} >
                                            <DIS onSet={onSetShuffle} accepting="Playlist" val={shuffleRadioValue} text="Playlist" desc="Shuffles through a playlist set by you." />
                                            <DIS onSet={onSetShuffle} accepting="TipzyAI" val={shuffleRadioValue} text="Virtual DJ" desc={<span>Virtual DJ takes over the night!<br />You curate the type of songs it selects.</span>} />
                                        </Dropdown.Menu>
                                    </Dropdown>
                                </div>
                                {shuffleRadioValue === "TipzyAI" ?
                                    <>
                                        <div style={{ paddingLeft: padding }} />
                                        <div style={{ flexShrink: 1, padding: padding, borderStyle: 'solid', borderColor: Colors.tertiaryDark, borderRadius: radius, borderWidth: 1 }}>
                                            <GenreList {...props} onGenreClicked={onGenreClicked} />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'row', paddingLeft: padding, flexGrow: 1 }}>
                                            <div style={{ paddingBottom: padding, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: radius, backgroundColor: Colors.tertiaryDark, padding: padding }}>
                                                <div style={{ width: "100%", flex: 1, display: "flex", justifyContent: 'space-around' }}>
                                                    <input type="range" className="slider-fader"
                                                        min={0} max={100}
                                                        value={energy}
                                                        onChange={(e) => onEnergyChange(parseInt(e.target.value))}
                                                    />
                                                    <div style={{ flex: 0, display: 'flex' }}>
                                                        <VolumeDisplay val={energy} />
                                                        <div style={{ width: 3 }} />
                                                        <VolumeDisplay val={energy} />
                                                    </div>
                                                </div>
                                                <span className="App-montserrat-smallertext" style={{ fontWeight: 'bold', paddingTop: padding }}>Energy</span>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: padding }}>
                                            {/* <span className="App-montserrat-smallertext" style={{ fontWeight: 'bold' }}>Bangers only</span> */}
                                            <TZToggle title="Bangers Only" value={bangersOnly} onClick={onBangersClicked} />
                                            <div style={{ paddingTop: padding }} />
                                            {props.ExplicitButton}
                                        </div>
                                    </> :
                                    <div style={{ paddingLeft: padding, }}>
                                        {props.PlaylistScreen}
                                    </div>
                                }
                            </div>

                        </div>
                        {/* <div style={{ flex: 1, paddingLeft: padding }}>
                            <span>Virtual DJ is an unfinished feature. For now, enjoy this preview of its interface!</span>
                        </div> */}
                    </>

                    : <></>
            }

        </div>
    );
}

const calcRange = () => {
    return (2 - Math.random() * 4)
}

const VolumeDisplay = (props: { val: number }) => {
    const [value, setValue] = useState(calcRange());

    useInterval(() => setValue(calcRange()), 100 + Math.random() * 200);

    const range = Math.max(Math.min(100 - props.val + value, 100), 0);

    return (
        <div style={{
            width: 5, height: "100%",
            background: `linear-gradient(${Colors.red} 10%, ${Colors.primaryRegular} 30%, #4bd476 60%, #4bd476)`
        }}>
            <div style={{ width: "100%", backgroundColor: Colors.background, height: `${range}%`, transition: "height .2s", }} />
        </div>
    )
}


function DropdownItem<T>(props: { accepting: T, val: T, text: string, desc: string | JSX.Element, onSet: (a: T) => any }) {
    const accepting = props.accepting;
    const val = props.val;
    const Surrounding = (props: { children: JSX.Element | JSX.Element[] }) => {
        const condition = accepting === val;
        return (
            <div style={{ padding: 5 }}>
                <div style={{
                    borderWidth: 1, borderRadius: radius,
                    padding: padding, backgroundColor: condition ? "#fff2" : "#0000",
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', }}>
                            {props.children}
                        </div>
                        {condition ? <FontAwesomeIcon icon={faCheck} color={Colors.tertiaryLight}></FontAwesomeIcon> : <></>}
                    </div>
                </div>
            </div >
        );
    }

    return (
        <Dropdown.Item style={{ padding: 0 }} onClick={async () => {
            props.onSet(props.accepting)
        }}>
            <Surrounding>
                <span className="App-montserrat-smallertext" style={{ color: 'white', fontWeight: 500 }}>{props.text}</span>
                <span className="App-smalltext" style={{ color: '#fff8', display: 'inline-block', lineHeight: 1.3 }}>{props.desc}</span>
            </Surrounding>
        </Dropdown.Item>
    );
}