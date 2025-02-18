import { useState } from 'react';
import { Colors, padding, radius } from '../lib/Constants';
import { Spinner } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle as faSuccess, faXmarkCircle as faFailure } from '@fortawesome/free-solid-svg-icons';

type TZButtonProps = {
    onClick?: () => void,
    style?: React.CSSProperties,
    title?: string,
    backgroundColor?: string,
    width?: number | string,
    disabled?: boolean,
    fontSize?: number | string,
    color?: string,
    loading?: boolean,
    completed?: boolean,
    leftComponent?: JSX.Element,
    brandingFont?: boolean,
}

function TZButton(props: TZButtonProps) {
    const [opacity, setOpacity] = useState(1);

    return (
        <button
            disabled={props.disabled || props.loading || props.completed}
            onClick={() => { if (!props.disabled && props.onClick) props.onClick() }}
            onPointerLeave={() => {
                setOpacity(1);
            }}
            onPointerEnter={() => {
                setOpacity(0.85);
            }}
            onPointerDown={() => {
                setOpacity(0.5);
            }}
            onPointerUp={() => {
                setOpacity(1);
            }}
            style={{
                padding: padding,
                backgroundColor: props.backgroundColor ?? Colors.secondaryDark,
                display: 'flex',
                justifyContent: 'center', alignItems: 'center',
                borderRadius: radius,
                width: props.width ?? "100%",
                boxSizing: "border-box",
                WebkitBoxSizing: "border-box",
                MozBoxSizing: "border-box",
                opacity: props.disabled ? 0.5 : props.completed || props.loading ? 1 : opacity,
                border: 'none',
                ...props.style
            }}>
            {props.completed !== undefined ?
                <FontAwesomeIcon icon={props.completed ? faSuccess : faFailure} fontSize={props.fontSize} color={props.color ?? "white"}></FontAwesomeIcon>
                :
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {props.leftComponent ?? <></>}
                    <span className={`${props.brandingFont ? "App-montserrat-smallertext" : "App-tertiarytitle"}`} style={{ color: props.color ?? "white", fontWeight: props.brandingFont ? "bold" : 500, fontSize: props.fontSize }}>{props.title ?? ""}</span>
                    {props.loading ? <div style={{ paddingLeft: 5 }}><Spinner style={{ color: props.color, paddingTop: 3 }} size='sm' ></Spinner></div> : <></>}
                </div>
            }

        </button>
    )
}

export default TZButton;