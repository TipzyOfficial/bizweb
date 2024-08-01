import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Colors, padding, radius, useFdim } from "../lib/Constants";
// import { faUser as faProfile } from "@fortawesome/free-solid-svg-icons";
import { faUser as faProfile } from "@fortawesome/free-regular-svg-icons"
import { router } from "../App";
import { useLocation } from "react-router-dom";
import useWindowDimensions from "../lib/useWindowDimensions";
import { UserSessionContext } from "../lib/UserSessionContext";
import { useContext, useState } from "react";
import { Logout } from "..";

export default function ProfileButton(props: { position?: "fixed" | "relative" | "sticky", disabled?: boolean, style?: React.CSSProperties, name?: string }) {
    // const fs = 25
    const usc = useContext(UserSessionContext)
    const dims = Math.min(Math.max(35, 10 + useWindowDimensions().width * 0.04), 45);
    const position = props.position ?? "fixed";
    // console.log(location.pathname)

    const [hover, setHover] = useState(false);

    return (
        <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                position: position,
                top: position === "fixed" ? padding : undefined,
                right: position === "fixed" ? padding : undefined,
                zIndex: 20,
                ...props.style
            }}>
            <button
                onClick={() => {
                    if (!usc.user.user.access_token) {
                        Logout(usc);
                        return;
                    }
                    if (!props.disabled) router.navigate("/account")
                }}
                style={{
                    overflow: 'hidden',
                    backgroundColor: hover ? "#fff2" : Colors.background + "00",
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    maxHeight: dims,
                    height: dims,
                    borderRadius: dims,
                    padding: padding,
                    borderStyle: 'solid',
                    borderWidth: 1,
                    borderColor: 'white',
                    color: 'white',
                    // boxShadow: '0px 10px 10px rgba(0, 0, 0, 0.5)'
                    transition: "all 0.2s"
                }}>
                <FontAwesomeIcon icon={faProfile} color={'white'} fontSize={dims / 3}></FontAwesomeIcon>
                <span style={{ fontSize: dims / 3, paddingLeft: padding }}>{props.name}</span>
            </button>
        </div>
    );
}