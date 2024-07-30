import { Colors, padding, radius } from "../lib/Constants";
import '../App.css'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import { faCircle as faNoti } from "@fortawesome/free-solid-svg-icons";


const ToggleTab = (props: {
    labels: Array<string> | Array<{ label: string, noti: number }>,
    value: number, setValue: (value: number) => void
}) => {

    const v = props.value;
    const sv = props.setValue;
    const backgroundColor = "#2D2D32";
    const activeColor = Colors.secondaryDark;

    const ToggleComponent = (props: { label: string, value: number, noti?: number }) => {
        const noti = props.noti ? (props.noti === 0 ? undefined : props.noti) : undefined;

        return (
            <div style={{
                boxShadow: props.value === v ? '0px 0px 10px rgba(23, 23, 30, 0.9)' : 'none',
                flex: 1,
                display: "flex",
                justifyContent: 'center',
                borderRadius: radius,
            }}>
                <button style={{
                    flex: 1,
                    padding: 8,
                    backgroundColor: props.value === v ? activeColor : "#0000",
                    zIndex: props.value === v ? 1 : 0,
                    borderRadius: radius,
                    color: 'white',
                    borderWidth: 0,
                    transition: 'background-color ease 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
                    onClick={() => sv(props.value)}
                >
                    <span className="App-toggletitle">{props.label}</span>
                    <div style={{ paddingLeft: padding / 2 }}></div>
                    {noti ? <div><div style={{ padding: 2, borderRadius: 100, backgroundColor: Colors.primaryRegular, minWidth: 30, minHeight: 30 }}>{noti > 99 ? "99+" : noti}</div></div> : <></>}
                </button>
            </div>

        );
    }

    return (
        <div style={{ width: '100%' }}>
            <div style={{
                width: '100%',
                backgroundColor: backgroundColor,
                borderRadius: radius,
                display: "flex",
                overflow: 'hidden'
            }}>
                {props.labels.map((e, i) => {
                    if (typeof e === 'string') return <ToggleComponent label={e} value={i} key={e + "i" + i} />
                    return <ToggleComponent label={e.label} noti={e.noti} value={i} key={e.label + "i" + i} />
                })}
            </div>
        </div>
    )
}

export default ToggleTab;