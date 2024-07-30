import FlatList from "flatlist-react/lib";
import Song from "../../components/Song";
import { Colors, padding, radius } from "../../lib/Constants";
import { dateTimeParser, dateTimeParserString } from "../../lib/datetime";
import { SongRequestType, songRequestCompare } from "../../lib/song";
import { RefObject, memo, useCallback, useContext, useEffect, useRef, useState } from "react";
import { fetchWithToken } from "../..";
import { UserSessionContext } from "../../lib/UserSessionContext";
import { parseRequest, parseRequests } from "./Bar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Spinner } from "react-bootstrap";
import ExpandHeader from "../../components/ExpandHeader";

const RenderItem = memo((props: { request: SongRequestType, cancellable?: boolean, refresh: () => void }) => {
    // const dt = dateTimeParser(props.request.date.toISOString());
    const [canCancel, setCanCancel] = useState(true);
    const rqp = 8;
    const usc = useContext(UserSessionContext);

    const cancelRequest = async () => {
        if (!canCancel) return;
        setCanCancel(false);
        console.log("start cancel");
        await fetchWithToken(usc, `tipper/request/cancel/?request_id=${props.request.id}`, "PATCH").then(response => {
            if (!response) throw new Error("null response");
            if (!response.ok) throw new Error("bad response: " + response.status);
            return response.json();
        }).then((json) => {
            console.log("cancelling", json);
        }).catch((e: Error) => alert("Error cancelling request: " + e.message));
        await props.refresh();
        console.log("end cancel");

        // setCanCancel(true);
    }

    let statusColor = Colors.primaryRegular;
    switch (props.request.status) {
        case "ACCEPTED":
            statusColor = Colors.green;
            break;
        case "PENDING":
            statusColor = Colors.primaryRegular;
            break;
        case "REJECTED":
            statusColor = Colors.secondaryRegular;
            break;
        case "CANCELED":
            statusColor = Colors.red;
            break;
        case "EXPIRED":
            statusColor = "#AAA";
            break;
    }
    return (
        <div style={{ paddingTop: padding, paddingLeft: padding, paddingRight: padding, width: '100%', opacity: canCancel ? 1 : 0.5 }}>
            <div style={{
                paddingBottom: rqp - 3, paddingLeft: rqp, paddingRight: rqp, paddingTop: rqp - 3,
                backgroundColor: "#8882", width: '100%', borderRadius: radius
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <span style={{ paddingBottom: rqp - 3, display: 'block' }}>{props.request.bar.name}</span>
                    {props.cancellable ? <span onClick={cancelRequest} style={{ paddingBottom: rqp - 3, display: 'block', cursor: 'pointer', color: Colors.red }}>Cancel</span> : <></>}
                </div>
                <Song song={props.request.song}></Song>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <span className="App-smalltext" style={{ display: 'block', color: "#777" }}>{props.request.date.toLocaleString()}</span>
                    <span style={{ color: statusColor }}>{props.request.status}</span>
                </div>
            </div>
        </div>
    )
})


const RequestsContent = (props: {
    padding: number, height: number | undefined, cload: boolean,
    pr: SongRequestType[], cr: SongRequestType[], refresh: () => void
}) => {
    const refresh = props.refresh;
    const padding = props.padding
    // const [pendingReqs, setPendingReqs] = useState<SongRequestType[]>([])
    // const [allReqs, setAllReqs] = useState<SongRequestType[]>([])
    const pendingReqs = props.pr;
    const allReqs = props.cr;
    const [pendingVisible, setPendingVisible] = useState(true);
    const [completedVisible, setCompletedVisible] = useState(true);
    // const [cload, setCload] = useState(false);
    const cload = props.cload;
    const height = props.height ?? 0;

    return (
        <div style={{ justifyContent: 'flex-start', alignItems: 'flex-start', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                <ExpandHeader zI={4} height={height} loading={cload} text="Pending" onClick={() => setPendingVisible(!pendingVisible)} expanded={pendingVisible}></ExpandHeader>
                {cload ? <></> : (pendingVisible ? <>
                    <FlatList
                        list={pendingReqs}
                        renderWhenEmpty={() => <div style={{ height: 50, justifyContent: 'center', alignItems: 'center', display: 'flex', color: '#888' }}>No pending requests.</div>}
                        renderItem={(item) => <RenderItem request={item} key={item.id} cancellable refresh={refresh} />}
                    />
                    <div style={{ paddingBottom: padding / 2 }}></div>
                </> : <></>)}
                <div style={{ paddingBottom: padding / 2 }}></div>
                <ExpandHeader zI={5} height={height} loading={cload} text="Completed" onClick={() => setCompletedVisible(!completedVisible)} expanded={completedVisible}></ExpandHeader>
                {cload ? <></> : (completedVisible ? <>
                    <FlatList
                        list={allReqs}
                        renderWhenEmpty={() => <div style={{ height: 50, justifyContent: 'center', alignItems: 'center', display: 'flex', color: '#888' }}>No completed requests.</div>}
                        renderItem={(item) => <RenderItem request={item} key={item.id} refresh={refresh} />}
                    />
                    <div style={{ paddingBottom: padding }}></div>
                </> : <></>)}
            </div>
        </div>);
}

export default RequestsContent;