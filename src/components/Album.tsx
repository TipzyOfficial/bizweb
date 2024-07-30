import { padding } from "../lib/Constants";
import { AlbumType, ArtistType } from "../lib/song";
import './Artist.css'

export default function Album(props: {album: AlbumType, dims: number, onClick?: () => void}){
    const dims = props.dims;

    return (
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: dims}} onClick={props.onClick}>
            {props.album.albumart === "" ? 
            <div style={{height: dims, width: dims, borderRadius: dims, backgroundColor: "#888"}}></div>
            : <img src={props.album.albumart} alt={props.album.title} style={{height: dims, width: dims, objectFit: "cover"}}/>}
            <div style={{width: "100%", paddingTop: 3}}>
                <span className="threelinetext"  style={{fontSize: Math.max(dims/10, 12), color: "white", fontWeight: 'bold'}}>
                    {props.album.title}
                </span>
                <span className="threelinetext"  style={{fontSize: Math.max(dims/10, 12), color: "#888",}}>
                    {props.album.year}
                </span>
            </div>
        </div>
    )
}

export const albumCompare = (a:AlbumType,b: AlbumType) => {return (parseInt(b.year) - parseInt(a.year))}
