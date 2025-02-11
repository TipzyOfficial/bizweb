import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { router } from "../../App";
import { Colors, modalZ, padding, radius, useFdim } from "../../lib/Constants";
import { faMagnifyingGlass, faMusic } from "@fortawesome/free-solid-svg-icons";
import useWindowDimensions from "../../lib/useWindowDimensions";
import { memo, useContext, useState } from "react";
import { SongType } from "../../lib/song";
import { artistsStringListToString, SongList } from "../../components/Song";
import { isMobile, onlyAlphanumeric } from "../../lib/utils";
import { DisplayOrLoading } from "../../components/DisplayOrLoading";
import { Modal, Spinner } from "react-bootstrap";
import { fetchNoToken } from "../../lib/serverinfo";
import { UserSessionContext } from "../../lib/UserSessionContext";
import { SmallLogo } from "../../components/BigLogo";
import TZButton from "../../components/TZButton";
import { fetchWithToken } from "../..";

const SearchModal = (props: { completed?: boolean, loading: boolean, visible: boolean, setVisible: (b: boolean) => any, song?: SongType, title: string, onConfirm: () => void, onExited?: () => any }) => {
    const dims = useFdim() / 5;

    const Img = () => props.song?.albumart === "" || !props.song?.albumart ? <div style={{ overflow: "hidden", height: dims, width: dims, backgroundColor: "#888", display: 'flex', justifyContent: 'center', alignItems: 'center' }}><FontAwesomeIcon color={"#fff8"} fontSize={dims / 3} icon={faMusic}></FontAwesomeIcon></div>
        : <img src={props.song.albumart} alt={props.song.title} style={{ height: dims, width: dims, overflow: "hidden" }} />

    return (
        <Modal style={{ zIndex: modalZ }} show={props.visible} onHide={() => props.setVisible(false)} onExited={props.onExited} data-bs-theme={"dark"}>
            <Modal.Body style={{ color: "white", display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <span className="App-montserrat-normaltext" style={{ fontWeight: 'bold', paddingBottom: padding }}>{props.title}</span>
                <Img />
                <span className="App-montserrat-normaltext" style={{ fontWeight: 'bold', paddingTop: padding }}>{props.song?.title ?? "No song"}</span>
                <span className="App-smalltext">{(props.song?.explicit ? "🅴 " : "") + artistsStringListToString(props.song?.artists ?? ["No artist"])}</span>
                <div style={{ paddingTop: padding }}>
                    <TZButton completed={props.completed} loading={props.loading} title="Confirm" backgroundColor={props.completed ? Colors.green : Colors.tertiaryDark} onClick={props.onConfirm}></TZButton>
                </div>
            </Modal.Body>
        </Modal>
    )
}

export function Search(props: { onClose: () => any }) {
    const usc = useContext(UserSessionContext);
    const [song, setSong] = useState<SongType | undefined>(undefined);
    const [requesting, setRequesting] = useState(false);
    const [successMsg, setSuccessMsg] = useState(false);

    const internalRequest = async (song: SongType) => {
        if (requesting) return;
        setRequesting(true);

        const json = await fetchWithToken(usc, `business/request/`, 'POST', JSON.stringify({
            track_id: song?.id ?? "",
            track_name: song?.title ?? "No title",
            artist: song ? artistsStringListToString(song.artists) : "No artist",
            image_url: song?.albumart ?? "",
            price: 0,
            token_count: 0,
            explicit: song.explicit,
            duration_ms: song.duration,
        })).then(r => r.json()).catch(() => { return { status: 501 } });

        if (json.status === 200) {
            setSuccessMsg(true);
            setTimeout(() => {
                setSong(undefined);
                // router.navigate("/dashboard");
            }, 750)
            // alert(`Successfully queued up ${song.title} by ${artistsStringListToString(song.artists)}!`);
        } else {
            throw new Error(`Problem queueing that song: ${JSON.stringify(json)}`);
        }
        setRequesting(true);
    }

    return (
        <>
            <SearchComponent onClose={props.onClose} onClick={(song) => {
                setSong(song);
            }} />
            <SearchModal completed={successMsg ? successMsg : undefined} loading={requesting}
                onConfirm={async () => {
                    if (song) {
                        await internalRequest(song).catch((e: Error) => { setRequesting(false); alert(e.message); });
                    }
                }}
                onExited={() => {
                    setRequesting(false);
                    setSuccessMsg(false);
                }}
                song={song} title="Queue song" visible={song !== undefined} setVisible={(b) => { if (!b) setSong(undefined) }} />
        </>
    )
}

export function SearchComponent(props: { onClick: (song: SongType) => any, onClose: () => any }) {
    const usc = useContext(UserSessionContext);
    const fdim = useFdim();
    const [query, setQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SongType[] | undefined>();
    const [suggestion, setSuggestion] = useState<string | undefined>();
    const [searching, setSearching] = useState(false);
    const [isAiSuggestion, setIsAiSuggestion] = useState(false);
    const songDims = fdim ? Math.max(Math.min(fdim / 15, 50), 30) : 30;
    const window = useWindowDimensions();
    const width = "100%";
    const onClose = props.onClose

    /**
     * searches for songs related to a certain query.
     * @param query the query of a search. could be anything
     * @param limit the max amount of results to return
     * @returns the array of songs matching the query. since it's an async function, it returns a promise.
     */
    async function searchForSongs(query: string, limit: number): Promise<SongType[] | undefined> {
        //this function calls the backend to get the search results for a query.   
        setSearching(true);

        if (!query || query.trim().length === 0) {
            setSearching(false);
            setSuggestion(undefined);
            setIsAiSuggestion(false);
            return undefined;
        }

        const b64query = btoa(query);
        const json = await fetchNoToken(`tipper/business/search/?limit=${limit}&string=${b64query}&business_id=${usc.user.business_id}`, 'GET').then(r => r.json());

        const results: QueryResultScoreType[] = [];
        //reversing the array since it seems like the explicit songs always appear last in soundtrack?
        const data: any[] = json.data//.reverse();
        const originals: Map<string, number> = new Map();

        console.log(data);

        for (const item of data) {
            const song: SongType =
            {
                title: item.name.trim() ?? "Default",
                artists: item.artist ?? ["Default"],
                albumart: item.images.thumbnail ?? "",
                albumartbig: item.images.teaser,
                id: item.id ?? -1,
                explicit: item.explicit,
                duration: item.duration_ms,
            };

            const songShortened = JSON.stringify({ title: song.title, artists: song.artists, explicit: song.explicit });

            const originalIndex = originals.get(songShortened);

            if (originalIndex === undefined) {
                originals.set(songShortened, results.length);
                const score = resultScore({ song: song, recognizability: item.recognizability }, query, new Set())
                results.push({ song: song, recognizability: item.recognizability, score: score })
            }
        }

        results.sort((a, b) => {
            return b.score - a.score;
        });

        const songs = results.map(v => v.song);

        setSearching(false);

        return songs;
    }

    async function getSearchResults(query: string, limit: number) {
        const q = query.replace(/["'`]+/gi, "").replace("; ", " ").replace("feat. ", " ")

        //.replace(" - ", "")//.replace(" & ", "");

        const response = await searchForSongs(q, limit).catch((e) => {
            if (e.message === "no bar") return [];
            console.log("can't get response,", e);
            return [];
        });
        setSearchResults(response);
    }

    async function getSuggestion(query: string) {
        if (query.length === 0) { setSuggestion(undefined); return; }
        const b64query = btoa(query);
        const json = await fetchNoToken(`search/autocomplete/?string=${b64query}`).then(r => r.json()).catch((e) => { throw new Error(e) });
        console.log("suggestion json", suggestion)
        if (json.status === 200)
            setSuggestion(json.data);
        else throw new Error("Bad status: ", json);
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: "80vh", backgroundColor: Colors.background }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: "100%", padding: padding, backgroundColor: "#0001", }}>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        getSearchResults(query, 50);
                        setSuggestion(undefined);
                        getSuggestion(query);
                        setIsAiSuggestion(false);
                    }}>
                    <div style={{
                        minWidth: window.width / 3,
                    }}>
                        <SearchBar value={query} setValue={setQuery} />
                    </div>
                </form>
                <div style={{ display: "flex", height: "100%" }}>
                    <div onClick={onClose} style={{ paddingLeft: padding, paddingRight: padding, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <span className="App-montserrat-smallertext" style={{ fontWeight: 'bold' }}>Close</span>
                    </div>
                </div>
            </div>
            {suggestion && !isAiSuggestion ?
                <div style={{ padding: padding }}>
                    <div style={{ padding: padding, borderStyle: 'solid', borderRadius: radius, borderWidth: 1, borderColor: Colors.primaryRegular, cursor: 'pointer', width: width }}
                        onClick={() => {
                            setQuery(suggestion);
                            getSearchResults(suggestion, 50);
                            console.log("setting to true");
                            setIsAiSuggestion(true);
                        }}>
                        <span>
                            Can't find your result? Try <span style={{ fontWeight: "bold", color: Colors.primaryRegular }}>{suggestion}</span>
                        </span>
                    </div>
                </div> : <></>
            }
            <div className="remove-scrollbar" style={{
                display: 'flex', flex: 1, flexDirection: 'column', paddingRight: padding, paddingLeft: padding,
                width: "100%", overflow: 'scroll', maxHeight: "80vh"
            }}>
                <DisplayOrLoading condition={!searching} loadingScreen={
                    <div style={{ display: 'flex', flexDirection: "column", justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                        <Spinner style={{ color: Colors.primaryRegular, width: 50, height: 50 }} />
                        <div style={{ padding: padding }} className="App-smalltext">Loading results...</div>
                    </div>
                }>
                    {searchResults ?
                        <SongResultListMemo songs={searchResults} dims={songDims} logoutData={{ query: query }} onClick={props.onClick} />
                        :
                        <div style={{ display: 'flex', width: "100%", justifyContent: 'center', paddingTop: padding * 2 }}>
                            <span>Search results will show here...</span>
                        </div>
                    }
                </DisplayOrLoading>
            </div>
        </div>

    )
}

function SearchBar(props: { value: string, setValue: (s: string) => void }) {
    const [focused, setFocused] = useState(false);
    return (
        <div style={{ paddingLeft: padding, backgroundColor: "#FFF1", borderRadius: radius * 2, display: 'flex', justifyContent: 'flex-start', alignItems: 'center', outlineStyle: "solid", outlineWidth: focused ? 1 : 0, outlineColor: 'white', width: "100%" }}>
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <input value={props.value} onChange={(e) => props.setValue(e.target.value)}
                autoFocus
                style={{
                    color: "#fff",
                    backgroundColor: "#0000",
                    outlineStyle: 'none',
                    borderStyle: 'none',
                    padding: padding,
                    width: "100%",
                    height: "100%",
                    textAlignLast: 'left',
                    borderTopRightRadius: radius * 2,
                    borderBottomRightRadius: radius * 2
                }}
                onFocus={() => {
                    setFocused(true);
                }}
                onBlur={() => {
                    setFocused(false);
                }}
                placeholder={isMobile() ? "Queue a song..." : "Add a song to queue..."}
            >
            </input>
        </div>
    )
}

type QueryResultType = {
    recognizability: number,
    song: SongType
}

type QueryResultScoreType = {
    recognizability: number,
    song: SongType,
    score: number,
}

const SongResultListMemo = memo(SongList, (a, b) => JSON.stringify(a.songs) === JSON.stringify(b.songs));

const badWords = new Set([
    "(live",
    "(live)",
    "instrumental",
    "(instrumental",
    "(instrumental)",
    "instrumental)",
    "(cover",
    "(cover)",
    "cover)",
    "(lofi",
    "(lofi)",
    "lofi)",
    "parody",
    "(parody",
    "(parody)",
    "parody)",
    "(by",
    "(acoustic",
    "(acoustic)",
    "(originally"
])

const badArtists = new Set([
    "party song instrumentals",
    "kidz bop kids",
    "kids bop",
    "mini pop kids",
    "rockabye baby!",
    "lofi fruits music",
])

const compareWords = (a: string, b: string) => {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return onlyAlphanumeric(a) === onlyAlphanumeric(b);
}

const resultScore = (r: QueryResultType, q: string, topArtists: Set<string>) => {
    const artistFactor = 10;
    const titleFactor = 12;
    const topArtistFactor = 10;

    let score = r.recognizability / 20;

    // don't care about approved since we are the business.
    // if (r.song.approved === false) score -= 1000;

    const title = r.song.title.toLowerCase();
    const titleWords = title.split(" ").filter(v => v.length > 0 || v === "-");;

    const query = q.toLowerCase();
    const queryWords = query.split(" ").filter(v => v.length > 0 || v === "-");;

    const artists = new Set(r.song.artists.map(v => v.toLowerCase()));

    for (const artist of artists) {
        if (badArtists.has(artist)) return 0;
        if (topArtists.has(artist)) score += topArtistFactor;
        const artistWords = artist.trim().split(" ").filter(v =>
            v.length > 0
        );
        // console.log(artistWords);

        if (!artistWords[0]) break; //no artist (for some reason?)

        const artistPos = queryWords.indexOf(artistWords[0]); //search query string for that specific artist
        if (artistPos !== -1) {
            let count = 0;
            for (let i = artistPos; i < queryWords.length; i++) { //traverse string to find rest of artist name 
                if (compareWords(artistWords[count], queryWords[i])) {
                    const increase = artistFactor / ((count) * 4 + 1);
                    score += increase;
                    count++;
                } else {
                    break;
                }
            }
            queryWords.splice(artistPos, count);
        }
    }

    console.log(queryWords);

    let beginningIndex = -1;

    for (let i = 0; i < titleWords.length; i++) {
        //second part gives exceptions to if the bad keyword is EXPLICITLY in the string
        if (badWords.has(titleWords[i]) && !query.includes(titleWords[i])) return 0;

        if (beginningIndex === -1) {
            if (compareWords(titleWords[0], queryWords[i])) {
                beginningIndex = i;
                score += titleFactor;
            }
        } else {
            if (compareWords(titleWords[i - beginningIndex], queryWords[i])) {
                score += titleFactor + (i - beginningIndex);
            }
        }
    }

    return score;
}

//https://en.wikipedia.org/wiki/List_of_most-streamed_artists_on_Spotify
const WHITELISTED_ARTISTS = new Set([
    "billie eilish",
    "the weeknd",
    "bruno mars",
    "taylor swift",
    "coldplay",
    "rihanna",
    "post malone",
    "lady gaga",
    "sabrina carpenter",
    "david guetta",
    "ariana grande",
    "drake",
    "eminem",
    "justin bieber",
    "calvin harris",
    "dua lipa",
    "kendrick lamar",
    "travis scott",
    "kanye west",
    "ed sheeran",
    "sza",
    "bad bunny",
    "shakira",
    "maroon 5",
    "karol g",
    "lana del rey",
    "marshmello",
    "adele",
    "imagine dragons",
    "katy perry",
    "onerepublic",
    "j balvin",
    "future",
    "beyoncé",
    "miley cyrus",
    "sia",
    "khalid",
    "metro boomin",
    "daddy yankee",
    "hozier",
    "benson boone",
    "sam smith",
    "21 savage",
    "queen",
    "arctic monkeys",
    "doja cat",
    "harry styles",
    "elton john",
    "peso pluma",
    "rauw alejandro",
    "bts",
    "xxxtentacion",
    "olivia rodrigo",
    "nicki minaj",
    "harry styles",
    "cardi b",
])
