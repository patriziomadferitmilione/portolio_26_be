export const tracks = [
  {
    id: "midnight-drive",
    title: "Midnight Drive",
    artist: "Patrizio Milione",
    mood: "Synthwave",
    duration: 231,
    visibility: "public",
    storageKey: "tracks/midnight-drive/master.mp3"
  },
  {
    id: "rome-after-rain",
    title: "Rome After Rain",
    artist: "Patrizio Milione",
    mood: "Ambient",
    duration: 274,
    visibility: "private",
    storageKey: "tracks/rome-after-rain/master.mp3"
  }
];

export function listTracks() {
  return tracks.map(({ storageKey, ...track }) => track);
}

export function findTrackById(trackId) {
  return tracks.find((track) => track.id === trackId) ?? null;
}
