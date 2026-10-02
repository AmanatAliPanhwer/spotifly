import React, { useState } from 'react';
import {
  Play,
  Pause,
  Download,
  CheckCircle,
  Loader2,
  Music2,
  User,
  Sparkles,
  Radio,
  Clock,
  Shuffle,
} from 'lucide-react';
import { useAudio } from '../context/AudioContext';
import { PlaylistPickerButton } from './PlaylistPicker';
import { sameTrack, isLocal, formatDuration, trackKey } from '../utils/tracks';

// Album page used for both online discovery results and library albums.
// `online` albums come from search and stream; library albums play from disk.
export default function AlbumView({
  album,
  onOpenArtistPage,
  onDownload,
  onCancelDownload,
  downloadStatuses = {},
  isDownloaded,
  playlists = [],
  onAddToPlaylist,
  onCreatePlaylist,
}) {
  const { currentTrack, isPlaying, playTrack, playShuffled, togglePlay, isBuffering, isShuffle } =
    useAudio();
  const [downloadingAll, setDownloadingAll] = useState(false);

  const tracks = album?.tracks || [];
  const isOnline = tracks.some((t) => !isLocal(t));

  const albumPlaying =
    isPlaying && currentTrack && tracks.some((t) => sameTrack(t, currentTrack));

  const handlePlay = () => {
    if (albumPlaying) {
      togglePlay();
    } else {
      playTrack(tracks[0], tracks, 0);
    }
  };

  const handleDownloadAll = async () => {
    setDownloadingAll(true);
    try {
      for (const t of tracks) {
        if (isLocal(t) || (isDownloaded && isDownloaded(t))) continue;
        try {
          await onDownload?.(t);
        } catch (_) {}
      }
    } finally {
      setDownloadingAll(false);
    }
  };

  if (!album) return null;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-gradient-to-b from-[#181818] to-[#121212]">
      {/* Hero */}
      <div className="p-8 bg-gradient-to-b from-[#4a3a6b] to-[#181818] shadow-lg">
        <div className="flex items-end gap-6">
          <div className="w-56 h-56 rounded-md shadow-2xl overflow-hidden bg-[#282828] flex items-center justify-center shrink-0">
            {album.cover ? (
              <img src={album.cover} alt="" className="w-full h-full object-cover" />
            ) : (
              <Music2 size={80} className="text-[#a7a7a7]" />
            )}
          </div>

          <div className="flex flex-col gap-3 min-w-0">
            <div className="flex items-center gap-2 text-xs uppercase font-bold tracking-wider text-[#1ed760]">
              <Sparkles size={14} />
              <span>{isOnline ? 'Album' : 'Downloaded Album'}</span>
              {album.provisional && (
                <span className="text-[#727272] normal-case tracking-normal font-medium">
                  · reading track tags
                </span>
              )}
            </div>
            <h1 className="text-5xl font-black text-white tracking-tight truncate">{album.name}</h1>
            <div className="flex items-center gap-3 text-sm text-[#b3b3b3] flex-wrap">
              <button
                onClick={() => onOpenArtistPage?.(album.artist)}
                disabled={album.provisional}
                title={album.provisional ? 'Artist name not confirmed yet' : 'Open artist page'}
                className="flex items-center gap-1.5 font-bold text-white hover:text-[#1ed760] transition-colors hover:underline disabled:hover:text-white disabled:cursor-default"
              >
                <User size={15} />
                <span>{album.artist}</span>
              </button>
              {album.year > 0 && (
                <>
                  <span>•</span>
                  <span>{album.year}</span>
                </>
              )}
              <span>•</span>
              <span>
                {tracks.length} song{tracks.length === 1 ? '' : 's'}
              </span>
              {album.duration > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock size={13} /> {formatDuration(album.duration)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="px-8 py-5 flex items-center gap-4 flex-wrap border-b border-[#242424] bg-[#141414]/90 sticky top-0 z-20 backdrop-blur">
        <button
          onClick={handlePlay}
          disabled={tracks.length === 0}
          className="flex items-center gap-3 bg-[#1ed760] hover:scale-105 active:scale-95 text-black font-extrabold px-7 py-3.5 rounded-full transition-all shadow-lg disabled:opacity-40 disabled:scale-100"
        >
          {albumPlaying ? (
            <Pause size={20} fill="currentColor" />
          ) : (
            <Play size={20} fill="currentColor" className="ml-0.5" />
          )}
          <span>{albumPlaying ? 'Pause' : 'Play album'}</span>
        </button>

        <button
          onClick={() => playShuffled(tracks)}
          disabled={tracks.length === 0}
          title="Shuffle album"
          className={`flex items-center gap-2 text-sm font-bold px-5 py-3 rounded-full border transition-all disabled:opacity-40 ${
            isShuffle
              ? 'bg-[#1ed760] text-black border-[#1ed760]'
              : 'text-[#b3b3b3] hover:text-white border-[#3e3e3e] hover:border-white'
          }`}
        >
          <Shuffle size={18} />
          <span>Shuffle</span>
        </button>


        {onDownload && tracks.some((t) => !isLocal(t)) && (
          <button
            onClick={handleDownloadAll}
            disabled={downloadingAll}
            className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-full bg-[#242424] hover:bg-[#333333] text-white border border-[#3e3e3e] transition-colors disabled:opacity-50"
          >
            {downloadingAll ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Download size={15} />
            )}
            <span>{downloadingAll ? 'Downloading…' : 'Download album'}</span>
          </button>
        )}

        {isOnline && (
          <span className="text-xs text-[#727272] flex items-center gap-1.5">
            <Radio size={13} className="text-[#1ed760]" />
            {isBuffering ? 'Buffering stream…' : 'Streams online — download to keep it offline'}
          </span>
        )}
      </div>

      {/* Track list */}
      <div className="px-8 py-4 flex-1">
        <div className="grid grid-cols-[30px_4fr_2fr_120px] gap-4 px-4 py-2 border-b border-[#282828] text-xs font-semibold text-[#a7a7a7] uppercase tracking-wider">
          <span>#</span>
          <span>Title</span>
          <span>Album</span>
          <span className="text-right">Time</span>
        </div>

        <div className="flex flex-col mt-2">
          {tracks.map((track, idx) => {
            const isCurrent = currentTrack && sameTrack(currentTrack, track);
            const status = downloadStatuses[track.id];
            const isDownloading = status && status.status === 'downloading';
            const alreadyDownloaded = isLocal(track) || (isDownloaded && isDownloaded(track));

            return (
              <div
                key={trackKey(track)}
                onDoubleClick={() => (isCurrent ? togglePlay() : playTrack(track, tracks, idx))}
                className={`grid grid-cols-[30px_4fr_2fr_120px] gap-4 px-4 py-2.5 rounded-md text-sm items-center hover:bg-[#282828]/80 transition-colors group cursor-pointer ${
                  isCurrent ? 'bg-[#282828]' : ''
                }`}
              >
                <div className="flex items-center text-xs text-[#a7a7a7]">
                  <span className="group-hover:hidden">{idx + 1}</span>
                  <button
                    onClick={() => (isCurrent ? togglePlay() : playTrack(track, tracks, idx))}
                    className="hidden group-hover:flex text-white hover:text-[#1ed760]"
                  >
                    {isCurrent && isPlaying ? (
                      <Pause size={14} fill="currentColor" />
                    ) : (
                      <Play size={14} fill="currentColor" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded bg-[#242424] overflow-hidden shrink-0 flex items-center justify-center">
                    {track.thumbnail ? (
                      <img src={track.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : track.cover ? (
                      <img src={track.cover} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Music2 size={18} className="text-[#a7a7a7]" />
                    )}
                  </div>
                  <div className="flex flex-col overflow-hidden min-w-0">
                    <span
                      className={`truncate font-medium ${
                        isCurrent ? 'text-[#1ed760]' : 'text-white'
                      }`}
                    >
                      {track.title}
                    </span>
                    <span className="text-[11px] text-[#727272] truncate">
                      {track.artist}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-[#a7a7a7] truncate">{track.album || album.name}</div>

                <div className="flex items-center justify-end gap-3">
                  {isDownloading ? (
                    <span className="text-[11px] font-bold text-[#1ed760] flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" />
                      {Math.round(status.percent || 0)}%
                    </span>
                  ) : alreadyDownloaded ? (
                    <CheckCircle size={15} className="text-[#1ed760]" />
                  ) : onDownload ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload(track);
                      }}
                      title="Download"
                      className="opacity-0 group-hover:opacity-100 hover:text-white transition-opacity p-1"
                    >
                      <Download size={15} />
                    </button>
                  ) : null}

                  {onCancelDownload && isDownloading && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancelDownload(track.id);
                      }}
                      title="Cancel download"
                      className="text-[#727272] hover:text-red-400 transition-colors"
                    >
                      ×
                    </button>
                  )}

                  {onAddToPlaylist && (
                    <PlaylistPickerButton
                      track={track}
                      playlists={playlists}
                      onAddToPlaylist={onAddToPlaylist}
                      onCreatePlaylist={onCreatePlaylist}
                    />
                  )}

                  <span className="text-xs text-[#a7a7a7] w-10 text-right">
                    {formatDuration(track.duration)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
</div>
    </div>
  );
}