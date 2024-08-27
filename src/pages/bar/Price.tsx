import FlatList from "flatlist-react/lib";
import { SongType } from "../../lib/song";
import Song from "../../components/Song";
import { padding, radius, useFdim } from "../../lib/Constants";
import LogoLetter from "../../assets/LogoLetter.svg"
import { numberToPrice } from "../../lib/utils";
import { useContext, useState } from "react";
import TZButton from "../../components/TZButton";
import { fetchWithToken } from "../..";
import { UserSessionContext } from "../../lib/UserSessionContext";
import { styles } from "../Login";

export default function Price(props: { minPrice: number | undefined, currPrice: number | undefined, setMinPrice: (n: number | undefined) => void, refresh: () => Promise<void> }) {
    const fdim = useFdim();
    const logoDim = fdim / 30;

    // const [minUIPrice, setMinUIPrice] = useState(props.minPrice);
    const [touched, setTouched] = useState(false);
    const [disabled, setDisabled] = useState(false);
    const usc = useContext(UserSessionContext)

    const setMinimumPrice = async () => {
        const json = await fetchWithToken(usc, `set_minimum_price/`, 'POST', JSON.stringify({
            business_id: usc.user.business_id,
            min_price: props.minPrice,
        })).then((r) => r.json());

        console.log(json);
    }

    return (
        <div style={{ width: "100%", backgroundColor: "#fff1", padding: padding, borderRadius: radius }}>
            <span className="App-montserrat-normaltext" style={{ paddingBottom: 7 }}>Current surge price: {props.currPrice !== undefined ? "$" + numberToPrice(props.currPrice) : "..."}</span>
            <div />
            <span className="App-montserrat-normaltext" style={{ paddingBottom: 7, fontWeight: "bold" }}>Minimum price: {props.minPrice !== undefined ? "$" + numberToPrice(props.minPrice) : "..."}</span>
            <div style={{ width: "100%" }}>
                <input type="range" value={props.minPrice} disabled={disabled} style={{ width: "100%" }} onChange={(e) => {
                    setTouched(true);
                    // setMinUIPrice(e.currentTarget.valueAsNumber)
                    props.setMinPrice(e.currentTarget.valueAsNumber)
                }} min={0} max={800} step={50}></input>
            </div>
            {props.minPrice !== undefined && touched ?
                <>
                    <div style={{ paddingBottom: padding }} />
                    <TZButton title={`Save changes`}
                        onClick={async () => {
                            setDisabled(true);
                            setTouched(false);
                            await setMinimumPrice();
                            await props.refresh();
                            setDisabled(false);
                        }}
                    />
                </>
                : <></>}
        </div>
    )
}