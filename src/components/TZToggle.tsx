import { useState } from "react";
import { Colors, padding, radius, useFdim } from "../lib/Constants";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Spinner } from "react-bootstrap";
import { faCheckSquare as faYes, faSquare as faNo } from "@fortawesome/free-regular-svg-icons";

export default function TZToggle(props: { title?: string, value: boolean, onClick: () => Promise<void>, disabled?: boolean }) {
    const [hover, setHover] = useState(false);
    const fdim = useFdim();
    const dim = fdim / 40;
    const [loading, setLoading] = useState(false);
    const onClick = async () => {
        if (!loading && !props.disabled) {
            setLoading(true)
            await props.onClick();
            setLoading(false);
        }
    }
    return (
        <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                borderRadius: radius, display: 'flex', alignItems: 'center', cursor: 'pointer',
                opacity: props.disabled ? 0.5 : loading ? 0.9 : hover ? 0.8 : 1
            }} onClick={onClick}>
            {props.title ? <span className="App-montserrat-smallertext" style={{ paddingRight: padding, fontWeight: 'bold' }}>{props.title}</span> : <></>}

            {!loading ? <FontAwesomeIcon icon={props.value ? faYes : faNo} fontSize={dim}></FontAwesomeIcon> :
                //<Spinner size={"sm"} style={{ width: dim, height: dim }} />
                <FontAwesomeIcon icon={props.value ? faNo : faYes} fontSize={dim}></FontAwesomeIcon>
            }
        </div>
    );
}
