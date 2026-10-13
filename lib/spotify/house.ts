import { parseSpotifyRef, type SpotifyRef } from './refs';

// The Cavern's own playlists, from the Misfits Cavern Spotify account. They head
// the player's list for everyone; a project's references and the listener's
// own playlists follow.
const HOUSE = [
  { name: 'The Trophy', url: 'https://open.spotify.com/playlist/5l43HDI8tByYgidQJ4Nfzz' },
  { name: 'Misfits Cavern', url: 'https://open.spotify.com/playlist/79HohMGeX0HuPvtaQDVwgN' },
  { name: 'Misfits Too', url: 'https://open.spotify.com/playlist/76529bfVFUIK9znlxPXw5W' },
  { name: 'Solitude', url: 'https://open.spotify.com/playlist/3iFM46jnAkoQmsucygQMas' },
] as const;

export interface HousePlaylist { name: string; ref: SpotifyRef }

export const HOUSE_PLAYLISTS: HousePlaylist[] = HOUSE.flatMap((p) => {
  const ref = parseSpotifyRef(p.url);
  return ref ? [{ name: p.name, ref }] : [];
});
