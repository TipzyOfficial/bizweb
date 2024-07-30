import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Colors, padding } from "../lib/Constants";
import { router } from "../App";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import ProfileButton from "./ProfileButton";
import { LegacyRef } from "react";

/** wrap it with this div
 <div
            ref={props.ref}
            style={{
                flex: 1, alignSelf: "stretch", display: "flex", alignItems: 'center', backgroundColor: topBarColor, position: 'fixed', top: 0, zIndex: 20, width: "100%",
                WebkitBackdropFilter: 'blur(5px)',
                backdropFilter: 'blur(5px)',
            }}>

    </div>

*/

export default function TopBar(props: { ref?: LegacyRef<HTMLDivElement> }) {
    return (
        <>
            <div style={{
                flex: 1,
                display: 'flex', alignItems: 'center',
                padding: padding,
                cursor: 'pointer',
                // opacity: 0.8,
            }} onClick={() => router.navigate('/code')}>
                <FontAwesomeIcon className="App-backarrow" icon={faArrowLeft} ></FontAwesomeIcon>
                {/* <span className="App-tertiarytitle" style={{paddingLeft: 5}}>Exit</span> */}
            </div>
            <div style={{ flex: 2, justifyContent: 'flex-end', display: 'flex' }}>
                <ProfileButton style={{ position: 'relative', top: undefined, right: undefined, padding: padding / 2 }} />
            </div>
        </>
    )

}