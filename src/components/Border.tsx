import { padding } from "../lib/Constants";

export default function Border() {
    return (
        <div style={{ paddingTop: padding / 2, paddingBottom: padding / 2 }}>
            <div style={{ height: 1, width: "100%", backgroundColor: "#fff2", }} />
        </div>
    )
}