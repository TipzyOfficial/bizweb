import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import { useFdim } from "../lib/Constants";

export function PlaybackButton(props: { icon: IconDefinition, onClick: () => any, disable?: boolean }) {
    const fdim = useFdim();
    const iconsize = fdim / 30;

    const [hovered, setHovered] = useState(0);

    return (
        <div onClick={() => {
            if (!props.disable) props.onClick();
        }} style={{ opacity: props.disable ? 1 : 1 - hovered * 0.5 }} onMouseDown={() => setHovered(1)} onMouseUp={() => setHovered(0.5)} onMouseEnter={() => setHovered(0.5)} onMouseLeave={() => setHovered(0)}>
            <FontAwesomeIcon fontSize={iconsize} icon={props.icon} />
        </div>
    )
}