import React, { memo, ReactNode, useState } from "react";
import TZHeader from "../../components/TZHeader";
import { Colors, padding, radius, useFdim } from "../../lib/Constants";
import _ from "lodash";
import TZToggle from "../../components/TZToggle";
import { useInterval } from "../../lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faCheck, faChevronRight, faGamepad, faLeaf, faLocation, faLocationDot, faLocationPin, faMarker, faPlus, faPlusCircle, faXmarkCircle, IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { AcceptingType, CategoryType, DJSettingsType, ShuffleType, TagType } from "./Dashboard";
import { Dropdown, DropdownItemProps, Spinner } from "react-bootstrap";
import TZButton from "../../components/TZButton";
import Lottie from "react-lottie";
import playingAnimation from '../../assets/stereo.json';
import useWindowDimensions from "../../lib/useWindowDimensions";
import NestedList from "../../components/NestedList";
import { Dropdown as NestedDropdown, DropdownProps } from 'react-nested-dropdown';
// import 'react-nested-dropdown/dist/styles.css';

const SettingsNameMapping = ["Opening", "Peak", "Closing"];
// type TagValue = { label: string, category: string }

type TagItemType = {
    label: string,
    items: { label: string, value: CategoryType, onSelect: () => any }[]
}

const TagItemsGenerator = (onSelect: (s: TagType) => any): TagItemType[] => {
    const label = (label: string, category: CategoryType) => {
        return { label: label, value: category, onSelect: () => onSelect({ label, category }) }
    }
    return [
        {
            label: "Era",
            items: [
                label("Latest", "era"),
                label("2020s", "era"),
                label("2010s", "era"),
                label("2000s", "era"),
                label("90s", "era"),
                label("80s", "era"),
                label("70s", "era"),
                label("60s", "era"),
            ]
        },
        {
            label: "Instrumental",
            items: [
                label("Instrumental songs only", "instrumental"),
                label("No instrumental songs", "instrumental"),
            ]
        }
    ]
}

type DJSettingsProps = {
    genres: string[],
    // selectedState: [Set<string>, (s: Set<string>) => any],
    energyState: [number, (n: number) => any],
    bangersState: [number, (n: number) => any],
    tagsState: [TagType[], (s: TagType[]) => any]
    sendDJSettings: () => any,
    djSettingsState: [DJSettingsType[], (a: DJSettingsType[]) => any],
    djCurrentSettingNumberState: [number, (n: number) => any],
    djSettingPlayingNumberState: [number | undefined, (n: number | undefined) => any],
    onSetAccept: (s: AcceptingType) => any,
    acceptRadioValueState: [AcceptingType, (s: AcceptingType) => any],
    onSetShuffle: (s: ShuffleType) => any,
    shuffleRadioValueState: [ShuffleType, (s: ShuffleType) => any],
    PlaylistScreen: ReactNode,
    ExplicitButton: ReactNode,
}

function GenreButton(props: { genre: string, selected: Set<string>, onClick: () => any }) {
    const selected = props.selected.has(props.genre);
    // const [selected, setSelected] = useState(startSelected);

    // const onClick = () => {
    //     const s = selected;
    //     setSelected(!selected);
    //     props.onClick(!s);
    // }

    return (
        <div style={{ padding: padding, backgroundColor: selected ? Colors.tertiaryDark : "#fff2", borderRadius: radius, cursor: 'pointer' }} onClick={() => props.onClick()}>
            <span className="onelinetext-montserrat" style={{ fontWeight: 'bold', fontSize: "calc(10px + 0.5vmin)" }}>{props.genre}</span>
        </div>
    )
}

export default function DJSettings(props: DJSettingsProps) {
    const genres = props.genres;
    // const [selectedGenres, setSelectedGenres] = props.selectedState;
    const [energy, setEnergy] = props.energyState;//useState(50)//props.energyState;
    const [bangersOnly, setBangersOnly] = props.bangersState;//useState(75)//props.bangersState;
    const [acceptRadioValue,] = props.acceptRadioValueState;
    const [shuffleRadioValue,] = props.shuffleRadioValueState;
    const [tags, setTags] = props.tagsState;
    const [djSettings, setDJSettings] = props.djSettingsState
    const [currentSettingNumber, setCurrentSettingNumber] = props.djCurrentSettingNumberState;
    const [playingSettingNumber, setPlayingSettingNumber] = props.djSettingPlayingNumberState;
    const [loading, setLoading] = useState(false);
    const [edited, setEdited] = useState(false);
    const onSetAccept = props.onSetAccept;
    const onSetShuffle = props.onSetShuffle;
    const sendDJSettings = props.sendDJSettings;

    const currentSetting = djSettings[currentSettingNumber];
    const currentGenres = new Set(currentSetting.genres);

    const onUpdateSession = async () => {
        if (!loading) {
            setLoading(true);
            try {
                await sendDJSettings();
                setPlayingSettingNumber(currentSettingNumber);
                setLoading(false);
                setEdited(false);
            } catch (e) {
                console.error("Error sending DJ settings " + e);
                setLoading(false);
                alert("There was an error changing your settings. Try again later.")
            }

        }
    }

    const editStuff = (settings: DJSettingsType) => {
        onSaveChanges(settings);
        if (!edited) setEdited(true);
    }

    const onSaveChanges = (settings: DJSettingsType) => {
        const djs = [...djSettings];
        djs[currentSettingNumber] = {
            genres: [...settings.genres],
            energy: settings.energy,
            popularity: settings.popularity,
        }
        setDJSettings(djs);
        // setEdited(false);
    }

    const onGenreClicked = (g: string) => {
        const sg = currentGenres;
        const add = !sg.has(g);
        console.log("sg", sg, add)
        if (add) sg.add(g);
        else sg.delete(g);
        // setSelectedGenres(sg);
        editStuff({ ...currentSetting, genres: [...sg] });
    }

    const onBangersClicked = async () => {
        editStuff({ ...currentSetting, popularity: bangersOnly });
    }

    const onEnergyClick = async () => {
        //sendDJSettings();
        editStuff({ ...currentSetting, energy: energy });
    }

    const onEnergyChange = (n: number) => {
        setEnergy(n);
    }

    const onBangersChange = (n: number) => {
        setBangersOnly(n);
    }

    const onSelectTag = (selected: TagType) => {
        setTags([...tags, selected]);
        if (!edited) setEdited(true);
    }

    const onXClick = (s: TagType) => {
        const i = tags.indexOf(s);
        if (i === -1) return;

        const nt = [...tags.slice(0, i), ...tags.slice(i + 1)];
        setTags(nt);
        if (!edited) setEdited(true);
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
                <div className="App-montserrat-normaltext"
                    // onClick={() => setExpanded(!expanded)} 
                    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
                    style={{
                        textAlign: 'left', width: "100%", fontWeight: 'bold', display: 'flex', padding: padding,
                        alignItems: 'center', cursor: 'pointer', opacity: hovered ? 0.7 : 1, borderColor: Colors.tertiaryDark,
                        color: "white", borderStyle: "solid", borderWidth: 1, borderRadius: radius
                    }}>
                    {/* <FontAwesomeIcon color={Colors.tertiaryDark} icon={faBars} /> */}

                    {
                        <span>{text}</span>
                    }
                    {/* {expanded ? <></> : <span style={{ paddingLeft: padding, color: Colors.tertiaryLight }}>Configure</span>} */}
                </div>
            </div>
        )
    }

    const DIR = DropdownItem<AcceptingType>;
    const DIS = DropdownItem<ShuffleType>;

    const GenreList = (props: { onGenreClicked: (g: string) => any }) => {
        const genresSqrt = Math.ceil(Math.sqrt(genres.length));
        const onGenreClicked = props.onGenreClicked;

        return (
            <div >
                <div style={{ paddingBottom: padding }}>
                    <span className="App-montserrat-smallertext" style={{ fontWeight: 'bold' }}>Genres to Play</span>
                </div>
                <div className="App-grid-container" style={{ gridTemplateColumns: `repeat(${genresSqrt}, 1fr)`, gridGap: padding / 2, minWidth: 350 }}>
                    {genres.map(g => <GenreButton genre={g} selected={currentGenres} onClick={() => onGenreClicked(g)} />)}
                </div>
            </div>
        )
    }

    const playing = currentSettingNumber === playingSettingNumber;
    const Dividers = () =>
        <div style={{ paddingLeft: 10, paddingRight: 10, width: "100%" }}>
            <div style={{ width: "100%", height: 7, borderLeftStyle: 'solid', borderRightStyle: 'solid', borderWidth: 2, borderColor: "#fff8" }} />
        </div>


    const tagItems = TagItemsGenerator(onSelectTag);

    return (
        <div style={{ width: "100%" }}>
            {/* <Header /> */}
            <div style={{ display: 'flex', flexDirection: 'column', paddingTop: padding, position: 'relative' }}>
                <DJSettingsTabs djSettings={djSettings} currentSettingNumber={currentSettingNumber} setCurrentSettingNumber={setCurrentSettingNumber} playingSettingNumber={playingSettingNumber} />
                <div style={{ display: 'flex', justifyContent: 'space-between', }}>
                    {loading ?
                        <div style={{ width: "100%", height: "100%", position: "absolute", top: 0, zIndex: 100, backgroundColor: "#0008", display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <Spinner />
                        </div> : <></>
                    }
                    <div style={{ padding: padding, display: 'flex', flex: 1 }}>
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
                            <div style={{ display: 'flex', width: "100", flexGrow: 1 }}>
                                <div style={{ paddingLeft: padding }} />
                                <div style={{ padding: padding, borderStyle: 'solid', borderColor: Colors.tertiaryDark, borderRadius: radius, borderWidth: 1 }}>
                                    <GenreList {...props} onGenreClicked={onGenreClicked} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'row', paddingLeft: padding, flexGrow: 1 }}>
                                    <div style={{ paddingBottom: padding, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: radius, backgroundColor: Colors.tertiaryDark, padding: padding }}>
                                        <div style={{ width: "100%", flex: 1, display: "flex", justifyContent: 'space-around' }}>
                                            <input type="range" className="slider-fader"
                                                min={0} max={100}
                                                value={energy}
                                                onChange={(e) => onEnergyChange(parseInt(e.target.value))}
                                                onClick={onEnergyClick}
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
                                <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: padding, }}>
                                    {/* <span className="App-montserrat-smallertext" style={{ fontWeight: 'bold' }}>Bangers only</span> */}
                                    {/* <TZToggle title="Bangers Only" value={currentSetting.bangersOnly} onClick={onBangersClicked} /> */}
                                    <div style={{ padding: padding, borderRadius: radius, backgroundColor: Colors.tertiaryDark, display: "flex", flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                                        <span className="App-montserrat-smallertext" style={{ paddingBottom: padding / 2, fontWeight: "bold" }}>Popularity</span>
                                        <Dividers />
                                        <input style={{ zIndex: 2, width: "100%", minWidth: 150 }} type="range" className="slider-bangers"
                                            min={0} max={100}
                                            value={bangersOnly}
                                            onChange={(e) => onBangersChange(parseInt(e.target.value))}
                                            onClick={onBangersClicked}
                                        />
                                        <Dividers />
                                        <div style={{ display: "flex", justifyContent: 'space-between', fontSize: 12, fontWeight: 'bold', width: "100%", minWidth: 170, paddingTop: padding / 2 }}>
                                            <div style={{ flexShrink: 1, textAlign: "left" }}>
                                                Mix it up
                                            </div>
                                            <div style={{ flexShrink: 1, textAlign: "right" }}>
                                                Only bangers
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ paddingTop: padding }} />
                                </div>
                                <div style={{ width: "100%", display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingLeft: padding }}>
                                    <div style={{ paddingTop: padding }} />
                                    {/* {props.ExplicitButton}
                                            <div style={{ paddingTop: padding }} /> */}

                                    <div style={{ display: "flex" }}>


                                        {/* <div style={{ padding: 4, backgroundColor: Colors.tertiaryDark, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}> */}
                                        {/* </div> */}
                                    </div>
                                    <div>
                                        {!playing || (edited && playing) ? <TZButton title={playingSettingNumber !== undefined ? "Update session" : "Start session"} brandingFont onClick={onUpdateSession} /> : <></>}
                                    </div>
                                </div>
                            </div> :
                            <div style={{ paddingLeft: padding, }}>
                                {props.PlaylistScreen}
                            </div>
                        }
                    </div>
                </div>
                <div style={{ width: "100%", paddingLeft: padding, paddingRight: padding }}>
                    <TagsMemo tags={tags} onXClick={onXClick} tagItems={tagItems} />
                </div>
                {/* <div style={{ flex: 1, paddingLeft: padding }}>
                            <span>Virtual DJ is an unfinished feature. For now, enjoy this preview of its interface!</span>
                        </div> */}
            </div>

        </div>
    );
}

const TagsMemo = memo(Tags);

function Tags(props: { tags: TagType[], onXClick: ((s: TagType) => any) | undefined, tagItems: TagItemType[] }) {
    const tags = props.tags;
    const onXClick = props.onXClick;
    const tagItems = props.tagItems;

    return (
        <div style={{ display: 'inline-block', verticalAlign: 'top', flex: 1, width: "100%" }}>
            {/* {props.allArtists.slice(0, 6).map((data) => {
                                                    return (
                                                        <div style={{ display: 'inline-flex', width: "auto", paddingBottom: padding / 2 }}>
                                                            <span onClick={() => setQuery(data)} style={{ backgroundColor: "#fff", padding: 7, borderRadius: 20, color: "black", fontWeight: 'bold' }}>{data}</span>
                                                            <div style={{ width: padding }}></div>
                                                        </div>
                                                    );
                                                })} */}
            <TagComponent icon={faLocationDot} tag={{ label: "San Francisco, CA", category: "location" }} removeX />
            {
                tags.map((v, i) =>
                    <TagComponent tag={v} onXClick={onXClick} />
                )
            }

            <div style={{ display: 'inline-flex', width: "auto", backgroundColor: "#0000", justifyContent: 'center', alignItems: 'center', verticalAlign: 'top', zIndex: 1000000 }}>
                <NestedDropdown
                    renderOption={(option) =>
                        <div onClick={() => {
                            if (option.onSelect) option.onSelect();
                        }} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                {option.label}
                            </div>
                            {option.items && option.items.length > 0 ?
                                <FontAwesomeIcon icon={faChevronRight} /> : <></>}
                        </div>
                    }
                    onSelect={(value, option) => {
                        console.log("selected", value, option)
                    }}
                    items={tagItems}>
                    {({ isOpen, onClick }) => (
                        <TagPlusComponent onClick={onClick} isOpen={isOpen} />
                    )}
                </NestedDropdown>
            </div>
        </div>
    )
}

const TagComponent = (props: { icon?: IconDefinition, tag: TagType, removeX?: boolean, onXClick?: (s: TagType) => any }) => {
    const paddingTag = 4;
    const [hover, setHover] = useState(0);

    return (
        <div style={{ display: 'inline-flex', width: "auto", paddingBottom: paddingTag, backgroundColor: "#0000", justifyContent: 'center', alignItems: 'center', verticalAlign: 'top' }}>
            <div style={{ padding: paddingTag, backgroundColor: Colors.secondaryDark, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                {props.icon ? <div style={{ paddingRight: 8, backgroundColor: "#0000" }}><FontAwesomeIcon icon={props.icon} /></div> : <div></div>}
                <div className="App-montserrat-smallertext" style={{ fontWeight: 'bold', fontSize: 12 }}>{props.tag.label}</div>
                {props.removeX ? <></> : <div
                    onMouseEnter={() => setHover(1)} onMouseLeave={() => setHover(0)} onClick={() => { if (props.onXClick) props.onXClick(props.tag) }}
                    style={{ paddingLeft: 8, backgroundColor: "#0000", cursor: 'pointer', opacity: 1 - hover * 0.5 }}><FontAwesomeIcon icon={faXmarkCircle} color={"#fff8"} />
                </div>}
            </div>
            <div style={{ width: 5 }}></div>
        </div>)
}

const TagPlusComponent = (props: { onClick: () => any, isOpen: boolean }) => {
    const paddingTag = 4;
    const [hover, setHover] = useState(0);

    return (
        <div onMouseEnter={() => setHover(1)} onMouseLeave={() => setHover(0)}
            style={{ cursor: 'pointer', display: 'inline-flex', width: "auto", paddingBottom: paddingTag, opacity: props.isOpen ? 0.5 : 1 - hover * 0.5 }} onClick={props.onClick}>
            <div style={{ padding: paddingTag, backgroundColor: "#0000", borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div><FontAwesomeIcon icon={faPlusCircle} color={"#fff"} /></div>
            </div>
        </div>)
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

const DJSettingsTabs = memo((props: { djSettings: DJSettingsType[], currentSettingNumber: number, setCurrentSettingNumber: (n: number) => any, playingSettingNumber: number | undefined }) => {
    return (
        <div style={{ width: "100%", display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {props.djSettings.map((v, i) => <DJSetting name={SettingsNameMapping[i]} selected={props.currentSettingNumber === i} playing={props.playingSettingNumber === i} onClick={() => props.setCurrentSettingNumber(i)} />)}
        </div>
    )
})

const DJSetting = memo((props: { name: string, selected: boolean, playing: boolean, onClick: () => any }) => {
    const selected = props.selected;
    const playing = props.playing;
    const fdim = useFdim();
    const dim = 20 + fdim / 200;

    return (
        <div style={{ paddingLeft: padding / 2, paddingRight: padding / 2 }}>
            <div style={{
                padding: 10, backgroundColor: selected ? Colors.secondaryDark : "#FFF2", borderRadius: radius * 2, cursor: "pointer",
                outlineColor: "white", outlineWidth: selected ? 1 : 0, outlineStyle: "solid",
                display: 'flex', justifyContent: 'center', alignItems: 'center'
            }} onClick={props.onClick}>
                <span className="App-montserrat-smallertext" style={{ fontWeight: "bold", }}>{props.name}</span>
                {
                    playing ?
                        <div style={{ paddingLeft: 5 }}>
                            <Lottie
                                style={{}}
                                options={
                                    {
                                        loop: true,
                                        autoplay: true,
                                        animationData: playingAnimation,
                                        rendererSettings: {

                                            preserveAspectRatio: "xMidYMid slice"
                                        }
                                    }
                                }
                                width={dim}
                            />
                        </div> : <></>
                }

            </div>
        </div>
    )
})