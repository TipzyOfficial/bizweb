import { Alert, Button, Col, Container, Modal, Row } from "react-bootstrap";
import { Colors, padding, radius, useFdim } from "../lib/Constants";
import { PlayableType, SongType } from "../lib/song";
import './Song.css'
import { router } from "../App";
import Song, { artistsStringListToString } from "./Song";
import PaymentSetup from "./PaymentSetup";
import { useContext, useEffect, useState } from "react";
import TZButton from "./TZButton";
import { fetchWithToken } from "..";
import { UserSessionContext } from "../lib/UserSessionContext";
import { numberToPrice, useInterval } from "../lib/utils";
import { fetchNoToken } from "../lib/serverinfo";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMusic } from "@fortawesome/free-solid-svg-icons";
import '../App.css'

export function RequestPlayableModal(props: { playable: PlayableType | undefined, show: boolean, handleClose: () => void, data?: any, refreshRequests?: () => Promise<void> }) {
    // const song: SongType = props.playable?.song ?? { id: "-1", title: "No Title", artists: ["No artists"], albumart: "", explicit: false };
    const userContext = useContext(UserSessionContext);

    const minPrice = props.playable?.minPrice;
    const amountBid = props.playable?.amountBid;

    const p = minPrice !== undefined && amountBid !== undefined && minPrice - amountBid > 100 ? minPrice - amountBid : 100;

    const getPrice = async () => { };

    const sendRequest = async (price: number): Promise<number> => {
        if (!props.playable) return 0;

        return await fetchWithToken(userContext, `tipper/liveartist/request/?set_item_id=${props.playable.id}`, "POST", JSON.stringify({
            price: price
        }), props.data).then(response => response.json()).then(json => {
            console.log("json: ", json)
            if (json.status === 200) return 1;
            else if (json.status === 433) return 2;
            else if (json.status === 444) return 3;
            else if (json.status === 469) return 4;
            else {
                console.log("Business ID", userContext.artistState.artist?.id)
                throw new Error("Error: ", json);
            }
            // console.log("re", response) 
        }).catch((e: Error) => {
            console.log("error: ", e)
            return 0;
        });
    }

    return <BasicRequestModal song={props.playable?.song} show={props.show} handleClose={props.handleClose} data={{ selectedPlayable: props.playable }} price={p} getPrice={getPrice} sendRequest={sendRequest} refreshRequests={props.refreshRequests} playable minPrice={minPrice} contributed={props.playable?.amountBid} />
}

export default function RequestSongModal(props: { song: SongType | undefined, show: boolean, handleClose: () => void, data?: any, refreshRequests?: () => Promise<void> }) {
    const song: SongType = props.song ?? { id: "-1", title: "No Title", artists: ["No artists"], albumart: "", explicit: false };
    const userContext = useContext(UserSessionContext);

    // const [price, setPrice] = useState<number | undefined>(undefined);

    // const getPrice = async () => {
    //     setPrice(undefined);

    //     const response = await fetchNoToken(`calc_dynamic_price/`, 'POST', JSON.stringify({
    //         business_id: userContext.barState.bar?.id
    //     })).catch(e => { throw e });

    //     const json = await response.json();

    //     setPrice(json.Dynamic_price);
    // }


    const sendRequest = async (price: number): Promise<number> => {
        if (!userContext.barState.bar) return 0;

        return await fetchWithToken(userContext, `tipper/request/?business_id=${userContext.barState.bar.id}`, "POST", JSON.stringify({
            track_id: song?.id ?? "",
            track_name: song?.title ?? "No title",
            artist: song ? artistsStringListToString(song.artists) : "No artist",
            image_url: song?.albumart ?? "",
            price: price,
            token_count: 0,
            explicit: song.explicit,
        })).then(response => response.json()).then(json => {
            // console.log("json: ", json)
            if (json.status === 200) return 1;
            else if (json.status === 433) return 2;
            else if (json.status === 444) return 3;
            else if (json.status === 469) return 4;
            else throw new Error("Error: " + json.detail)
            // console.log("re", response) 
        }).catch((e: Error) => {
            console.log("error: ", e)
            return 0;
        });
    }
    return <BasicRequestModal song={song} show={props.show} handleClose={props.handleClose} data={props.data} sendRequest={sendRequest} price={undefined} getPrice={async () => { }} refreshRequests={props.refreshRequests} />
}

function BasicRequestModal(props: { song: SongType | undefined, show: boolean, handleClose: () => void, data?: any, sendRequest: (price: number) => Promise<number>, price: number | undefined, getPrice: () => Promise<void>, refreshRequests?: () => Promise<void>, playable?: boolean, minPrice?: number, contributed?: number }) {

    const fdim = useFdim();
    const dims = fdim / 2; //props.playable ? fdim / 2 : fdim / 2;
    const song: SongType = props.song ?? { id: "-1", title: "No Title", artists: ["No artists"], albumart: "", explicit: false }
    const [paymentScreenVisible, setPaymentScreenVisible] = useState(false);
    const [success, setSuccess] = useState<undefined | boolean>(undefined);
    const userContext = useContext(UserSessionContext);
    const [masterPrice, setMasterPrice] = useState(props.price);
    const [disabled, setDisabled] = useState(false);

    // console.log(masterPrice);

    const data = props.playable ? props.data : { selectedSong: song, ...props.data }

    const sendRequestClose = async (price: number | undefined) => {
        if (!price) return;
        const r = await props.sendRequest(price);
        if (r === 1) {
            setSuccess(true);
            if (props.refreshRequests)
                await props.refreshRequests();
        }
        else {
            setSuccess(false);
            switch (r) {
                case 2:
                    alert("This establishment isn't taking requests at the moment. Please come back later.");
                    break;
                case 3:
                    alert("This track has been accepted to be played recently. Please select another song or try requesting it later.");
                    break;
                case 4:
                    alert("This establishment doesn't allow explicit songs to be requested at this time.");
                    break;
                default:
                    alert("There was a problem sending that request–you won't be charged.");
                    break;

            }
        }

        // alert("Your request was sent! Thank you for using Tipzy :)");
        // useInterval(() => props.handleClose(), 500);
        setTimeout(() => props.handleClose(), 500);
    }

    function PaymentScreen() {
        return (
            <>
                <Modal.Header closeButton>
                    <Modal.Title style={{ color: 'white' }}>Set up payment</Modal.Title>
                </Modal.Header>
                <Modal.Body data-bs-theme="light">
                    <Container fluid>
                        <Row className="justify-content-md-center">
                            <Col>
                                <Modal.Body style={{ textAlign: "center", padding: 0, color: 'white' }}>Please set up your payment info–we'll keep it on file for later. {"\n"}<span style={{ fontWeight: "bold" }}>Your charge: ${masterPrice ? (masterPrice / 100).toFixed(2) : "undefined"}</span></Modal.Body>
                                {success === true ?
                                    <>
                                        <div style={{ paddingTop: padding }}></div>
                                        <TZButton
                                            fontSize={Math.min(30, dims / 7)}
                                            completed={success}
                                            title={masterPrice ? `$${(masterPrice / 100).toFixed(2)}` : ""}
                                            backgroundColor={success ? Colors.green : success === false ? Colors.red : undefined}
                                        />
                                    </>

                                    :
                                    <PaymentSetup handleSubmit={() => sendRequestClose(masterPrice)} />
                                }
                            </Col>
                        </Row>
                    </Container>
                </Modal.Body>
            </>
        )
    }

    function RequestScreen() {
        const [price, setPrice] = useState(masterPrice);

        useEffect(() => {
            console.log("modal rerendered. disabled: ", disabled);
        })

        const checkStripe = async (): Promise<boolean | null> => {
            return fetchWithToken(userContext, `get_saved_payment3`, 'GET', undefined, data)
                .then(r => r.json())
                .then(json => {
                    // console.log("json gsp", json)
                    if (!json.has_method) throw new Error("malformed json: no has_method.")
                    return (json.has_method === "True")
                }).catch((e: Error) => { console.log(e); return null });
        }

        async function onRequestClick(price: number | undefined) {

            console.log("setting disabled true");
            if (disabled) return;
            setDisabled(true);
            setMasterPrice(price);
            const hasStripe = await checkStripe();
            if (hasStripe === null) {
                console.log("Error getting Stripe. Are you sure you're logged in?")
            }
            else if (!hasStripe) setPaymentScreenVisible(true);
            else {
                sendRequestClose(price);
            }
        }


        const sum = (props.contributed ?? 0) + (price ?? 0);
        const max = Math.max((props.minPrice ?? 0) * 2, 1000);
        // const step = (props.contributed ?? 0 > 20) ? 1000 : 50

        return (<>
            {!props.playable ? <Modal.Header className="m-auto" style={{ width: "100%" }}>
                <Modal.Title style={{ color: 'white', width: "100%", textAlign: 'center' }} className="m-auto">Request a song</Modal.Title>
            </Modal.Header> : <></>}
            <Modal.Body>
                {props.playable ?
                    <Container fluid>
                        <Row className="justify-content-md-center">
                            <Col style={{ display: 'flex', justifyContent: 'flex-end', alignItems: "center" }}>
                                {song.albumart ? <img style={{ objectFit: 'contain' }} src={song.albumartbig ?? song.albumart} width={dims * 0.7} height={dims * 0.7} alt={song.title} /> : <div style={{ height: dims, width: dims, backgroundColor: "#888", display: 'flex', justifyContent: 'center', alignItems: 'center' }}><FontAwesomeIcon color={"#fff8"} fontSize={dims / 3} icon={faMusic}></FontAwesomeIcon></div>}
                            </Col>
                            <Col style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start', padding: 0 }}>
                                <Modal.Title style={{ textAlign: "left", paddingTop: padding, color: 'white' }}>
                                    <span className="onelinetext" style={{ textOverflow: 'ellipsis', WebkitLineClamp: 3, overflow: "hidden", fontSize: Math.max(dims / 10, 20), lineHeight: 1.2 }}>{song.title}</span></Modal.Title>
                                <div style={{ textAlign: "left", padding: 0, color: 'white', height: "auto", fontSize: Math.max(dims / 15, 15) }}>{artistsStringListToString(song.artists)}</div>
                            </Col>
                        </Row>
                    </Container>
                    :
                    <Container fluid>
                        <Row className="justify-content-md-center">
                            <Col style={{ display: 'flex', justifyContent: 'center' }}>
                                {song.albumart ? <img style={{ objectFit: 'contain' }} src={song.albumartbig ?? song.albumart} width={dims} height={dims} alt={song.title} /> : <div style={{ height: dims, width: dims, backgroundColor: "#888", display: 'flex', justifyContent: 'center', alignItems: 'center' }}><FontAwesomeIcon color={"#fff8"} fontSize={dims / 3} icon={faMusic}></FontAwesomeIcon></div>}
                            </Col>
                        </Row>
                        <Row className="justify-content-md-center">
                            <Col>
                                <Modal.Title style={{ textAlign: "center", paddingTop: padding, color: 'white' }}>{song.title}</Modal.Title>
                                <Modal.Body style={{ textAlign: "center", padding: 0, color: 'white' }}>{artistsStringListToString(song.artists)}</Modal.Body>
                            </Col>
                        </Row>
                    </Container>}
            </Modal.Body >
            <Modal.Footer>
                <Container fluid style={{ padding: 0 }}>
                    {props.playable ?
                        <Row className="justify-content-md-center">
                            {/* <Modal.Body style={{ textAlign: "center", paddingTop: 0, color: 'white' }}> */}

                            {/* </Modal.Body> */}
                        </Row> : <></>
                    }
                    <Row className="justify-content-md-center">
                        <Col style={{ display: 'flex', justifyContent: 'center' }}>
                            {props.playable ?
                                <></>
                                :
                                <TZButton
                                    width={"auto"}
                                    fontSize={Math.min(30, dims / 7)}
                                    loading={disabled || price === undefined}
                                    completed={success}
                                    title={price ? `$${(price / 100).toFixed(2)}` : ""}
                                    backgroundColor={success === true ? Colors.green : success === false ? Colors.red : undefined}
                                    onClick={() => onRequestClick(price)} />
                            }
                        </Col>
                    </Row>
                    <Row className="justify-content-md-center" style={{ padding: 0 }}>
                        {props.playable ?
                            <Modal.Body style={{ textAlign: "center", paddingTop: 0, color: 'white', alignItems: "center", display: "flex", flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: "column", color: 'white', paddingBottom: padding }}>
                                    <span style={{ textAlign: 'center' }}>Choose how much to pitch in for this song!</span>
                                </div>
                                <div style={{
                                    // width: "100%",// maxWidth: 300, //display: "flex", alignItems: 'center', flexDirection: 'column'  
                                    display: "flex", alignItems: 'center', flexDirection: 'column', width: "60%", maxWidth: 400,
                                }}>
                                    {/* <div style={{
                                        padding: padding, width: "100%"
                                    }}> */}
                                    <div
                                        // className="App-animated-gradient-fast-light"
                                        style={{
                                            // flex: 1,
                                            overflow: 'hidden', backgroundColor: "#fff1", //outlineColor: "#fff", outlineWidth: 2, outlineStyle: 'solid'
                                            boxShadow: sum / (props.minPrice ?? 1) > 1 ? `0px 0px ${Math.max((price ?? 0) / max * 10, 6)}px #fff8` : '0px 0px 0px #fff0',
                                            transition: "box-shadow .2s",
                                            width: "100%",
                                            borderRadius: radius,
                                            position: "relative",
                                        }}>
                                        <div className={`App-animated-gradient-fast${sum / (props.minPrice ?? 1) > 1 ? "-light" : ""}`} style={{
                                            // borderRadius: radius,
                                            height: "100%",
                                            position: 'absolute',
                                            width: `${sum / (props.minPrice ?? 1) <= 1 ? sum / (props.minPrice ?? 1) * 100 : 100}%`,
                                        }} />
                                        <div style={{
                                            position: 'relative', padding: 5
                                        }}>
                                            <div style={{ borderRadius: radius, backgroundColor: Colors.background }}>
                                                <TZButton
                                                    width={"100%"}
                                                    // fontSize={Math.min(30, dims / 7)}
                                                    title={price ? `Add $${(price / 100).toFixed(2)}` : ""}
                                                    loading={disabled || price === undefined}
                                                    completed={success}
                                                    color={success ? Colors.green : success === false ? Colors.red : Colors.background}
                                                    backgroundColor={"white"}                                                   // backgroundColor={success === true ? Colors.green : success === false ? Colors.red : "white"}
                                                    onClick={() => onRequestClick(price)} />
                                            </div>
                                        </div>
                                        {/* </div> */}
                                    </div>
                                </div>
                                <span className="App-smalltext" style={{ fontWeight: 'bold', lineHeight: 1.2, paddingTop: padding }}>{priceWords(props.minPrice, props.contributed, price)}</span>
                                <div style={{ width: "60%", maxWidth: 400, paddingTop: 20 }}>
                                    <input type="range" min={100} max={max} value={price} onChange={(e) => setPrice(parseInt(e.target.value))} step={50} className="slider"
                                        style={{
                                            backgroundImage: `linear-gradient(to right, #5ca1c7 0%, #5ca1c7 ${((price ?? 100) - 100) / (max / 100 - 1)}%, #fff3 ${((price ?? 100) - 100) / (max / 100 - 1)}%, #fff3 100%)`
                                        }}
                                    />
                                </div>
                                {((props.minPrice ?? 0) <= (props.contributed ?? 0)) ?
                                    <span className="App-smalltext" style={{ paddingTop: padding }}>Pitching in money increases the chance an artist plays a song! <span style={{ fontStyle: 'italic' }}>And if they don't, you won't be charged.</span></span>
                                    :
                                    <span className="App-smalltext" style={{ paddingTop: padding }}>
                                        This song needs to get at least ${numberToPrice((props.minPrice ?? 0) - (props.contributed ?? 0))} more to get played.<br></br><span style={{ fontStyle: 'italic' }}>You won't be charged if a song you contributed to isn't played by the end of the performance.</span>
                                    </span>
                                }
                            </Modal.Body>
                            :
                            <Modal.Body style={{ textAlign: "center", paddingTop: padding, color: 'white' }}>
                                <div style={{

                                }}>
                                    <span style={{ paddingTop: padding }}>You'll only be charged for requests that are accepted.</span>

                                </div>
                            </Modal.Body>
                        }
                    </Row>
                </Container>
            </Modal.Footer>
        </>
        );
    }

    const priceWords = (minPrice: number | undefined, contributed: number | undefined, price: number | undefined) => {
        if (minPrice === undefined || price === undefined || contributed === undefined) return "Something went wrong.";
        if (minPrice <= contributed) return `We reached the goal–add another $${numberToPrice(price)}!`;
        const diff = minPrice - contributed - price;
        if (diff < 0) return `Puts us $${numberToPrice((diff) * -1)} past the goal!`
        if (diff === 0) return `Just enough to reach the goal!`
        if (diff > 0) return `$${numberToPrice((diff))} left to reach the goal...`
    }

    const getPrice = async () => {
        if (props.playable) {
            setMasterPrice(props.price);
        }
        else {
            setMasterPrice(undefined);

            const response = await fetchNoToken(`calc_dynamic_price/`, 'POST', JSON.stringify({
                business_id: userContext.barState.bar?.id
            })).catch(e => { throw e });

            const json = await response.json();

            setMasterPrice(json.Dynamic_price);
        }
    }

    return (
        <Modal
            dialogClassName="App-modal"
            show={props.show} onShow={() => {
                setDisabled(false);
                getPrice();
                console.log(props.song)
                setPaymentScreenVisible(false);
                setSuccess(undefined);
            }} onHide={props.handleClose} centered data-bs-theme={"dark"}>
            {paymentScreenVisible ? <PaymentScreen /> : <RequestScreen />}
        </Modal>
    );
}