import { memo, useCallback, useContext, useEffect, useState } from "react";
import { UserSessionContext } from "../../../lib/UserSessionContext";
import useWindowDimensions from "../../../lib/useWindowDimensions";
import { router } from "../../../App";
import { AlbumType, ArtistType, SongType } from "../../../lib/song";
import { padding, useFdim } from "../../../lib/Constants";
import TZHeader from "../../../components/TZHeader";
import { useLocation, useSearchParams } from "react-router-dom";
import { NotFoundPage } from "../NotFoundPage";
import { DisplayOrLoading } from "../../../components/DisplayOrLoading";
import { ScrollMenu } from 'react-horizontal-scrolling-menu';
import Album from "../../../components/Album";
import BackButton from "../../../components/BackButton";
import FlatList from "flatlist-react/lib";
import { getCookies } from "../../../lib/utils";

export default function Albums() {
  const usc = useContext(UserSessionContext);
  //   const [albums, setAlbums] = useState<AlbumType[] | undefined>([]);
  const loc = useLocation();
  const albums: AlbumType[] | undefined = loc.state ? (loc.state.albums ?? [undefined]) : undefined;

  const cookies = getCookies();
  const barID: number | undefined = usc.barState.bar ? usc.barState.bar.id : cookies.get("bar_session");
  const wdim = useWindowDimensions();
  const fdim = useFdim();
  const songDims = fdim ? Math.max(Math.min(fdim / 10, 75), 50) : 50;
  const albumDims = fdim ? Math.max(Math.min(fdim / 4, 200), 100) : 120;

  // console.log("idname", artistID, artistName);

  useEffect(() => {

  }, [])

  if (!barID || !albums) {
    return <NotFoundPage body="It appears we lost track of the bar you're in. Sorry!" backPath={"/code"} />
  }

  function handleBackClick() {
    router.navigate(-1);
  }

  const maxSupport = Math.floor((wdim.width) / (albumDims + padding));

  console.log(maxSupport);
  //(albumDims + padding*2) * maxSupport - padding
  return (
    <div className={"App-body-top"}>
      <TZHeader title={"Albums"}
        leftComponent={
          <BackButton onClick={handleBackClick}></BackButton>
        }
      />
      <div style={{ width: '100%', justifyContent: 'center', display: 'flex' }}>
        <div style={{ paddingLeft: padding, width: (albumDims + padding * 2) * maxSupport - padding * 2, justifyContent: 'center' }}>
          <div style={{ paddingBottom: padding * 2, alignItems: 'center' }}>
            <FlatList
              list={albums}
              display={{
                grid: true,
                gridMinColumnWidth: `${albumDims + padding}px`,
                gridGap: "0px",
                row: true,
              }}
              renderItem={(e, id) => <div style={{ height: albumDims * 1.65 }}><Album album={e} key={e.id + "_" + id} dims={albumDims} onClick={() => router.navigate("/search/album", { state: { album: e } })}></Album></div>}
            />
          </div>
        </div>
      </div>
    </div>
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