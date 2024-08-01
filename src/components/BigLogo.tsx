import FullLogo from '../assets/Tipzy_Full_Orange.png'
import { padding } from '../lib/Constants';

function BigLogo() {
    return (
        <img src={FullLogo} style={{ width: "100%", minWidth: 200, maxWidth: 300, objectFit: 'contain' }} alt={"tipzy full logo"}></img>
    )
}

export function SmallLogo() {
    return (
        <img src={FullLogo} style={{ height: padding * 2, objectFit: 'contain' }} alt={"tipzy full logo"}></img>
    )
}



export default BigLogo;