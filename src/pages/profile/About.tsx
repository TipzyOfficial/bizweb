import { useContext, useState, memo } from "react";
import { padding, radius } from "../../lib/Constants";
import { router } from "../../App";
import TZHeader from "../../components/TZHeader";
import "../../App.css"
import BackButton from "../../components/BackButton";

export default function About() {
    // const loc = useLocation();

    const handleBackClick = () => {
        router.navigate(-1);
    };

    return (
        <div className={"App-body-top"}>
            <TZHeader title="Contact Us" leftComponent={
                <BackButton onClick={handleBackClick}></BackButton>
            } />
            <div style={styles}>
                <span className="App-normaltext">Thanks for reaching out–we'd love to talk!</span>
                <br></br>
                <span className="App-normaltext">Have a question, need to dispute a transaction, or report a concern? Email us at <a href={"mailto:help@tipzy.app"}>help@tipzy.app</a></span>
                <br></br>
                <span className="App-normaltext">Want to report a bug? Please refer to this email: <a href={"mailto:bugs@tipzy.app"}>bugs@tipzy.app</a></span>
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
    height: "100%",
    width: "100%",
    maxWidth: "600px",
    margin: '0 auto',
    display: "flex",
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
};