import { memo, useCallback, useContext, useEffect, useState } from "react";
import { UserSessionContext } from "../../../lib/UserSessionContext";
import useWindowDimensions from "../../../lib/useWindowDimensions";
import { router } from "../../../App";
import { AlbumType, ArtistType, SongType } from "../../../lib/song";
import Song, { SongList, SongRenderItem } from "../../../components/Song";
import { Colors, padding, useFdim } from "../../../lib/Constants";
import TZHeader from "../../../components/TZHeader";
import { useLocation, useSearchParams } from "react-router-dom";
import { NotFoundPage } from "../NotFoundPage";
import { DisplayOrLoading } from "../../../components/DisplayOrLoading";
import { Spinner } from "react-bootstrap";
import { ScrollMenu } from 'react-horizontal-scrolling-menu';
import Album from "../../../components/Album";
import BackButton from "../../../components/BackButton";
import { getCookies } from "../../../lib/utils";
import { fetchNoToken } from "../../../lib/serverinfo";

const LoadingScreen = () =>
  <div className="App-header">
    <Spinner style={{ color: Colors.primaryRegular, width: 75, height: 75 }} />
    <br></br>
    <span>Loading artist information...</span>
  </div>;

export default function ArtistInfo() {
  const usc = useContext(UserSessionContext);

  const [searchParams] = useSearchParams();
  const [ready, setReady] = useState(false);
  const [albums, setAlbums] = useState<AlbumType[] | undefined>([]);
  const [topSongs, setTopSongs] = useState<SongType[] | undefined>([]);

  const loc = useLocation();

  const artist: ArtistType = loc.state ? (loc.state.artist ?? { id: "", name: "", image: "" }) : { id: "", name: "", image: "" };

  const artistID = artist.id;
  const artistName = artist.name;
  const cookies = getCookies();
  const barID: number | undefined = usc.barState.bar ? usc.barState.bar.id : cookies.get("bar_session");
  const fdim = useFdim();
  const songDims = fdim ? Math.max(Math.min(fdim / 10, 75), 50) : 50;
  const albumDims = fdim ? Math.max(Math.min(fdim / 2.9, 200), 50) : 120;

  // console.log("idname", artistID, artistName);

  const TSMemo = memo(SongList, () => true);

  async function fetchArtist(id: string): Promise<ArtistType | undefined> {
    if (!barID) return;
    if (!artistName) return;

    await fetchNoToken(`tipper/artist/?business_id=${barID}&artist_id=${artistID}`, "GET")
      .then(r => r.json())
      .then(json => {
        const data = json.data;
        const albumdata = data.albums;
        const topsongs = data.top_songs;
        const albums: AlbumType[] = [];

        console.log("data", data);

        const songs: SongType[] = [];
        topsongs.forEach((e: any) =>
          songs.push({ title: e.name, artists: e.artists, albumart: e.images?.thumbnail ?? "", albumartbig: e.images?.teaser ?? "", id: e.id, explicit: e.explicit })
        );
        albumdata.forEach((e: any) => {
          const d = new Date(e.release_date);
          albums.push({ title: e.name, artists: [artist.name], albumart: e.images?.teaser ?? "", id: e.album_id, year: d.getFullYear().toString() ?? "No year" })
        });
        setTopSongs(songs.splice(0, 5));
        setAlbums(albums);
      })
      .catch((e: Error) => console.log(`Error: ${e.message}`));
  }

  useEffect(() => {
    if (!artistID) { setReady(true); return; }
    fetchArtist(artistID).then(() => {
      setReady(true);
    });

  }, [])

  if (!artistID) {
    return <NotFoundPage body="We can't seem to find that artist." backPath={"/bar"} />
  }

  function handleBackClick() {
    router.navigate("/bar");
  }

  return (
    <DisplayOrLoading condition={ready} loadingScreen={<LoadingScreen />}>
      {!topSongs || !albums ? <NotFoundPage body="We can't seem to find that artist." backPath={-1} /> :
        <div className={"App-body-top"}>
          <TZHeader title={artistName ?? "No artist"}
            leftComponent={
              <BackButton onClick={handleBackClick}></BackButton>
            }
          />
          <div style={{ width: '100%', paddingBottom: padding * 2 }}>
            <div style={{ width: '100%', padding: padding }}>
              <div style={{ paddingBottom: padding, width: '100%' }}>
                <span className='App-artistsubtitle'>Popular</span>
              </div>
              <div style={{ width: '100%' }}>
                <TSMemo songs={topSongs} dims={songDims} logoutData={{ artist: artist }}></TSMemo>
              </div>
              <div style={{ paddingBottom: 0, paddingTop: padding, width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className='App-artistsubtitle'>Albums</span>
                <span className='App-tertiarytitle' style={{ color: Colors.primaryRegular, cursor: 'pointer' }} onClick={() => router.navigate("/search/albums", { state: { albums: albums } })}>See more</span>
              </div>
            </div>
            <ScrollMenu>
              {albums.map((e, index) => (
                <div style={{ opacity: 1, paddingLeft: padding }}>
                  <Album album={e} dims={albumDims} key={"i" + index} onClick={() => router.navigate(`/search/album`, { state: { album: e } })}></Album>
                </div>
              ))}
            </ScrollMenu>
          </div>
        </div>}
    </DisplayOrLoading>
  )
}
const bodyStyles: React.CSSProperties = {
  paddingRight: padding,
  paddingLeft: padding,
  width: "100%",
  maxWidth: "600px",
  margin: '0 auto'
};
const headerTitleStyle: React.CSSProperties = {
  flexGrow: 1,
  textAlign: 'center',
  fontSize: '24px',
  color: 'white',
  fontWeight: 'bold',
};