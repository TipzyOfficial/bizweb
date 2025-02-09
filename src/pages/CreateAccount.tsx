import { useContext, useState } from "react"
import { UserSessionContext } from "../lib/UserSessionContext"
import { Business } from "../lib/user"
import { Colors, padding, radius } from "../lib/Constants"
import TZButton from "../components/TZButton"
import { businessFromJSON, getBusiness, storeAll } from ".."
import { ServerInfo } from "../lib/serverinfo"
import TZHeader from "../components/TZHeader"
import BackButton from "../components/BackButton"
import {
    setKey,
    setDefaults,
    setLanguage,
    setRegion,
    fromAddress,
    fromLatLng,
    fromPlaceId,
    setLocationType,
    geocode,
    RequestType,
    OutputFormat,
} from "react-geocode";
import { router } from "../App"

const mapsKey = process.env.REACT_APP_GMAPS_API_KEY;

// Set default response language and region (optional).
// This sets default values for language and region for geocoding requests.
setDefaults({
    key: process.env.REACT_APP_GMAPS_API_KEY, // Your API key here.
    language: "en", // Default language for responses.
    region: "us", // Default region for responses.
    outputFormat: OutputFormat.JSON,
});

type BarBasicInfoType = {
    firstname: string,
    lastname: string,
    name: string,
    type: string,
    vibe: string,
}

type LocationType = {
    address: string,
    lat: number,
    long: number
}


export default function CreateAccount(props: { returnToLogin: () => any }) {
    const usc = useContext(UserSessionContext);
    const user = usc.user

    const [page, setPage] = useState(0);
    const [baddr, setBAddr] = useState<LocationType | undefined>();
    const [basicInfo, setBasicInfo] = useState<BarBasicInfoType | undefined>();
    const [confirmLoading, setConfirmLoading] = useState(false);

    const onConfirm = async () => {
        if (confirmLoading) return;
        setConfirmLoading(true);
        if (!basicInfo) return;
        if (!baddr) return;

        console.log("lat long conf", Math.floor(baddr.lat * 10 ** 6) / (10 ** 6), Math.floor(baddr.long * 10 ** 6) / (10 ** 6));

        // const firstName = await AsyncStorage.getItem("apple_firstname");
        // const lastName = await AsyncStorage.getItem("apple_lastname");

        // const url = `?first_name=${firstName ?? "Guest"}&last_name=${lastName ?? "Guest"}`

        fetch(`${ServerInfo.baseurl}business/`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${user.user.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                business_name: basicInfo.name,
                business_type: basicInfo.type,
                address: baddr.address,
                vibe: basicInfo.vibe,
                latitude: Math.floor(baddr.lat * 10 ** 6) / (10 ** 6),
                longitude: Math.floor(baddr.long * 10 ** 6) / (10 ** 6),
            })
        }).then(response => {
            if (!response) throw new Error(`Null response`);
            if (!response.ok) {
                throw new Error(`Bad response. Response: ${response.status}`)
            }
            return response.json();
        }).then(json => {
            console.log("json", json);

            const data = json.data;

            if (!data) {
                console.log(json.status ?? "[no status]");
                throw new Error("Something went wrong creating your business. Details: " + (json.status ?? "[no status]") + " - " + (json.detail ?? "[can't read error]"));
            }

            const b = businessFromJSON(usc.user, data);

            usc.setUser(b);

            router.navigate("/dashboard");

            //SUCCESS
            // if (firstName && lastName) {
            //     AsyncStorage.removeItem("apple_firstname");
            //     AsyncStorage.removeItem("apple_lastname")
            // }
            // storeAll(usc, usc.user.refreshToken).then((user) => {
            //     nav.replace("Tabs", { user: user });
            // });

        }).catch((e) => {
            alert(`Error creating new account. ${e.message}`);
            setConfirmLoading(false);
        })
    }

    const ConfirmInfo = () => {
        return (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: "100%", padding: padding }}>
                <span className="App-tertiarytitle">Confirm your information:</span>
                <span className="App-normaltext">Your name: <b>{basicInfo?.firstname} {basicInfo?.lastname}</b></span>
                <span className="App-normaltext">Business name: <b>{basicInfo?.name}</b></span>
                <span className="App-normaltext">Type: <b>{basicInfo?.type}</b></span>
                <span className="App-normaltext">Vibe: <b>{basicInfo?.vibe}</b></span>
                <span className="App-normaltext">Address: <b>{baddr?.address}</b></span>
                {/* <Text style={{ fontSize: 20, paddingVertical: paddingSpacing }}>Lat Long: {baddr?.lat}, {baddr?.long}</Text> */}
                <div style={{ padding: padding * 2 }} />
                <TZButton loading={confirmLoading} title="Finish Setup" onClick={() => {
                    onConfirm();
                }}></TZButton>
            </div>
        )
    }

    const getPages = () => {
        switch (page) {
            case 0:
                return <BarPage0 user={user} info={basicInfo} setInfo={setBasicInfo} setPage={setPage} />
            case 1:
                return <BarPage1 setPage={setPage} info={baddr} setInfo={setBAddr} name={basicInfo?.name ?? ""} />
            case 2:
                return <ConfirmInfo />
            default:
                return <BarPage0 user={user} info={basicInfo} setInfo={setBasicInfo} setPage={setPage} />
        }
    }


    return (
        <div className="App-body-top" style={{ width: "100%", maxWidth: 700, backgroundColor: '#0000' }}>
            <TZHeader leftComponent={<BackButton onClick={
                () => {
                    if (page > 0) setPage(page - 1);
                    else
                        props.returnToLogin();
                }} />} title="Account Setup" />
            {getPages()}
        </div>
    )
}

function SetupInput(props: { value: any, onChange: (v: string) => any, text: string }) {
    return (
        <div style={{}}>
            <div className="App-tertiarytitle" style={{ paddingTop: padding }}>{props.text}</div>
            <input className="input-setup" style={{ padding: 5 }} value={props.value} onChange={(e) => props.onChange(e.target.value)} />
        </div>
    )
}

const BarPage0 = (props: { user: Business, setPage: (n: number) => void, setInfo: (b: BarBasicInfoType) => void, info: BarBasicInfoType | undefined }) => {
    const page = 0;

    const [bname, setBName] = useState(props.info?.name ?? "");
    const [btype, setBType] = useState(props.info?.type ?? "");
    const [bvibe, setBVibe] = useState(props.info?.vibe ?? "");
    const [bfn, setBfn] = useState(props.info?.firstname ?? "");
    const [bln, setBln] = useState(props.info?.lastname ?? "");


    const onNext = () => {
        props.setInfo({ name: bname, type: btype, vibe: bvibe, firstname: bfn, lastname: bln });
        props.setPage(page + 1);
    }

    return (
        <div style={{ width: "100%", display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: padding }}>
            <span className="App-tertiarytitle">Thanks for choosing Tipzy!</span>
            <span>Please fill out the following fields to continue setting up your business:</span>
            <SetupInput text="Your First Name:" value={bfn} onChange={setBfn} />
            <SetupInput text="Your Last Name:" value={bln} onChange={setBln} />
            <SetupInput text="Business Name:" value={bname} onChange={setBName} />
            <SetupInput text="Business Type:" value={btype} onChange={setBType} />
            <SetupInput text="What's your vibe?" value={bvibe} onChange={setBVibe} />
            <div style={{ height: padding * 2 }} />
            <TZButton title="Continue" disabled={bfn.length === 0 || bln.length === 0 || bname.length === 0 || btype.length === 0 || bvibe.length === 0} onClick={onNext} />
        </div>
    )
}

const LocationCard = (props: { loc?: LocationType, onClick: () => any }) => {
    const [hover, setHover] = useState(true);

    return (
        <>
            <div style={{ height: padding }} />
            <div onMouseEnter={() => setHover(false)} onMouseLeave={() => setHover(true)} onClick={props.onClick} style={{ padding: padding, borderRadius: radius, cursor: 'pointer', border: 'solid', borderColor: hover ? '#fff3' : Colors.primaryRegular }}>
                <span>{props.loc?.address ?? "No location"}</span>
            </div>

        </>
        // <TZButton title={props.loc?.address ?? ""} disabled={props.loc === undefined} onClick={props.onClick()} />
    );
}

// type LocationType = {
//     address: string,
//     lat: number,
//     long: number
// }

const BarPage1 = (props: { setPage: (n: number) => void, setInfo: (l: LocationType) => void, name: string, info: LocationType | undefined }) => {
    const page = 1;

    const [baddr, setBAddr] = useState(props.info?.address ?? "");
    const [blank, setBlank] = useState(false);
    const [geoRes, setGeoRes] = useState<LocationType[] | null | undefined>(undefined);
    // const [result, setRes] = useState<Geocoder.GeocoderResponse | null>(null);

    const Search = async () => {

        console.log("mkey", mapsKey);

        setKey(mapsKey ?? "");
        const loc = await fromAddress(baddr).catch((e) => {
            console.log(e);
        });

        console.log(loc);

        const allResults: any[] | null = loc?.results ?? null;

        const locations: LocationType[] = [];

        if (allResults) {
            for (const result of allResults) {

                if (result?.address_components[0].types.indexOf("street_number") !== -1) {//setGeoRes(loc.results);

                    const l = result.navigation_points[0].location

                    locations.push({
                        address: result.formatted_address,
                        lat: l.latitude,
                        long: l.longitude
                    })
                }
            }

            if (locations.length === 0) setGeoRes(null)
            else setGeoRes(locations)
        } else {
            setGeoRes(null);
        }
        // if (loc?.results[0].address_components[0].types.indexOf("street_number") !== -1) setGeoRes(loc.results);
        // else setGeoRes(null);

    }

    return (
        <div style={{ width: "100%", display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: padding }}>
            <SetupInput text="Please enter your bar's address:" value={baddr} onChange={setBAddr} />
            <div style={{ paddingTop: padding, paddingBottom: padding, display: 'flex', flexDirection: 'column' }}>
                {
                    geoRes ?
                        <>
                            <div>
                                Choose your address from below:
                            </div>
                            {geoRes.map((v, i) =>
                                <LocationCard loc={v} onClick={() => {
                                    props.setInfo(v);
                                    props.setPage(page + 1);
                                }} />
                            )}
                        </>
                        : geoRes === null ? <span>No results–try being more specific.</span> : <></>
                }
            </div>
            <TZButton title="Search" onClick={Search} />
        </div>
    )
}