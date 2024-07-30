import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { padding } from "../lib/Constants";
import { ArtistType } from "../lib/song";
import './Artist.css'
import { faUserAlt as faArtist } from "@fortawesome/free-solid-svg-icons";

export default function Artist(props: { artist: ArtistType, dims: number, onClick?: () => void }) {
    const dims = props.dims;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={props.onClick}>
            {props.artist.image === "" || !props.artist.image ?
                <div style={{ height: dims, width: dims, borderRadius: dims, backgroundColor: "#888", display: 'flex', justifyContent: 'center', alignItems: 'center' }}><FontAwesomeIcon color={"#fff8"} fontSize={dims / 3} icon={faArtist}></FontAwesomeIcon></div>
                : <img src={props.artist.image} alt={props.artist.name} style={{ height: dims, width: dims, borderRadius: dims, objectFit: "cover" }} />}
            <span className="text" style={{ fontSize: Math.max(dims / 8, 15), color: "white", fontWeight: 'bold', textAlign: 'center' }}>
                {props.artist.name}
            </span>
        </div>
    )
}