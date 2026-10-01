export function trackKey(track) {
  if (!track) return '';
  return track.ytId || track.filePath || track.id || '';
}

export function sameTrack(a, b) {
  if (!a || !b) return false;
  if (trackKey(a) && trackKey(a) === trackKey(b)) return true;
  if (a.filePath && b.filePath && a.filePath === b.filePath) return true;
  if (a.id && b.id && a.id === b.id) return true;
  return false;
}

export function isLocal(track) {
  return Boolean(track && track.filePath);
}

export function formatDuration(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// Albums are derived, never stored: group the offline library by the ID3
// album + artist tags so the same album page works with no extra metadata.
export function groupAlbums(tracks = []) {
  const map = new Map();
  for (const t of tracks) {
    const album = (t.album || '').trim() || 'Unknown Album';
    const artist = (t.artist || '').trim() || 'Unknown Artist';
    const key = `${artist.toLowerCase()}::${album.toLowerCase()}`;
    if (!map.has(key)) {
      map.set(key, { key, name: album, artist, tracks: [], cover: t.cover || t.thumbnail || '', duration: 0, year: t.year || 0 });
    }
    const entry = map.get(key);
    entry.tracks.push(t);
    entry.duration += t.duration || 0;
    if (!entry.cover && (t.cover || t.thumbnail)) entry.cover = t.cover || t.thumbnail;
    if (!entry.year && t.year) entry.year = t.year;
  }
  const albums = [...map.values()];
  albums.forEach((a) => a.tracks.sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0)));
  albums.sort((a, b) => a.name.localeCompare(b.name));
  return albums;
}

// Online album discovery works the other way round: yt-search gives us flat
// videos with no album field, so group them by the streamed album metadata as it
// arrives. Until a video is enriched it falls back to grouping under its
// uploader, which is why these results are marked `provisional`.
export function groupSearchResults(tracks = []) {
  const map = new Map();
  for (const t of tracks) {
    const hasAlbum = Boolean(t.album && t.album.trim());
    const artist = (t.artist || '').trim() || 'Unknown Artist';
    const album = hasAlbum ? t.album.trim() : `${artist} — Singles`;
    const key = `${artist.toLowerCase()}::${album.toLowerCase()}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        name: album,
        artist,
        tracks: [],
        cover: t.thumbnail || t.cover || '',
        duration: 0,
        year: t.year || 0,
        provisional: !hasAlbum,
      });
    }
    const entry = map.get(key);
    entry.tracks.push(t);
    entry.duration += t.duration || 0;
    if (!entry.cover && (t.thumbnail || t.cover)) entry.cover = t.thumbnail || t.cover;
    if (!entry.year && t.year) entry.year = t.year;
    if (hasAlbum) entry.provisional = false;
  }
  const albums = [...map.values()];
  // Confirmed albums first, then alphabetically.
  albums.sort((a, b) => {
    if (a.provisional !== b.provisional) return a.provisional ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
  return albums;
}