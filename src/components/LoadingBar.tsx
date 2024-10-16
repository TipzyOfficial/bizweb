import { ProgressBar } from "react-bootstrap";
import { useInterval } from "../lib/utils";
import { useState } from "react";
import { radius } from "../lib/Constants";

export default function LoadingBar(props: { width: string | number | undefined, height?: string | number }) {
    const [meter, setMeter] = useState(0.3);
    const height = props.height ?? 15;

    useInterval(() => {
        const rand = Math.random();
        setMeter(meter + (1 - meter) / (rand * 2 + 2))
    }, Math.random() * 2000 + 3000, 1000)

    return (
        // <div style={{ width: props.width, borderRadius: radius, height: height, overflow: 'hidden', backgroundColor: "#fff3" }}>
        //     <div className="App-animated-gradient-fast" style={{ width: `${meter * 100}%`, height: height }} />
        // </div>
        <ProgressBar variant="tertiary" data-bs-theme={"dark"} animated now={meter * 100} style={{ width: props.width, height: height, borderRadius: radius }} />
    )
}