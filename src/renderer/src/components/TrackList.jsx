import React, { useState } from 'react';
import {
  Play,
  Pause,
  Clock,
  Heart,
  Trash2,
  Music,
  FolderOpen,
  Search,
  Plus,
  ListPlus,
} from 'lucide-react';
import { useAudio } from '../context/AudioContext';

function formatDuration(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function TrackList({
  title,
  subtitle,
  icon: HeaderIcon,
  headerBg = 'from-[#1e3264] to-[#121212]',
  tracks = [],
  favorites = [],
  onToggleFavorite,
  onDeleteTrack,
  onOpenFolder,
  playlists = [],
  onAddToPlaylist,
  onOpenArtistPage,
  onOpenSongPage,
}) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = useAudio();
  const [filterQuery, setFilterQuery] = useState('');
  const [playlistMenuTrack, setPlaylistMenuTrack] = useState(null);

  const filteredTracks = tracks.filter((t) => {
    if (!filterQuery) return true;
    const term = filterQuery.toLowerCase();
    return (
      (t.title && t.title.toLowerCase().includes(term)) ||
      (t.artist && t.artist.toLowerCase().includes(term)) ||
      (t.album && t.album.toLowerCase().includes(term))
    );
  });

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-gradient-to-b from-[#181818] to-[#121212]">
      {/* Header Banner */}
      <div className={`p-8 bg-gradient-to-b ${headerBg} flex items-end gap-6 shadow-md`}>
        <div className="w-44 h-44 bg-[#282828] shadow-2xl rounded-md flex items-center justify-center shrink-0 overflow-hidden">
          {HeaderIcon ? (
            <HeaderIcon size={70} className="text-white" />
          ) : (
            <Music size={70} className="text-[#a7a7a7]" />
          )}
        </div>
        <div className="flex flex-col gap-2 overflow-hidden">
          <span className="text-xs uppercase font-bold tracking-wider text-white">Playlist</span>
          <h1 className="text-5xl font-black text-white tracking-tight truncate">{title}</h1>
          <p className="text-sm text-[#b3b3b3]">{subtitle || `${tracks.length} offline songs ready to play`}</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (filteredTracks.length === 0) return;
              const isCurrentPlayingInList =
                currentTrack && filteredTracks.some((t) => (t.filePath || t.id) === (currentTrack.filePath || currentTrack.id));
              if (isCurrentPlayingInList) {
                togglePlay();
              } else {
                playTrack(filteredTracks[0], filteredTracks, 0);
              }
            }}
            disabled={filteredTracks.length === 0}
            className="w-14 h-14 rounded-full bg-[#1ed760] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-40 disabled:scale-100"
          >
            {isPlaying &&
            currentTrack &&
            filteredTracks.some((t) => (t.filePath || t.id) === (currentTrack.filePath || currentTrack.id)) ? (
              <Pause size={24} fill="currentColor" />
            ) : (
              <Play size={24} fill="currentColor" className="ml-1" />
            )}
          </button>

          {onOpenFolder && (
            <button
              onClick={onOpenFolder}
              className="flex items-center gap-2 text-sm text-[#b3b3b3] hover:text-white px-3 py-1.5 rounded-full border border-[#3e3e3e] hover:border-white transition-colors"
            >
              <FolderOpen size={16} />
              <span>Open in Explorer</span>
            </button>
          )}
        </div>

        {/* Filter input */}
        <div className="relative flex items-center w-64">
          <Search size={16} className="absolute left-3 text-[#727272]" />
          <input
            type="text"
            placeholder="Search in tracks..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full bg-[#242424] text-white pl-9 pr-3 py-1.5 rounded-full text-xs font-medium outline-none focus:ring-1 focus:ring-white transition-all placeholder-[#727272]"
          />
        </div>
      </div>

      {/* Tracks Table */}
      <div className="px-8 pb-10 flex-1">
        <div className="grid grid-cols-[30px_4fr_2fr_100px_80px] gap-4 px-4 py-2 border-b border-[#282828] text-xs font-semibold text-[#a7a7a7] uppercase tracking-wider">
          <span>#</span>
          <span>Title</span>
          <span>Artist / Album</span>
          <span className="flex items-center gap-1 justify-end">
            <Clock size={14} />
          </span>
          <span className="text-right">Action</span>
        </div>

        {filteredTracks.length === 0 ? (
          <div className="py-16 text-center text-[#727272] flex flex-col items-center gap-3">
            <Music size={40} />
            <p className="text-sm font-medium">No songs available here yet.</p>
            <p className="text-xs">Go to "Search & Download" to add your favorite music!</p>
          </div>
        ) : (
          <div className="flex flex-col mt-2">
            {filteredTracks.map((track, idx) => {
              const isCurrent =
                currentTrack && (currentTrack.filePath || currentTrack.id) === (track.filePath || track.id);
              const isFavorited = favorites.some(
                (f) => (f.filePath || f.id) === (track.filePath || track.id)
              );

              return (
                <div
                  key={track.filePath || track.id}
                  onDoubleClick={() => playTrack(track, filteredTracks, idx)}
                  className={`grid grid-cols-[30px_4fr_2fr_100px_80px] gap-4 px-4 py-2.5 rounded-md text-sm items-center hover:bg-[#282828]/80 transition-colors group cursor-pointer ${
                    isCurrent ? 'bg-[#282828]' : ''
                  }`}
                >
                  {/* Play / Index */}
                  <div className="flex items-center text-xs text-[#a7a7a7]">
                    <span className="group-hover:hidden">{idx + 1}</span>
                    <button
                      onClick={() => {
                        if (isCurrent) togglePlay();
                        else playTrack(track, filteredTracks, idx);
                      }}
                      className="hidden group-hover:flex text-white hover:text-[#1ed760]"
                    >
                      {isCurrent && isPlaying ? (
                        <Pause size={14} fill="currentColor" />
                      ) : (
                        <Play size={14} fill="currentColor" />
                      )}
                    </button>
                  </div>

                  {/* Title & Cover */}
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded bg-[#242424] overflow-hidden shrink-0 flex items-center justify-center">
                      {track.cover ? (
                        <img src={track.cover} alt="" className="w-full h-full object-cover" />
                      ) : track.thumbnail ? (
                        <img src={track.thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Music size={18} className="text-[#a7a7a7]" />
                      )}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span
                        onClick={(e) => {
                          if (onOpenSongPage) {
                            e.stopPropagation();
                            onOpenSongPage(track);
                          }
                        }}
                        className={`truncate font-medium hover:underline cursor-pointer ${
                          isCurrent ? 'text-[#1ed760]' : 'text-white group-hover:text-white'
                        }`}
                      >
                        {track.title}
                      </span>
                      <span
                        onClick={(e) => {
                          if (onOpenArtistPage && track.artist) {
                            e.stopPropagation();
                            onOpenArtistPage(track.artist);
                          }
                        }}
                        className="text-xs text-[#a7a7a7] truncate hover:underline hover:text-white cursor-pointer"
                      >
                        {track.artist}
                      </span>
                    </div>
                  </div>

                  {/* Album */}
                  <div className="text-xs text-[#a7a7a7] truncate">{track.album || 'Offline Audio'}</div>

                  {/* Duration & Like */}
                  <div className="flex items-center justify-end gap-3 text-xs text-[#a7a7a7]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(track);
                      }}
                      className={`transition-colors ${
                        isFavorited ? 'text-[#1ed760]' : 'text-[#a7a7a7] opacity-0 group-hover:opacity-100 hover:text-white'
                      }`}
                    >
                      <Heart size={15} fill={isFavorited ? 'currentColor' : 'none'} />
                    </button>
                    <span>{formatDuration(track.duration)}</span>
                  </div>

                  {/* Actions (Delete / Add to playlist) */}
                  <div className="flex items-center justify-end gap-2 text-[#a7a7a7]">
                    {playlists.length > 0 && onAddToPlaylist && (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPlaylistMenuTrack(playlistMenuTrack === track.id ? null : track.id);
                          }}
                          title="Add to Playlist"
                          className="opacity-0 group-hover:opacity-100 hover:text-white transition-opacity p-1"
                        >
                          <ListPlus size={16} />
                        </button>

                        {playlistMenuTrack === track.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-6 w-44 bg-[#282828] border border-[#3e3e3e] rounded-md shadow-2xl py-1 z-30"
                          >
                            <span className="px-3 py-1 text-[10px] uppercase font-bold text-[#727272] block">
                              Add to playlist
                            </span>
                            {playlists.map((pl) => (
                              <button
                                key={pl.id}
                                onClick={() => {
                                  onAddToPlaylist(pl.id, track);
                                  setPlaylistMenuTrack(null);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-white hover:bg-[#3e3e3e] truncate"
                              >
                                {pl.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {onDeleteTrack && track.filePath && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete "${track.title}" from offline storage?`)) {
                            onDeleteTrack(track.filePath);
                          }
                        }}
                        title="Delete from Offline Storage"
                        className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity p-1"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
