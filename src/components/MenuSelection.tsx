import { useState } from "react";
import { Colors, padding } from "../lib/Constants";
import { PageType } from "../pages/bar/Dashboard";

function MenuButton(props: { page: PageType, currentPage: PageType, setPage: (s: PageType) => any }) {
    const [hover, setHover] = useState(1);

    const isCurrent = props.currentPage === props.page;

    return (
        <div style={{ padding: padding, opacity: isCurrent ? 1 : hover, cursor: 'pointer' }} onClick={() => props.setPage(props.page)} onMouseEnter={() => setHover(0.5)} onMouseLeave={() => setHover(1)}>
            <span style={{ fontWeight: isCurrent ? "bold" : undefined }}>{props.page}</span>
        </div>
    )
}

export function MenuSelection(props: { currentPage: PageType, pages: PageType[], setPage: (s: PageType) => any }) {
    const pages = props.pages;
    return (
        <div style={{ width: 170, backgroundColor: Colors.darkBackground, display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ position: 'sticky', top: padding }}>
                {pages.map((p) =>
                    <MenuButton page={p} currentPage={props.currentPage} setPage={props.setPage} />
                )}
            </div>
        </div>
    )
}