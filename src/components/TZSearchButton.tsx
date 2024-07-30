import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass as faSearch } from '@fortawesome/free-solid-svg-icons'
import { Colors, padding, radius } from '../lib/Constants';

export default function TZSearchButton(props: { onClick: () => void, dims?: number }) {
    const [opacity, setOpacity] = React.useState(1);
    const dims = props.dims ?? 20;
    const fontSize = Math.max(Math.min(dims, 30), 15);
    return (
        <button style={{
            padding: padding, width: '100%', opacity: opacity,
            borderRadius: radius, borderWidth: 1, borderColor: "#888", backgroundColor: 'white',
        }} onPointerDown={() => {
            setOpacity(0.7);
            props.onClick();
        }}
            onPointerUp={() => {
                setOpacity(1);
            }}
        >
            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                <FontAwesomeIcon fontSize={fontSize * 0.8} icon={faSearch} color={"black"} />
                <span style={{
                    color: 'black', paddingLeft: padding, fontSize: fontSize,
                    fontFamily: 'Montserrat',
                    fontWeight: 500,
                }}>Request <span style={{
                    fontWeight: "bold",
                    color: "transparent",//Colors.primaryRegular,
                    // background: 'linear-gradient(to right, #ef5350, #f48fb1, #7e57c2, #2196f3, #26c6da, #43a047, #eeff41, #f9a825, #ff5722)',
                    backgroundImage: `linear-gradient(to right, ${Colors.primaryRegular}, ${Colors.secondaryDark})`,
                    backgroundClip: "text",
                    // WebkitBackgroundClip: 'text',
                    // WebkitTextFillColor: 'transparent',
                    //                     -webkit-background-clip: text;
                    //   -webkit-text-fill-color: transparent;
                    // textShadow: '0px 0px 5px rgba(250, 157, 23, 0.5)',
                    // textShadow: '0px 0px 5px rgba(0, 0, 0, 0.2)',
                    // color: Colors.secondaryRegular,
                    // textShadow: '0px 0px 5px rgba(213, 100, 139, 0.5)',

                }}>ANY SONG!</span></span>
            </div>
        </button>
    )
}

export function TZArtistSearchButton(props: { onClick: () => void, dims?: number }) {
    const [opacity, setOpacity] = React.useState(1);
    const dims = props.dims ?? 20;
    const fontSize = Math.max(Math.min(dims, 30), 15);
    return (
        <button style={{
            padding: padding, width: '100%', opacity: opacity,
            borderRadius: radius, borderWidth: 1, borderColor: "#888", backgroundColor: 'white',
        }} onPointerDown={() => {
            // setOpacity(0.7);
            props.onClick();
        }}
            onPointerUp={() => {
                setOpacity(1);
            }}
        >
            <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                <FontAwesomeIcon fontSize={fontSize * 0.8} icon={faSearch} color={"black"} />
                <span style={{
                    color: 'black', paddingLeft: padding, fontSize: fontSize,
                    fontFamily: 'Montserrat',
                    fontWeight: 500,
                }}>Find a song!</span>
            </div>
        </button>
    )
}

