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
  Pencil,
  ListX,
  ChevronUp,
  ChevronDown,
  Download,
  Shuffle,
} from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { PlaylistPickerButton } from './PlaylistPicker';
import { useDialog } from '../context/DialogContext';
import { sameTrack, trackKey, isLocal, formatDuration } from '../utils/tracks';

export default function TrackList({
  title,
  subtitle,
  icon: HeaderIcon,
  headerBg = 'from-[#1e3264] to-[#121212]',
  headerLabel = 'Playlist',
  coverImage,
  tracks = [],
  favorites = [],
  onToggleFavorite,
  onDeleteTrack,
  onOpenFolder,
  playlists = [],
  onAddToPlaylist,
  onCreatePlaylist,
  onRemoveFromPlaylist,
  onMovePlaylistTrack,
  onRenamePlaylist,
  onDeletePlaylist,
  onDownload,
  downloadStatuses = {},
  onOpenArtistPage,
  onOpenSongPage,
  readOnly = false,
}) {
  const { currentTrack, isPlaying, playTrack, playShuffled, togglePlay, isShuffle } = useAudio();
  const dialog = useDialog();
  const [filterQuery, setFilterQuery] = useState('');

  const filteredTracks = tracks.filter((t) => {
    if (!filterQuery) return true;
    const term = filterQuery.toLowerCase();
    return (
      (t.title && t.title.toLowerCase().includes(term)) ||
      (t.artist && t.artist.toLowerCase().includes(term)) ||
      (t.album && t.album.toLowerCase().includes(term))
    );
  });

  const listPlaying =
    isPlaying && currentTrack && filteredTracks.some((t) => sameTrack(t, currentTrack));

  const handleDelete = async (track) => {
    const ok = await dialog.confirm('Delete from offline storage?', `"${track.title}" will be permanently removed from your device. This cannot be undone.`, {
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (ok) onDeleteTrack?.(track.filePath);
  };

  const handleRename = async () => {
    const name = await dialog.prompt('Rename playlist', title, {
      inputValue: title,
      confirmText: 'Rename',
    });
    if (name) onRenamePlaylist?.(name);
  };

  const handleDeletePlaylist = async () => {
    const ok = await dialog.confirm('Delete playlist?', `"${title}" will be removed. The audio files themselves stay in your library.`, {
      confirmText: 'Delete playlist',
      variant: 'danger',
    });
    if (ok) onDeletePlaylist?.();
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-gradient-to-b from-[#181818] to-[#121212]">
      {/* Header Banner */}
      <div className={`p-8 bg-gradient-to-b ${headerBg} flex items-end gap-6 shadow-md`}>
        <div className="w-44 h-44 bg-[#282828] shadow-2xl rounded-md flex items-center justify-center shrink-0 overflow-hidden">
          {coverImage ? (
            <img src={coverImage} alt="" className="w-full h-full object-cover" />
          ) : HeaderIcon ? (
            <HeaderIcon size={70} className="text-white" />
          ) : (
            <Music size={70} className="text-[#a7a7a7]" />
          )}
        </div>
        <div className="flex flex-col gap-2 overflow-hidden">
          <span className="text-xs uppercase font-bold tracking-wider text-white">{headerLabel}</span>
          <h1 className="text-5xl font-black text-white tracking-tight truncate">{title}</h1>
          <p className="text-sm text-[#b3b3b3]">{subtitle || `${tracks.length} offline songs ready to play`}</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="px-8 py-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (filteredTracks.length === 0) return;
              if (listPlaying) {
                togglePlay();
              } else {
                playTrack(filteredTracks[0], filteredTracks, 0);
              }
            }}
            disabled={filteredTracks.length === 0}
            title={listPlaying ? 'Pause' : 'Play all'}
            className="w-14 h-14 rounded-full bg-[#1ed760] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-40 disabled:scale-100"
          >
            {listPlaying ? (
              <Pause size={24} fill="currentColor" />
            ) : (
              <Play size={24} fill="currentColor" className="ml-1" />
            )}
          </button>

          <button
            onClick={() => playShuffled(filteredTracks)}
            disabled={filteredTracks.length === 0}
            title="Shuffle play"
            className={`flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-full border transition-all disabled:opacity-40 ${
              isShuffle
                ? 'bg-[#1ed760] text-black border-[#1ed760]'
                : 'text-[#b3b3b3] hover:text-white border-[#3e3e3e] hover:border-white'
            }`}
          >
            <Shuffle size={16} />
            <span>Shuffle</span>
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

          {onRenamePlaylist && (
            <button
              onClick={handleRename}
              className="flex items-center gap-2 text-sm text-[#b3b3b3] hover:text-white px-3 py-1.5 rounded-full border border-[#3e3e3e] hover:border-white transition-colors"
            >
              <Pencil size={15} />
              <span>Rename</span>
            </button>
          )}

          {onDeletePlaylist && (
            <button
              onClick={handleDeletePlaylist}
              className="flex items-center gap-2 text-sm text-[#b3b3b3] hover:text-red-400 px-3 py-1.5 rounded-full border border-[#3e3e3e] hover:border-red-400 transition-colors"
            >
              <Trash2 size={15} />
              <span>Delete playlist</span>
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
        <div className="grid grid-cols-[30px_4fr_2fr_100px_100px] gap-4 px-4 py-2 border-b border-[#282828] text-xs font-semibold text-[#a7a7a7] uppercase tracking-wider">
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
              const isCurrent = currentTrack && sameTrack(track, currentTrack);
              const isFavorited = favorites.some((f) => sameTrack(f, track));
              const status = downloadStatuses[track.id];
              const isDownloading = status && status.status === 'downloading';
              const local = isLocal(track);

              return (
                <div
                  key={trackKey(track)}
                  onDoubleClick={() => playTrack(track, filteredTracks, idx)}
                  className={`grid grid-cols-[30px_4fr_2fr_100px_100px] gap-4 px-4 py-2.5 rounded-md text-sm items-center hover:bg-[#282828]/80 transition-colors group cursor-pointer ${
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
                      <span className="text-[11px] text-[#727272] truncate">
                        {!local ? 'Online stream' : 'Offline file'}
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
                        onToggleFavorite?.(track);
                      }}
                      className={`transition-colors ${
                        isFavorited ? 'text-[#1ed760]' : 'text-[#a7a7a7] opacity-0 group-hover:opacity-100 hover:text-white'
                      }`}
                    >
                      <Heart size={15} fill={isFavorited ? 'currentColor' : 'none'} />
                    </button>
                    <span>{formatDuration(track.duration)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 text-[#a7a7a7]">
                    {/* Reorder — only meaningful in a real, unfiltered list */}
                    {onMovePlaylistTrack && !filterQuery && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMovePlaylistTrack(idx, idx - 1);
                          }}
                          disabled={idx === 0}
                          title="Move up"
                          className="opacity-0 group-hover:opacity-100 hover:text-white disabled:opacity-20 disabled:hover:text-inherit transition-opacity p-1"
                        >
                          <ChevronUp size={15} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMovePlaylistTrack(idx, idx + 1);
                          }}
                          disabled={idx === filteredTracks.length - 1}
                          title="Move down"
                          className="opacity-0 group-hover:opacity-100 hover:text-white disabled:opacity-20 disabled:hover:text-inherit transition-opacity p-1"
                        >
                          <ChevronDown size={15} />
                        </button>
                      </>
                    )}

                    {!local && onDownload && !isDownloading && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload(track);
                        }}
                        title="Download for offline use"
                        className="opacity-0 group-hover:opacity-100 hover:text-white transition-opacity p-1"
                      >
                        <Download size={15} />
                      </button>
                    )}

                    {isDownloading && (
                      <span className="text-[11px] font-bold text-[#1ed760]">
                        {Math.round(status.percent || 0)}%
                      </span>
                    )}

                    {onAddToPlaylist && !readOnly && (
                      <PlaylistPickerButton
                        track={track}
                        playlists={playlists}
                        onAddToPlaylist={onAddToPlaylist}
                        onCreatePlaylist={onCreatePlaylist}
                      />
                    )}

                    {onRemoveFromPlaylist && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFromPlaylist(track);
                        }}
                        title="Remove from this playlist"
                        className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity p-1"
                      >
                        <ListX size={15} />
                      </button>
                    )}

                    {onDeleteTrack && local && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(track);
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