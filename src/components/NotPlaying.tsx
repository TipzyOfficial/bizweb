import { padding, radius } from "../lib/Constants";

export default function NotPlaying() {
    return (
        <div style={{ padding: padding, backgroundColor: "#FFF1", borderRadius: radius, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {/* <span style={{ textAlign: 'center' }}>Start playing music on your streaming app to accept requests and view the queue!</span> */}
            <span style={{ textAlign: 'center' }}>Start playing music to accept requests and view the queue!</span>
        </div>
    )
}