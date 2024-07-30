import { useState } from "react";
import { Colors, padding, radius } from "../lib/Constants";

export default function TZProfileComponent(props: { text: string, onClick: () => void, color?: string, borderColor?: string, selectedBackgroundColor?: string, selectedTextColor?: string }) {
    const [isHovered, setIsHovered] = useState(false);
    const profileButton: React.CSSProperties = {
        fontWeight: 'bold',
        width: '100%',
        borderRadius: radius,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isHovered ? (props.selectedBackgroundColor ?? Colors.primaryRegular) : 'transparent',
        borderColor: isHovered ? "#8880" : (props.borderColor ?? "#8888"),
        borderWidth: 1,
        borderStyle: "solid",
        padding: padding,
        color: isHovered ? props.selectedTextColor ?? '#1B242E' : props.color ?? 'white',
        cursor: 'pointer',
        transition: 'background-color 0.3s ease, color 0.3s ease'
    };
    return (
        <>
            <div style={profileButton}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={props.onClick}>
                <span className="App-tertiarytitle">{props.text}</span>
            </div>
            <div style={{ paddingBottom: padding }} />
        </>
    );
}