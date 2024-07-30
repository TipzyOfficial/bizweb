import { ArtistType, PlayableType, SongType } from "./song";

export type BarType = {
  id: number; //bar's ID number in the database
  name: string; //name of bar
  type: string; //type of bar (dive bar, oyster bar, whatever)
  location?: string; //location of bar. ignore
  image_url?: string; //image background of bar
  description: string; //text description of the bar. format is <TIME>///<DAYS OPEN>///<DESCRIPTION>
  active: boolean; //whether the bar is taking requests right now
  allowingRequests: boolean;
  topArtists?: ArtistType[] //bar's top artists. 
  topSongs?: SongType[] //bar's top songs.
  vibe?: string // bar's vibe
}

export type LiveArtistType = {
  id: number;
  name: string;
  allowingRequests: boolean;
  instagramUrl?: string;
  spotifyUrl?: string;
  description?: string;
  image_url?: string;
  minPrice: number;
  // playables: PlayableType[];
}