import { useState } from "react";
import { Colors, padding } from "../lib/Constants";


export default function BackButton(props: {onClick: () => void}){
    const [isBackButtonHovered, setIsBackButtonHovered] = useState(false);

    const backButtonStyle: React.CSSProperties = {
        // position: 'absolute',
        // left: padding,
        paddingLeft: padding,
        border: 'none',
        backgroundColor: 'transparent',
        color: isBackButtonHovered ? Colors.primaryRegular : 'white',
        fontSize: '16px',
        cursor: 'pointer',
        transition: 'color 0.3s ease',
    };

    return (
    <div style={backButtonStyle}
        onMouseEnter={() => setIsBackButtonHovered(true)}
        onMouseLeave={() => setIsBackButtonHovered(false)}
        onClick={props.onClick}>
        Back
    </div>
    );
}