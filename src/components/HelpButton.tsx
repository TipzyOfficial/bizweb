import { useState } from "react";
import { Colors, modalZ, padding } from "../lib/Constants";
import { Modal } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faQuestionCircle } from "@fortawesome/free-solid-svg-icons";


export default function HelpButton(props: { text: string }) {
    const [hovered, setHovered] = useState(false);
    const [visible, setVisible] = useState(false);


    const backButtonStyle: React.CSSProperties = {
        // position: 'absolute',
        // left: padding,
        paddingRight: padding,
        border: 'none',
        backgroundColor: 'transparent',
        color: hovered ? Colors.primaryRegular : 'white',
        fontSize: '16px',
        cursor: 'pointer',
        transition: 'color 0.3s ease',
    };

    return (
        <>
            <div style={backButtonStyle}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onClick={() => setVisible(true)}>
                <FontAwesomeIcon icon={faQuestionCircle}></FontAwesomeIcon>
            </div>
            <Modal style={{ zIndex: modalZ }} show={visible} onHide={() => setVisible(false)}>
                <Modal.Body>
                    {props.text}
                </Modal.Body>
            </Modal>
        </>
    );
}