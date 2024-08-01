import { useContext, useState, memo, useEffect } from "react";
import { Colors, padding, radius } from "../../lib/Constants";
import { UserSessionContext } from "../../lib/UserSessionContext";
import TZButton from "../../components/TZButton";
import { Logout, fetchWithToken } from "../..";
import { router } from "../../App";
import TZHeader from "../../components/TZHeader";
import "../../App.css"
import { Cookie } from "universal-cookie";
import useWindowDimensions from "../../lib/useWindowDimensions";
import BackButton from "../../components/BackButton";
import TZProfileComponent from "../../components/TZProfileComponent";
import { DisplayOrLoading } from "../../components/DisplayOrLoading";
import { Spinner } from "react-bootstrap";
import { getCookies } from "../../lib/utils";

const ProfileTop = memo(function ProfileItem(props: { title: string, value: string, profilePic?: string, email: string, onClick?: () => void }) {
    //overriding default CSS properties by initializing within the function
    const defaultProfile: React.CSSProperties = {
        width: "100px",
        height: "100px",
        background: 'linear-gradient(0deg, #c76b89, #d38932)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: "30px",
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    };

    return (
        <div style={{ padding: padding, width: "100%", display: "flex", alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', display: "flex", justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
                <div style={{ borderRadius: "50%" }}>
                    {props.profilePic ? (
                        <img src={props.profilePic} alt="Profile" style={{ borderRadius: "50%" }} ></img>)
                        :
                        (<div style={defaultProfile}>{getInitials(props.value)}</div>)
                    }
                </div>
                <div style={{ padding: padding, display: 'flex', flexDirection: 'column', alignItems: 'start', justifyContent: 'center', }}>
                    <span className="App-subtitle" style={{ padding: padding, paddingBottom: 0, display: 'flex' }}>
                        {props.value}
                    </span>
                    <span style={{ padding: padding, paddingTop: 0, color: "#888" }}>{props.email}</span>
                </div>
            </div>
        </div >
    );
}
);

type CardDetailsType = {
    brand: string,
    last4: string,
    expMonth: number,
    expYear: number,
}

export default function Account() {
    const usc = useContext(UserSessionContext)
    const user = usc.user;
    const [details, setDetails] = useState<CardDetailsType | undefined>();
    const [cdReady, setCdReady] = useState(false);

    async function getCardDetails() {
        const deets = await fetchWithToken(usc, `get_saved_card_details/`, 'GET').then((r) => r.json()).then((json) => {
            const d = json.card_details;

            if (d === 'N/A') return undefined;

            console.log(json)

            return { brand: d.brand, last4: d.last4, expMonth: d.exp_month, expYear: d.exp_year }
        }).catch(() => { console.log("can't find payment details"); return undefined })

        setDetails(deets);
        setCdReady(true);
    }

    useEffect(() => {
        if (user.user.access_token === "") {
            Logout(usc, undefined, true);
            return;
        }
        getCardDetails();
    }, [])

    function DeleteAccount() {
        alert('If you wish to delete your account, please reach out to us in the "Contact Us" section.')

        // const mr = Math.random() * 1000000;
        // const letters = ["L", "E", "S", "G", "T", "P", "Z", "Y", "B", "A"]
        // const r = letters[(Math.floor(mr) % 10)] + letters[(Math.floor(mr / 10) % 10)] + (mr).toString().substring(0, 5);
        // const s = prompt(
        //     `WARNING: You're about to permanently delete your account and all your data. This action is NOT REVERSIBLE and your transactions WILL NOT be refunded. ${"\n\n"} If you still want to continue, enter "${r}" below.`,
        // )
        // if (s === r) {
        //     fetchWithToken(usc, `tipper/`, 'DELETE').then(r => {
        //         console.log("deleting acc...");
        //         Logout(usc, undefined, true);
        //     }).catch((e) => { alert(`Error: Problem deleting account: ${e}. Please try again later.`) })
        // } else {
        //     alert("Account not deleted. You didn't enter in the right code.")
        // }
    }

    const handleBackClick = () => {
        router.navigate(-1);
    };

    const handlePaymentDetails = () => {
        router.navigate("/payments");
    };

    const handleInvoices = () => {
        router.navigate("/invoices");
    };

    const handleAboutClick = () => {
        router.navigate("/contact-us");
    };


    return (
        <div className={"App-body-top"}>
            <TZHeader title="" leftComponent={
                <BackButton onClick={handleBackClick}></BackButton>
            } />
            <div style={styles}>
                <div>
                    <div style={{ paddingBottom: padding / 2 }}>
                        <ProfileTop title="Name" value={user.user.name} profilePic={user.user.image} email={user.user.email} />

                        {/* <span className="App-tertiarytitle">Your Information</span> */}
                    </div>
                    <div style={{ paddingBottom: padding / 2 }}>
                        <span className="App-tertiarytitle">About</span>
                    </div>
                    <TZProfileComponent text="Contact Us" onClick={handleAboutClick}></TZProfileComponent>
                    <TZProfileComponent text="Privacy Policy" onClick={handleAboutClick}></TZProfileComponent>
                    <div style={{ padding: padding * 4 }} />
                    <TZProfileComponent text="Log out"
                        selectedBackgroundColor={Colors.secondaryRegular}
                        borderColor={Colors.secondaryRegular + "88"}
                        color={Colors.secondaryRegular}
                        // selectedTextColor=""
                        onClick={() => {
                            console.log("logging out...");
                            Logout(usc, undefined, true)
                        }}></TZProfileComponent>
                    <TZProfileComponent text="Delete account"
                        selectedBackgroundColor={Colors.secondaryDark}
                        borderColor={Colors.secondaryDark + "88"}
                        color={Colors.secondaryDark}
                        // selectedTextColor=""
                        onClick={DeleteAccount}></TZProfileComponent>
                </div>
                {/* <div style={{ position: "absolute", bottom: padding, width: Math.min(600 - padding * 2, useWindowDimensions().width - padding * 2) }}>


                    <TZButton title={"Delete account"} backgroundColor={Colors.background} color={Colors.secondaryDark} onClick={DeleteAccount}></TZButton> 
                </div> */}
            </div>
        </div>
    )
};

// Function to extract initials from a name
const getInitials = (name: string) => {
    const names = name.split(' ');
    const initials = names.map(name => name.charAt(0).toUpperCase()).join('');
    return initials.substring(0, 2);
};

const styles: React.CSSProperties = {
    paddingRight: padding,
    paddingLeft: padding,
    display: 'flex',
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
    width: "100%",
    maxWidth: "600px",
    margin: '0 auto'
};