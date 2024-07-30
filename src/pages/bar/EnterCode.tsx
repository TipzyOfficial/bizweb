import React, { memo, useContext, useEffect, useLayoutEffect, useState } from "react";
import { UserSessionContext } from "../../lib/UserSessionContext";
import '../../App.css'
import { Button, Card, Container, Spinner } from "react-bootstrap";
import { Colors, padding, radius } from "../../lib/Constants";
import TZButton from "../../components/TZButton";
import { router } from "../../App";
import ProfileButton from "../../components/ProfileButton";
import { BarType } from "../../lib/bar";
import FlatList from "flatlist-react/lib";
import { fetchWithToken } from "../..";
import { fetchNoToken } from "../../lib/serverinfo";
import useWindowDimensions from "../../lib/useWindowDimensions";
import defaultBarBackground from "../../assets/default_background.png"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faQuestionCircle } from "@fortawesome/free-regular-svg-icons";
import { getCookies } from "../../lib/utils";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
// import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import FullLogo from '../../assets/Tipzy_Full_Orange.png';
import defaultBackground from "../../assets/entercode_background.jpg"


const BarRenderItem = memo((props: { bar: BarType }) => {
    const rand = Math.random();
    const bar = props.bar;

    return (
        <div style={{ cursor: 'pointer' }} onClick={() => {
            router.navigate(`/bar?id=${bar.id}`)
        }}>
            <div style={{ width: "100%", padding: padding, backgroundColor: "#8883", borderRadius: radius, display: 'flex', alignItems: 'center' }}>
                <div style={{
                    height: '100%', borderRadius: "100%", overflow: 'hidden',
                }}>

                    {bar.image_url && bar.image_url.length > 0 ?
                        <img src={bar.image_url} alt={bar.name} style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 50, }} />
                        : <img src={defaultBarBackground} alt={bar.name} style={{
                            width: 50, height: 50, objectFit: "fill",
                            transform: `translateX(${rand * 50}%) translateY(${rand * 50}%) scale(${rand + 2}) rotate(${Math.floor(rand * 2) * 180}deg)`,//translate(${Math.floor(Math.random() * 50)}px,${Math.floor(Math.random() * 50)})px`, ${Math.floor(Math.random() * 100)}
                        }} />
                    }
                </div>
                <div style={{ width: "100%", paddingLeft: padding, borderRadius: radius, display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <span className="App-normaltext" style={{ fontWeight: 'bold' }}>
                        {bar.name}
                    </span>
                    <span className="App-smalltext" style={{ fontWeight: 500, color: Colors.tertiaryLight }}>
                        {bar.type}
                    </span>
                </div>
            </div>
            <div style={{ height: padding }}></div>
        </div>
    )
})

function EnterCode() {
    const userContext = useContext(UserSessionContext)
    const [barID, setBarID] = useState("");
    const [bars, setBarsIn] = useState<BarType[] | undefined>();
    const [codeVisible, setCodeVisible] = useState(false);
    const setBars = (b: BarType[]) => {
        if (JSON.stringify(b) !== JSON.stringify(bars)) setBarsIn(b);
    }

    const getBars = async () => {
        const json = await fetchNoToken(`tipper/businesses/`, 'GET').then((r) => r.json());
        const o: BarType[] = []
        json.forEach((e: any) => {
            if (e.active)
                o.push({
                    id: e.id,
                    name: e.business_name,
                    type: e.business_type,
                    description: e.description,
                    image_url: e.image_url,
                    allowingRequests: e.allowing_requests,
                    vibe: e.vibe,
                    active: e.active,
                })
        })

        setBars(o.sort((a, b) => {
            return (b.id - a.id);
        }));
    }


    const onClick = () => {
        console.log("barid", barID)
        router.navigate(`/bar?id=${barID}`)
    }

    useEffect(() => {
        const c = getCookies();
        c.remove("bar_session");
        c.remove("artist_session");
        getBars();
    }, [])

    const mW = 600;

    // console.log(userContext)
    return (
        <div className="App-body-top" style={{
            backgroundImage: `url(${defaultBackground})`, backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            // backgroundAttachment: "fixed",
        }}>
            <div className="App-body-top" style={{ maxWidth: mW, backgroundColor: "#0000" }}>
                <ProfileButton position="fixed" style={{
                    top: padding,
                    right: Math.max((useWindowDimensions().width - mW + padding) / 2, padding),
                    backgroundColor: "#0002",
                    WebkitBackdropFilter: 'blur(5px)',
                    backdropFilter: 'blur(5px)',
                    borderRadius: "100%"
                }} />

                <div style={{ paddingTop: padding * 2, paddingBottom: padding * 2, paddingLeft: padding, display: 'flex', justifyContent: 'center', alignItems: 'center', width: "100%" }}>
                    {/* <span className="App-subtitle" style={{ fontWeight: 500 }}>Welcome!</span> */}
                    <img src={FullLogo} style={{ maxHeight: 40, objectFit: 'contain' }} alt={"tipzy full logo"}></img>
                </div>
                {/* <div style={{ paddingBottom: padding }} /> */}
                <div style={{ paddingLeft: padding, paddingRight: padding, width: "100%" }}>
                    <div>
                        <span className="App-subtitle" style={{ fontSize: "calc(20px + 1vmin)", fontWeight: 'bold' }}>For you</span>
                        <div style={{ padding: padding / 2 }}></div>
                        {bars ?
                            <FlatList
                                list={bars}
                                renderItem={(item, key) =>
                                    <div key={item.id + "k_" + key}>
                                        <BarRenderItem bar={item} />
                                    </div>
                                }
                            /> :
                            <div style={{ width: "100%", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: padding }}><Spinner style={{ color: Colors.primaryRegular, width: 75, height: 75 }} /></div>

                        }
                    </div>
                    {codeVisible ?
                        // <div style={{ padding: padding * 2, borderRadius: radius, borderStyle: 'solid', borderColor: 'white', borderWidth: 1, width: "100%", backgroundColor: "#8883"}}>
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                padding: padding * 2, borderRadius: radius, borderStyle: 'solid', borderColor: 'white', borderWidth: 1, width: "100%", backgroundColor: "#8883",
                                position: 'relative', top: 0,

                            }}>
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', width: "100%", cursor: 'default' }}>
                                    <span className="App-tertiarytitle" style={{ fontWeight: 500, width: "100%", textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div style={{ paddingRight: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FontAwesomeIcon fontSize={"calc(8px + 1vmin)"} icon={faQuestionCircle}></FontAwesomeIcon></div>Don't see your bar on this page?
                                    </span>
                                    <span className="App-normaltext" style={{ width: "100%", textAlign: 'center', paddingBottom: padding }}>Ask a bartender for its unique code!</span>
                                    <input
                                        className="App-tertiarytitle"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={8} style={{
                                            width: "100%", maxWidth: 300, fontSize: "calc(20px + 1vmin)", textAlign: 'center', padding: 5,
                                        }}
                                        value={barID}
                                        onChange={(e) => {
                                            const v = e.target.value.replace(/\D/g, '');
                                            setBarID(v);
                                        }}
                                    ></input>
                                    <div style={{ paddingTop: padding, width: "100%", maxWidth: 300 }}>
                                        <TZButton title="Continue" onClick={onClick} />
                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: 5, position: 'absolute', right: padding, top: padding, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', cursor: 'pointer' }}
                                onClick={() => setCodeVisible(false)}
                            ><FontAwesomeIcon icon={faXmark}></FontAwesomeIcon></div>
                        </div>

                        :
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: "100%" }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: padding, borderRadius: radius, cursor: 'pointer', width: "100%" }} // backgroundColor: "#8883", borderWidth: 1, borderColor: 'white', borderStyle: 'solid',  }}
                                onClick={() => setCodeVisible(true)}>
                                <div style={{ paddingRight: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FontAwesomeIcon fontSize={"calc(8px + 1vmin)"} icon={faQuestionCircle}></FontAwesomeIcon></div>
                                <span className="App-tertiarytitle" style={{ fontWeight: 500, textAlign: 'center', }}>
                                    Don't see your bar on this page?
                                </span>
                            </div>
                        </div>
                    }
                    <div style={{ height: padding * 2 }}></div>
                </div>
                {/* <div style={{ maxWidth: 350 }}>
                <div style={{ paddingTop: '5dvh', paddingBottom: padding }}>
                    <Container data-bs-theme="dark" >
                        <Card>
                            <Card.Header style={{ textAlign: 'center' }}>
                                <span>Scan a Tipzy QR code at your bar!</span>
                                <br></br>
                                <span>You can also ask a bartender for the bar's code and enter it here:</span>
                            </Card.Header>
                            <Card.Body>

                            </Card.Body>
                        </Card>
                    </Container>
                    <ProfileButton />
                </div>
                <div style={{ padding: padding / 2 }}>
                    <span className="App-tertiarytitle">Other bars near you:</span>
                    <div style={{ padding: padding / 2 }}></div>
                    {bars ?
                        <FlatList
                            list={bars}
                            renderItem={(item, key) =>
                                <div key={item.id + "k_" + key}>
                                    <BarRenderItem bar={item} />
                                </div>
                            }
                        /> : <></>
                    }
                </div>
            </div> */}
            </div>
        </div>
    )
}

export default EnterCode;