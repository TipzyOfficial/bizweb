import FlatList from "flatlist-react/lib";
import { SongType } from "../../lib/song";
import Song from "../../components/Song";
import { Colors, padding, radius } from "../../lib/Constants";
import { FinanceStatsType } from "./Dashboard";
import { numberToPrice } from "../../lib/utils";
import { useState } from "react";

export default function Stats(props: { stats: FinanceStatsType | undefined }) {
    const stats = props.stats;
    const [seeMore, setSeeMore] = useState(false);

    if (!stats) return (
        <span className="App-montserrat-normaltext" style={{ paddingBottom: 7, fontWeight: 'bold' }}>Stats aren't available right now–check again later.</span>
    )

    return (
        <div style={{ width: "100%" }}>
            <span className="App-montserrat-normaltext" style={{ paddingBottom: 7 }}>Your stats:</span>
            <div style={{ paddingBottom: padding }} />
            <div style={{ width: "100%", padding: padding, borderRadius: radius, backgroundColor: "#FFF1" }}>
                <span className="App-smalltext" style={{ paddingBottom: 7, color: "#fff8" }}>⚠ These stats may take a minute to update.</span>
                <div />
                <span className="App-montserrat-normaltext" style={{ paddingBottom: 7, fontWeight: 'bold' }}>Earnings for this week:</span>
                <div />
                <span className="App-subtitle" style={{ paddingBottom: 7, color: Colors.primaryRegular }}>${numberToPrice(stats.pendingBarCut)}</span>
                <div />
                <span className="App-montserrat-normaltext" style={{ paddingBottom: 7 }}>from {stats.pendingRequests} request{stats.pendingRequests === 1 ? "" : "s"}.</span>
                {seeMore ?
                    <>
                        <div style={{ paddingBottom: padding }} />
                        <span className="App-montserrat-normaltext" style={{ paddingBottom: 7, fontWeight: 'bold' }}>Lifetime earnings:</span>
                        <div />
                        <span className="App-subtitle" style={{ paddingBottom: 7, color: Colors.primaryRegular }}>${numberToPrice(stats.barCut)}</span>
                        <div />
                        <span className="App-montserrat-normaltext" style={{ paddingBottom: 7 }}>from {stats.totalRequests + stats.pendingRequests} request{stats.totalRequests + stats.pendingRequests === 1 ? "" : "s"}.</span>
                        <div style={{ paddingBottom: padding }} />
                        <span className="App-montserrat-normaltext" style={{ paddingBottom: 7 }}>Total customers: <span style={{ fontWeight: 'bold' }}>{stats.totalCustomers}</span></span>
                    </> :
                    <></>
                }
                <div style={{ width: "100%", display: "flex", justifyContent: "center", cursor: 'pointer' }} onClick={() => setSeeMore(!seeMore)}>
                    <span style={{ width: "100%", textAlign: 'center' }}>See {seeMore ? "less" : "more"}...</span>
                </div>
            </div>
        </div>
    )
}