import { useState } from "react"
import { Modal } from "react-bootstrap"
import TZButton from "./TZButton"
import { Colors, padding } from "../lib/Constants"

export type AlertContentType = {
    title: string,
    text: string,
    buttons?: {
        text: string,
        color?: string,
        onClick?: () => any
    }[]
} | undefined

type AlertModalProps = {
    // visible: boolean,
    onHide: () => any,
    content: AlertContentType
}

export const AlertModal = (props: AlertModalProps) => {
    console.log(props.content);

    const [closing, setClosing] = useState(false);


    const determineClose = () => {
        console.log("determining", closing)
        if (closing) return false;
        return props.content !== undefined
    }

    const onHide = () => setClosing(true);

    const buttons = props.content?.buttons;

    return (
        <Modal centered show={determineClose()} onHide={onHide}
            // backdrop="static"
            // keyboard={false}
            onExited={() => {
                console.log("setclosing false")
                setClosing(false);
                props.onHide();
            }}

            data-bs-theme={"dark"}>
            {/* <Modal.Title>
                {props.content?.title}
            </Modal.Title> */}
            <Modal.Body style={{ color: "white" }}>
                <div className="App-montserrat-normaltext" style={{ fontWeight: 'bold', paddingBottom: padding }}>
                    {props.content?.title}
                </div>
                <div className="App-smalltext">
                    {props.content?.text}
                </div>
                <div style={{ display: 'flex', paddingTop: padding }}>
                    {buttons ?
                        buttons.map((v, index) =>
                            <>
                                {index !== 0 ? <div style={{ width: padding }} /> : <></>}
                                <TZButton title={v.text} backgroundColor={v.color} onClick={() => {
                                    if (v.onClick) v.onClick();
                                    onHide();
                                }}></TZButton>
                            </>)
                        :
                        <TZButton title="Cancel" onClick={onHide} backgroundColor={Colors.red}></TZButton>
                    }
                </div>
            </Modal.Body>
        </Modal>
    )
}