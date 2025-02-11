import { useState } from "react";
import { Colors, padding, topBarZ } from "../lib/Constants";
import { PageType } from "../pages/bar/Dashboard";
import { isMobile } from "../lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { faCheck, faGear, faHome, faMoneyBill, faQuestionCircle } from "@fortawesome/free-solid-svg-icons";

const menuBarMobileHeight = 70;

function MenuButton(props: { page: PageType, currentPage: PageType, setPage: (s: PageType) => any }) {
    const [hover, setHover] = useState(1);

    const isCurrent = props.currentPage === props.page;

    return (
        <div style={{ padding: padding, opacity: isCurrent ? 1 : hover, cursor: 'pointer' }} onClick={() => props.setPage(props.page)} onMouseEnter={() => setHover(0.5)} onMouseLeave={() => setHover(1)}>
            <span style={{ fontWeight: isCurrent ? "bold" : undefined }}>{props.page}</span>
        </div>
    )
}

function MenuButtonMobile(props: { page: PageType, currentPage: PageType, setPage: (s: PageType) => any }) {
    const [hover, setHover] = useState(1);

    const isCurrent = props.currentPage === props.page;

    const pageIcon: IconProp =
        props.page === "Queue" ? faHome :
            props.page === "Requests" ? faCheck :
                props.page === "Settings" ? faGear :
                    props.page === "Finances" ? faMoneyBill :

                        props.page === "Account" ? faGear :
                            faQuestionCircle

    return (
        <div style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', cursor: 'pointer', height: menuBarMobileHeight }} onClick={() => props.setPage(props.page)} onMouseEnter={() => setHover(0.5)} onMouseLeave={() => setHover(1)}>
            <FontAwesomeIcon color={isCurrent ? Colors.primaryRegular : "white"} icon={pageIcon} />
        </div>
    )
}

export function MenuSelection(props: { currentPage: PageType, pages: PageType[], setPage: (s: PageType) => any }) {
    const pages = props.pages;
    return (
        <div style={{
            width: isMobile() ? "100%" : 170, backgroundColor: Colors.darkBackground,
            position: isMobile() ? 'sticky' : 'relative', top: isMobile() ? `calc( 100vh - ${menuBarMobileHeight}px )` : undefined, left: isMobile() ? 0 : undefined, zIndex: topBarZ
        }}>
            <div style={{ width: isMobile() ? "100%" : undefined, position: 'sticky', top: padding, display: 'flex', justifyContent: 'space-between', flexDirection: isMobile() ? 'row' : 'column', }}>
                {pages.map((p) =>
                    isMobile() ? <MenuButtonMobile page={p} currentPage={props.currentPage} setPage={props.setPage} />
                        : <MenuButton page={p} currentPage={props.currentPage} setPage={props.setPage} />
                )}
            </div>
        </div>
    )
}