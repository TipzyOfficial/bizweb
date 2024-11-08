import { Colors, padding } from "../lib/Constants";


export default function TZHeader(props: { title?: string, leftComponent?: JSX.Element, rightComponent?: JSX.Element, backgroundColor?: string, zIndex?: number }) {
    return (
        <div className="App-headertop"
            style={{
                position: 'sticky',
                top: 0,
                paddingTop: padding,
                paddingBottom: padding,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexDirection: 'row',
                width: '100%',
                backgroundColor: props.backgroundColor ?? Colors.background + "cc",
                zIndex: props.zIndex ?? 10,
            }}>
            <div style={{ flex: 1, paddingTop: padding }}>
                {props.leftComponent ?? <div></div>}
            </div>
            {props.title ? <span className="App-headertitleoneline" style={{ flexShrink: 4, textAlign: "center", paddingLeft: 5, paddingRight: 5, fontSize: props.title.length > 20 ? "calc(10px + 2vmin)" : undefined }}>{props.title}</span> : <></>}
            <div style={{ flex: 1, justifyContent: 'flex-end', display: 'flex' }}>
                {props.rightComponent ?? <div></div>}
            </div>
        </div>
    );
}