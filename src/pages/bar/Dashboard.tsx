import { Spinner } from "react-bootstrap";
import { DisplayOrLoading } from "../../components/DisplayOrLoading";
import { Colors } from "../../lib/Constants";
import { useContext, useState } from "react";
import { UserSessionContext } from "../../lib/UserSessionContext";
import ProfileButton from "../../components/ProfileButton";


const LoadingScreen = () =>
    <div className="App-header">
        <Spinner style={{ color: Colors.primaryRegular, width: 75, height: 75 }} />
        <br></br>
        <span>Loading bar information...</span>
    </div>;

export default function Dashboard() {

    const usc = useContext(UserSessionContext);
    const bar = usc.user;

    const [ready, setReady] = useState(true);

    return (
        <DisplayOrLoading condition={ready} loadingScreen={<LoadingScreen />}>
            <div className="App-body-top">
                <ProfileButton></ProfileButton>
                hi
            </div>
        </DisplayOrLoading>
    )
}