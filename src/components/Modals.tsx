import { useState } from "react"
import { Modal } from "react-bootstrap"
import TZButton from "./TZButton"
import { Colors, padding } from "../lib/Constants"

type AlertButtonType = {
    text: string,
    color?: string,
    onClick?: () => any
}

export type AlertContentType = {
    title: string,
    text: string,
    buttons?: AlertButtonType[]
} | undefined

type AlertModalProps = {
    // visible: boolean,
    onHide: () => any,
    content: AlertContentType
}

export const AlertModal = (props: AlertModalProps) => {
    // console.log(props.content);

    const [closing, setClosing] = useState(false);


    const determineClose = () => {
        if (closing) return false;
        return props.content !== undefined
    }

    const onHide = () => setClosing(true);

    const buttons = props.content?.buttons;

    const AlertButton = (props: { v: AlertButtonType, index: number }) => {
        const [loading, setLoading] = useState(false);
        const [v, index] = [props.v, props.index];

        return (
            <>
                {index !== 0 ? <div style={{ width: padding }} /> : <></>}
                <TZButton loading={loading} title={v.text} backgroundColor={v.color} onClick={async () => {
                    setLoading(true);
                    if (v.onClick) {
                        await v.onClick().catch((e: Error) => { console.log(e); setLoading(false); });
                    }
                    setLoading(false);
                    onHide();
                }}></TZButton>
            </>
        )
    }

    return (
        <Modal centered show={determineClose()} onHide={onHide}
            // backdrop="static"
            // keyboard={false}
            onExited={() => {
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
                        buttons.map((v, index) => <AlertButton v={v} index={index} />
                        )
                        :
                        <TZButton title="Cancel" onClick={onHide} backgroundColor={Colors.red}></TZButton>
                    }
                </div>
            </Modal.Body>
        </Modal>
    )
}