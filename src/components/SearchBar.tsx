import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useWindowDimensions from "../lib/useWindowDimensions";
import { useState } from "react";
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { padding, radius, smallPadding } from "../lib/Constants";

export default function SearchBar(props: { onClick: () => any }) {
    const window = useWindowDimensions();
    const [hovered, setHovered] = useState(false);
    return (
        <div onClick={props.onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ padding: smallPadding, fontSize: 15, backgroundColor: hovered ? "#FFF2" : "#FFF1", borderRadius: radius * 2, display: 'flex', justifyContent: 'flex-start', alignItems: 'center', cursor: 'pointer' }}>
            <FontAwesomeIcon icon={faMagnifyingGlass} />
            <span style={{ textAlign: 'center', color: "#fffa", paddingLeft: padding, paddingRight: padding, minWidth: Math.min(500, window.width / 3), textAlignLast: 'left' }}>Add a song to queue...</span>
        </div>
    )
}