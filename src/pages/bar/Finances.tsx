import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Song, { compactSongStyle } from "../../components/Song";
import TZHeader from "../../components/TZHeader";
import { Colors, modalZ, padding, radius, smallPadding } from "../../lib/Constants";
import { FitAnalysisType, SongRequestType, SongType, TipperType } from "../../lib/song";
import { isMobile, numberToPrice } from "../../lib/utils";
import { faCheck, faChevronLeft, faChevronRight, faCheckCircle, faQuestionCircle, faWarning, faXmark, faXmarkCircle, IconDefinition, faQuestion } from "@fortawesome/free-solid-svg-icons";
import { Modal, Spinner } from "react-bootstrap";
import { useContext, useState } from "react";
import Border from "../../components/Border";
import { last } from "lodash";
import { router } from "../../App";
import { useParams } from "react-router-dom";
import Price from "./Price";
import { UserSessionContext, UserSessionContextType } from "../../lib/UserSessionContext";
import TZButton from "../../components/TZButton";
import { fetchWithToken } from "../..";

export const pageStyle: React.CSSProperties = {
    position: 'relative', height: "100%",
    width: "100%",
    // gridTemplateColumns: aiTabVisible ? "1.5fr 3.5fr 1.5fr" : "1.5fr 5fr"
    display: 'flex',
    flexDirection: 'column',
    justifyContent: "flex-start",
    overflow: 'scroll',
};

const songRequestSongRatio = 40;
const compactSongDim = 40;
const compactSecondHalfCols = `1fr 1.5fr 1.5fr`;

const parseFitAnalysis = (str: string): FitAnalysisType => {
    const first = str.substring(0, 1);

    switch (first) {
        case "G":
            return "GOOD";
        case "O":
            return "OK";
        case "B":
            return "BAD";
        case "P":
            return "PENDING";
        default:
            return "UNKNOWN";
    }
}

const FitAnalysis = (props: { request: SongRequestType }): JSX.Element => {
    const fitAnalysis = parseFitAnalysis(props.request.fitAnalysis.toUpperCase())

    const dim = compactSongDim;

    switch (fitAnalysis) {
        case "GOOD":
            return <FontAwesomeIcon fontSize={dim * 0.5} icon={faCheckCircle} color={Colors.green} />;
        case "OK":
            return <FontAwesomeIcon fontSize={dim * 0.5} icon={faQuestionCircle} color={Colors.primaryRegular} />;
        case "BAD":
            return <FontAwesomeIcon fontSize={dim * 0.5} icon={faXmarkCircle} color={Colors.red} />;
        case "PENDING":
            //return <FontAwesomeIcon fontSize={dim * 0.5} icon={faQuestionCircle} color={"white"} />;
            return <span>No analysis was confirmed.</span>
        default:
            return <FontAwesomeIcon fontSize={dim * 0.5} icon={faWarning} color={"white"} />;
    }
}

const SongRequestRenderItem = (props: { request: SongRequestType, index: number, onClick: () => any }) => {
    const [mouseHover, setMouseHover] = useState(false);

    const request = props.request;
    const dim = compactSongDim;
    return (
        <div
            onClick={props.onClick}
            onMouseEnter={() => setMouseHover(true)}
            onMouseLeave={() => setMouseHover(false)}
            style={{
                width: "100%",
                //paddingTop: first ? smallPadding : 0, paddingBottom: first ? smallPadding : 0, 
                paddingLeft: padding, paddingRight: padding,
                paddingTop: padding, paddingBottom: padding,
                backgroundColor: mouseHover ? "#fff2" : (props.index % 2 === 1 ? "#0002" : undefined),
                cursor: 'pointer',
            }}>
            {/* <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                    <span className="App-smalltext" style={{ fontWeight: 'bold', color: Colors.primaryRegular }}> {request.price === 0 ? "FREE REQUEST" : `$${numberToPrice(request.price)}`}</span>
                </div>
                <span className="App-smalltext">{request.user.first_name} {request.user.last_name}</span>
            </div> */}
            <div style={{ display: "flex", alignItems: 'center', }}>
                <div style={{ flex: songRequestSongRatio }}>
                    <Song song={request.song} dims={dim} requestDate={request.date} compact />
                </div>
                <div style={{ flex: 100 - songRequestSongRatio, display: 'grid', gridTemplateColumns: compactSecondHalfCols, }}>
                    <span style={{ lineHeight: 2 }} className="onelinetextplain">{request.price === 0 ? "FREE" : `$${numberToPrice(request.price)}`}</span>
                    <span style={{ lineHeight: 2 }} className="onelinetextplain">{request.user.first_name} {request.user.last_name}</span>
                    <span style={{ lineHeight: 2 }} className="onelinetextplain">{request.date.toLocaleDateString()} {request.date.toLocaleTimeString()}</span>
                </div>
            </div>
            {/* <span className="App-smalltext" style={{ fontWeight: "bold" }}>Vibe check: {request.fitAnalysis}. </span>
            <span className="App-smalltext">{request.fitReasoning}</span> */}
        </div>
    )
}

function PageButton(props: { highlighted?: boolean, page: number, onClick?: () => any }) {
    const [hover, setHover] = useState(1);
    return (
        <div onClick={props.onClick} onMouseEnter={() => setHover(0.5)} onMouseLeave={() => setHover(1)}
            style={{ width: 30, height: 30, display: 'flex', justifyContent: 'center', alignItems: 'center', color: props.highlighted ? Colors.background : undefined, backgroundColor: props.highlighted ? "white" : undefined, border: "solid", borderColor: 'white', borderWidth: 1, opacity: props.onClick ? hover : 1, cursor: props.onClick ? 'pointer' : undefined }}>
            {props.page}
        </div>
    )
}

function PageButtons(props: { currentPage: number, onFirstClick: () => any, onLastClick: () => any, onNextClick: () => any, onPrevClick: () => any, pageCount: number }) {
    const [hover, setHover] = useState(1);

    const startPage = props.currentPage === 1;
    const endPage = props.currentPage >= props.pageCount;

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', opacity: props.currentPage <= 2 ? 0 : 1 }}>
                <PageButton page={1} onClick={props.currentPage <= 2 ? undefined : props.onFirstClick} />
                <div style={{ padding: padding }}>...</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', opacity: startPage ? 0 : 1 }}>
                <PageButton page={props.currentPage - 1} onClick={startPage ? undefined : props.onPrevClick} />
            </div>
            <div style={{ width: padding }} />
            <PageButton highlighted page={props.currentPage} />
            <div style={{ width: padding }} />
            <div style={{ display: 'flex', alignItems: 'center', opacity: endPage ? 0 : 1 }}>
                <PageButton page={props.currentPage + 1} onClick={endPage ? undefined : props.onNextClick} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', opacity: props.currentPage >= props.pageCount - 1 ? 0 : 1 }}>
                <div style={{ padding: padding }}>...</div>
                <PageButton page={props.pageCount} onClick={props.currentPage >= props.pageCount - 1 ? undefined : props.onLastClick} />
            </div>
        </div>
    )
}

export default function Finances(props: {
    totalRevenue: number,
    minPriceState: [number | undefined, (n: number | undefined) => any],
    currPriceState: [number | undefined, (n: number | undefined) => any],
    refresh: (usc: UserSessionContextType) => any,
    requests: SongRequestType[], page: number, setPage: (n: number) => any, songCount: number
}) {
    const songRequests: SongRequestType[] = props.requests;
    const SONGS_PER_PAGE = 10; //how many songs server returns
    const page = props.page;
    const pageCount = props.songCount ? Math.ceil(props.songCount / SONGS_PER_PAGE) : 0;
    const setPage = props.setPage;
    const usc = useContext(UserSessionContext);

    const [minPrice, setMinPrice] = props.minPriceState;
    const [currPrice, setCurrPrice] = props.currPriceState;

    const [modalContent, setModalContent] = useState<SongRequestType | undefined>();

    const onCashoutClick = async () => {

    }

    const onStripeClick = async () => {
        const json = await fetchWithToken(usc, `create_stripe_express/`, 'POST', JSON.stringify({
            email: usc.user.user.email
        })).then(r => r.json())

        if (json.status === 200) {
            const url = json.account_url;
            window.open(url, "_blank")
        } else {
            throw new Error(`Can't open Stripe account. status: ${json.status} detail: ${json.detail}`)
        }

        console.log("stripe response", json)
    }

    return (
        <div style={pageStyle}>
            {/* <TZHeader title="Your Finances" /> */}
            <div style={{ width: "100%", display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: padding }}>
                <span className="App-subtitle" style={{ textAlign: 'center', width: "100%" }}>Total Revenue: <b>${numberToPrice(props.totalRevenue)}</b></span>
                <div style={{ display: 'flex', paddingTop: padding }}>
                    <div>
                        <TZButton title="Cash Out" onClick={onStripeClick} />
                    </div>
                </div>
            </div>
            <div style={{ width: "100%", display: 'flex', flexDirection: isMobile() ? 'column' : 'row', justifyContent: 'center', padding: padding }}>
                <div style={{ display: 'flex', paddingRight: isMobile() ? 0 : padding, paddingBottom: isMobile() ? padding : 0 }}>
                    <div>
                        <TZButton title="View Stripe Dashboard" onClick={onStripeClick} />
                    </div>
                </div>
                <div style={{ display: 'flex' }}>
                    <Price minPrice={minPrice} setMinPrice={setMinPrice} currPrice={currPrice} refresh={props.refresh} />
                </div>
            </div>
            <div className="App-tertiarytitle" style={{ paddingLeft: padding }}>History of accepted requests</div>
            <div style={{ paddingLeft: padding }}>Tap on a request for more info</div>
            <PageButtons currentPage={page} pageCount={pageCount}
                onNextClick={() => setPage(page + 1)} onPrevClick={() => setPage(page - 1)} onFirstClick={() => setPage(1)} onLastClick={() => setPage(pageCount)} />
            <div style={{ width: "100%", height: "100%", borderRadius: radius, overflow: isMobile() ? 'scroll' : undefined }}>
                <div style={{ paddingLeft: padding, paddingRight: padding }}>
                    <Border />
                    {/* <div style={{ width: 50, height: 2000, backgroundColor: 'red' }}></div> */}
                    <div className="App-smalltext" style={{ width: "100%", display: 'flex', paddingBottom: smallPadding, paddingTop: smallPadding, fontWeight: 'bold', color: "#fff8" }}>
                        <div style={{ flex: songRequestSongRatio, }}>
                            <div style={compactSongStyle(compactSongDim)}>
                                <div>SONG</div>
                            </div>
                        </div>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: compactSecondHalfCols,
                            flex: 100 - songRequestSongRatio,
                        }}>
                            <div>PRICE</div>
                            <div>USER</div>
                            <div>DATE</div>
                        </div>
                    </div>
                </div>
                {songRequests && songRequests.length > 1 ?
                    songRequests.map((r, i) =>
                        // <div style={{ paddingTop: smallPadding }}>
                        <SongRequestRenderItem onClick={() => {
                            setModalContent(r);
                        }} request={r} key={i + "key"} index={i + 1} />
                        // </div>
                    )
                    : <></>
                }
                <div style={{ height: 50 }} />
            </div>
            <Modal data-bs-theme={"dark"} style={{ zIndex: modalZ }} show={modalContent !== undefined} onHide={() => setModalContent(undefined)}>
                {modalContent ?
                    <Modal.Body style={{ color: 'white', display: 'flex', flexDirection: 'column' }}>
                        <Song song={modalContent.song} />
                        <div style={{ paddingTop: smallPadding, display: 'flex', flexDirection: 'column', }}>
                            <span>Request ID: <b>{modalContent.id}</b></span>
                            <span style={{ paddingTop: smallPadding }}>Price: <b>${numberToPrice(modalContent.price)}</b></span>
                            <span style={{ paddingTop: smallPadding }}>Name: <b>{modalContent.user.first_name} {modalContent.user.last_name}</b></span>
                            <span>Email: <b>{modalContent.user.email}</b></span>
                            <span>Date: <b>{modalContent.date.toLocaleDateString()} at {modalContent.date.toLocaleTimeString()}</b></span>
                            <span style={{ paddingTop: smallPadding }}>Fit analysis: <FitAnalysis request={modalContent} /> <i>{modalContent.fitReasoning}</i></span>
                        </div>
                    </Modal.Body> : <></>
                }
            </Modal>
        </div >

    )
}

