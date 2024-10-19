import { useState } from "react";
import TZHeader from "../../components/TZHeader";
import { Colors, padding, radius } from "../../lib/Constants";
import _ from "lodash";
import TZToggle from "../../components/TZToggle";
import { useInterval } from "../../lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";

type DJSettingsProps = {
    genres: string[],
    expandState: [boolean, (b: boolean) => any]
    selectedState: [Set<string>, (s: Set<string>) => any],
    energyState: [number, (n: number) => any],
    bangersState: [boolean, (b: boolean) => any],
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
            <span className="onelinetext-montserrat" style={{ fontWeight: 'bold', }}>{props.genre}</span>
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

        return (
            <div style={{ paddingLeft: padding, paddingRight: padding, paddingTop: padding }}>
                <div className="App-montserrat-normaltext" onClick={() => setExpanded(!expanded)} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
                    style={{ textAlign: 'left', width: "100%", fontWeight: 'bold', display: 'flex', padding: padding, alignItems: 'center', cursor: 'pointer', opacity: hovered ? 0.7 : 1, borderColor: Colors.tertiaryDark, color: "white", borderStyle: "solid", borderWidth: 1, borderRadius: radius }}>
                    <FontAwesomeIcon color={Colors.tertiaryDark} icon={faBars} />
                    <span style={{ paddingLeft: padding }}>Configure your Virtual DJ</span>
                </div>
            </div>
        )
    }

    return (
        <div style={{ width: "100%" }}>
            <Header />

            {
                expanded ?
                    <>
                        <div style={{ display: 'flex' }}>
                            <div style={{ padding: padding, display: 'flex' }}>
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
                                    <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: padding }}>
                                        {/* <span className="App-montserrat-smallertext" style={{ fontWeight: 'bold' }}>Bangers only</span> */}
                                        <TZToggle title="Bangers Only" value={bangersOnly} onClick={onBangersClicked} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={{ flex: 1, paddingLeft: padding }}>
                            <span>Virtual DJ is an unfinished feature. For now, enjoy this preview of its interface!</span>
                        </div>
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