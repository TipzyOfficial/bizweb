import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Spinner } from "react-bootstrap";
import { faChevronDown as faDown, faChevronUp as faUp, } from "@fortawesome/free-solid-svg-icons";
import { padding } from "../lib/Constants";
import { useState } from "react";
import { useCallbackRef } from "../lib/utils";

const ExpandHeader = (props: { children?: JSX.Element, zI: number, onClick?: () => void, expanded?: boolean, loading?: boolean, text: string, height: number, initialValue?: boolean, scrollToPosition?: boolean }) => {
    const [expanded, setExpanded] = useState(props.initialValue ?? false);

    const [content, contentRef] = useCallbackRef<HTMLDivElement>();

    const defaultOnClick = () => {
        if (!expanded) {
            if (props.scrollToPosition) {
                console.log("content", (content?.offsetTop ?? 0) - props.height)
                window.scrollTo({ top: (content?.offsetTop ?? 0) - props.height })
            }
        }
        setExpanded(!expanded);
    }

    return (
        <>
            <div onClick={props.onClick ?? defaultOnClick}
                style={{
                    width: "100%",
                    boxShadow: '0px 5px 5px rgba(23, 23, 30, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    backgroundColor: "#292935",
                    padding: padding,
                    position: 'sticky',
                    top: props.height - 1,
                    float: "left",
                    zIndex: props.zI,

                }}>
                <span className="App-tertiarytitle">{props.text}</span>
                <div style={{ paddingLeft: 5 }}>
                    {props.loading ?
                        <Spinner size={"sm"}></Spinner>
                        : ((props.expanded ?? expanded) ?
                            <FontAwesomeIcon className="App-tertiarytoggle" icon={faUp}></FontAwesomeIcon>
                            :
                            <FontAwesomeIcon className="App-tertiarytoggle" icon={faDown}></FontAwesomeIcon>
                        )}
                </div>
            </div>
            <div ref={contentRef} style={{ width: '100%' }}>
                {(!props.loading && (props.expanded ?? expanded)) ? props.children : <></>}
            </div>
        </>
    )
}

export default ExpandHeader;
