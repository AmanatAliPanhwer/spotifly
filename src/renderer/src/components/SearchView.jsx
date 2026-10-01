import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search as SearchIcon, Download, CheckCircle, Loader2, Music, Sparkles, Zap, XCircle, Play, Pause, Radio, Disc3, Layers } from 'lucide-react';
import { PlaylistPickerButton } from './PlaylistPicker';
import { useAudio } from '../context/AudioContext';
import { sameTrack, groupSearchResults } from '../utils/tracks';

const SUGGESTED_TAGS = [
  'Top Hits 2026',
  'Lo-Fi Beats',
  'Synthwave',
  'Acoustic Covers',
  'Rock Classics',
  'Hip Hop Workout',
  'Relaxing Piano',
  'Chillout Lounge',
];

export default function SearchView({
  onDownload,
  onCancelDownload,
  onOpenArtistPage,
  onOpenSongPage,
  onOpenAlbum,
  playlists = [],
  onAddToPlaylist,
  onCreatePlaylist,
  downloadStatuses = {},
  isDownloaded,
}) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('songs'); // 'songs' | 'albums'
  const [results, setResults] = useState([]);
  const [albumTracks, setAlbumTracks] = useState([]);
  const [enriching, setEnriching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { currentTrack, isPlaying, playTrack, togglePlay } = useAudio();
  const tokenRef = useRef('');

  // Album mode: results appear immediately from yt-search, then each video gets
  // its real album/artist/year as the main-process probe resolves it. Events
  // carrying a stale token are dropped so fast re-searches can't corrupt state.
  useEffect(() => {
    return window.api.onAlbumMetadata((payload) => {
      if (!payload.token || payload.token !== tokenRef.current) return;
      if (payload.done) {
        setEnriching(false);
        return;
      }
      if (!payload.meta) return;
      setAlbumTracks((prev) =>
        prev.map((t) =>
          t.id === payload.meta.id
            ? {
                ...t,
                album: payload.meta.album || t.album,
                artist: payload.meta.artist || t.artist,
                title: payload.meta.title || t.title,
                year: payload.meta.year || t.year,
              }
            : t
        )
      );
    });
  }, []);

  const albums = useMemo(() => groupSearchResults(albumTracks), [albumTracks]);

  const handleSearch = async (searchQuery) => {
    const q = searchQuery !== undefined ? searchQuery : query;
    if (!q.trim()) return;
    setLoading(true);
    setHasSearched(true);

    if (mode === 'albums') {
      try {
        const res = await window.api.searchAlbums(q);
        tokenRef.current = res.token;
        setAlbumTracks(res.tracks || []);
        setEnriching(true);
      } catch (err) {
        console.error(err);
        setAlbumTracks([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const items = await window.api.searchMusic(q);
      setResults(items);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleModeChange = (next) => {
    setMode(next);
    setResults([]);
    setAlbumTracks([]);
    setHasSearched(false);
    setEnriching(false);
    tokenRef.current = '';
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 bg-gradient-to-b from-[#1e1e1e] to-[#121212]">
      {/* Search Header */}
      <div className="flex flex-col gap-4 max-w-3xl">
<div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            {mode === 'albums' ? 'Albums' : 'Search & Download'}
          </h1>
          <div className="flex items-center gap-1 bg-[#242424] rounded-full p-1">
            <button
              onClick={() => handleModeChange('songs')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                mode === 'songs' ? 'bg-white text-black' : 'text-[#a7a7a7] hover:text-white'
              }`}
            >
              Songs
            </button>
            <button
              onClick={() => handleModeChange('albums')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                mode === 'albums' ? 'bg-white text-black' : 'text-[#a7a7a7] hover:text-white'
              }`}
            >
              Albums
            </button>
          </div>
        </div>

        <p className="text-sm text-[#b3b3b3]">
          {mode === 'albums'
            ? 'Search for an album or artist. We read real track tags to group songs into albums.'
            : 'Search any song, artist, album, or vibe. Click download to store the music locally for offline playback!'}
        </p>

        <div className="relative flex items-center">
          <SearchIcon size={20} className="absolute left-4 text-[#727272]" />
          <input
            type="text"
            placeholder="What do you want to play or download?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            className="w-full bg-[#242424] hover:bg-[#2a2a2a] focus:bg-[#242424] text-white pl-12 pr-28 py-3.5 rounded-full text-sm font-medium outline-none focus:ring-2 focus:ring-white transition-all shadow-inner"
          />
          <button
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            className="absolute right-2 px-5 py-2 bg-[#1ed760] text-black font-bold text-xs rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 cursor-pointer"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
          </button>
        </div>

        {/* Suggested Quick Tags */}
        <div className="flex items-center gap-2 flex-wrap pt-2">
          <span className="text-xs text-[#727272] flex items-center gap-1 font-semibold">
            <Sparkles size={14} className="text-[#1ed760]" /> Quick searches:
          </span>
          {SUGGESTED_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => {
                setQuery(tag);
                handleSearch(tag);
              }}
              className="text-xs bg-[#242424] hover:bg-[#333333] text-white px-3 py-1.5 rounded-full transition-colors font-medium border border-[#303030]"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Results List */}
      <div className="mt-8 flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#a7a7a7]">
            <Loader2 size={36} className="animate-spin text-[#1ed760]" />
            <p className="text-sm">
              {mode === 'albums'
                ? 'Searching albums and reading track tags...'
                : 'Fetching songs and high quality audio streams...'}
            </p>
          </div>
        ) : mode === 'albums' ? (
          albums.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-lg font-bold text-white">
                  Albums ({albums.length})
                </h2>
                {enriching && (
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#1ed760]">
                    <Layers size={13} className="animate-pulse" />
                    reading track tags…
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
                {albums.map((album) => {
                  const isCurrentAlbum =
                    currentTrack && album.tracks.some((t) => sameTrack(t, currentTrack));
                  return (
                    <div
                      key={album.key}
                      onClick={() => onOpenAlbum(album)}
                      onDoubleClick={() => playTrack(album.tracks[0], album.tracks, 0)}
                      className="p-3 rounded-md hover:bg-[#282828] transition-colors group cursor-pointer"
                    >
                      <div className="relative w-full aspect-square rounded-md shadow-lg overflow-hidden bg-[#242424] mb-3">
                        {album.cover ? (
                          <img
                            src={album.cover}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Disc3 size={56} className="absolute inset-0 m-auto text-[#a7a7a7]" />
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isCurrentAlbum && isPlaying) togglePlay();
                            else playTrack(album.tracks[0], album.tracks, 0);
                          }}
                          title="Play album"
                          className="absolute bottom-2 right-2 w-11 h-11 rounded-full bg-[#1ed760] text-black shadow-xl flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-105 transition-all"
                        >
                          {isCurrentAlbum && isPlaying ? (
                            <Pause size={20} fill="currentColor" />
                          ) : (
                            <Play size={20} fill="currentColor" className="ml-0.5" />
                          )}
                        </button>

                        {album.provisional && (
                          <span
                            title="Waiting for album tag from track metadata"
                            className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center"
                          >
                            <Loader2 size={12} className="animate-spin text-white" />
                          </span>
                        )}
                      </div>

                      <div className="text-sm font-bold text-white truncate">{album.name}</div>
                      <div className="text-xs text-[#a7a7a7] truncate">{album.artist}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : hasSearched ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#a7a7a7] gap-2">
              <p className="text-base text-white font-medium">No albums found for "{query}"</p>
              <p className="text-xs">Try the album name, or the artist name on its own.</p>
            </div>
          ) : null
        ) : results.length > 0 ? (
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-white mb-2">Search Results ({results.length})</h2>

            <div className="grid grid-cols-1 gap-1">
              {results.map((track, idx) => {
                const status = downloadStatuses[track.id];
                const alreadyDownloaded = isDownloaded(track);
                const isDownloading = status && status.status === 'downloading';
                const isCurrent = currentTrack && sameTrack(currentTrack, track);
                const playingThis = isCurrent && isPlaying;

                return (
                  <div
                    key={track.id}
                    onDoubleClick={() => (isCurrent ? togglePlay() : playTrack(track, results, idx))}
                    className="flex items-center justify-between p-3 rounded-md hover:bg-[#282828] transition-colors group"
                  >
                    <div className="flex items-center gap-4 flex-1 overflow-hidden">
                      <div className="relative w-12 h-12 rounded overflow-hidden bg-[#242424] shrink-0">
                        {track.thumbnail ? (
                          <img src={track.thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#727272]">
                            <Music size={20} />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/55 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="w-7 h-7 rounded-full bg-[#1ed760] text-black flex items-center justify-center">
                            {playingThis ? (
                              <Pause size={13} fill="currentColor" />
                            ) : (
                              <Play size={13} fill="currentColor" className="ml-0.5" />
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col overflow-hidden">
                        <span
                          onClick={() => onOpenSongPage && onOpenSongPage(track)}
                          className={`text-sm font-medium truncate group-hover:text-[#1ed760] transition-colors cursor-pointer hover:underline ${
                            isCurrent ? 'text-[#1ed760]' : 'text-white'
                          }`}
                        >
                          {track.title}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-[#a7a7a7] truncate">
                          <button
                            onClick={() => onOpenArtistPage && onOpenArtistPage(track.artist)}
                            className="hover:underline hover:text-white transition-colors"
                          >
                            {track.artist}
                          </button>
                          <span>•</span>
                          <span>{track.duration}</span>
                          {track.ago && (
                            <>
                              <span>•</span>
                              <span>{track.ago}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Download / Online play actions */}
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <PlaylistPickerButton
                        track={track}
                        playlists={playlists}
                        onAddToPlaylist={onAddToPlaylist}
                        onCreatePlaylist={onCreatePlaylist}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      />

                      {alreadyDownloaded ? (
                        <div className="flex items-center gap-1.5 text-xs text-[#1ed760] font-medium bg-[#1ed760]/10 px-3 py-1.5 rounded-full border border-[#1ed760]/30">
                          <CheckCircle size={14} />
                          <span>Downloaded</span>
                        </div>
                      ) : isDownloading ? (
                        <div className="flex items-center gap-2.5 text-xs text-white bg-[#282828] border border-[#3e3e3e] px-3 py-1.5 rounded-full shadow">
                          <Loader2 size={13} className="animate-spin text-[#1ed760]" />
                          <span className="font-bold text-[#1ed760]">{Math.round(status.percent || 0)}%</span>
                          {status.speed && (
                            <span className="text-[11px] text-[#b3b3b3] hidden sm:inline flex items-center gap-0.5">
                              <Zap size={11} className="text-yellow-400" />
                              {status.speed}
                            </span>
                          )}
                          {status.eta && (
                            <span className="text-[10px] text-[#727272] hidden md:inline">
                              ETA {status.eta}
                            </span>
                          )}
                          {onCancelDownload && (
                            <button
                              onClick={() => onCancelDownload(track.id)}
                              title="Cancel Download"
                              className="text-[#727272] hover:text-red-400 transition-colors ml-0.5"
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => onDownload(track)}
                          className="flex items-center gap-2 bg-[#2a2a2a] hover:bg-white hover:text-black text-white px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border border-[#3e3e3e]"
                        >
                          <Download size={14} />
                          <span>Download Audio</span>
                        </button>
                      )}

                      <button
                        onClick={() => (isCurrent ? togglePlay() : playTrack(track, results, idx))}
                        title={playingThis ? 'Pause' : 'Play online'}
                        className="flex items-center gap-2 bg-[#2a2a2a] hover:bg-[#1ed760] hover:text-black text-white px-3 py-1.5 rounded-full text-xs font-semibold transition-all border border-[#3e3e3e]"
                      >
                        {playingThis ? (
                          <Pause size={14} fill="currentColor" />
                        ) : (
                          <Radio size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : hasSearched ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#a7a7a7] gap-2">
            <p className="text-base text-white font-medium">No results found for "{query}"</p>
            <p className="text-xs">Please make sure the words are spelled correctly or try artist name.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-[#27856a] p-5 rounded-lg h-44 flex flex-col justify-between font-bold text-white relative overflow-hidden shadow-lg hover:brightness-110 cursor-pointer transition-all">
              <span className="text-xl">Pop & Hits</span>
              <Music className="absolute bottom-2 right-2 opacity-30 text-white" size={60} />
            </div>
            <div className="bg-[#1e3264] p-5 rounded-lg h-44 flex flex-col justify-between font-bold text-white relative overflow-hidden shadow-lg hover:brightness-110 cursor-pointer transition-all">
              <span className="text-xl">Rock & Metal</span>
              <Music className="absolute bottom-2 right-2 opacity-30 text-white" size={60} />
            </div>
            <div className="bg-[#8d67ab] p-5 rounded-lg h-44 flex flex-col justify-between font-bold text-white relative overflow-hidden shadow-lg hover:brightness-110 cursor-pointer transition-all">
              <span className="text-xl">Lo-Fi & Study</span>
              <Music className="absolute bottom-2 right-2 opacity-30 text-white" size={60} />
            </div>
            <div className="bg-[#e8115b] p-5 rounded-lg h-44 flex flex-col justify-between font-bold text-white relative overflow-hidden shadow-lg hover:brightness-110 cursor-pointer transition-all">
              <span className="text-xl">Hip-Hop & R&B</span>
              <Music className="absolute bottom-2 right-2 opacity-30 text-white" size={60} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
