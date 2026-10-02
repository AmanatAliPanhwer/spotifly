import React, { useState, useEffect } from 'react';
import {
  Download,
  CheckCircle,
  Loader2,
  Music,
  User,
  Zap,
  XCircle,
  Eye,
  Calendar,
  Sparkles,
  Play,
  Pause,
  Radio,
  Shuffle,
} from 'lucide-react';
import { PlaylistPickerButton } from './PlaylistPicker';
import { useAudio } from '../context/AudioContext';
import { sameTrack, isLocal } from '../utils/tracks';

export default function SongView({
  track,
  onDownload,
  onCancelDownload,
  onOpenArtistPage,
  onOpenSongPage,
  playlists = [],
  onAddToPlaylist,
  onCreatePlaylist,
  downloadStatuses = {},
  isDownloaded,
}) {
  const [loading, setLoading] = useState(true);
  const [relatedTracks, setRelatedTracks] = useState([]);
  const { currentTrack, isPlaying, playTrack, playShuffled, togglePlay, isShuffle } = useAudio();

  useEffect(() => {
    let active = true;
    setLoading(true);

    window.api
      .getSongPage(track)
      .then((data) => {
        if (!active) return;
        setRelatedTracks(data.related || []);
      })
      .catch((err) => {
        console.error('Error fetching song page:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [track?.id]);

  if (!track) return null;

  const currentStatus = downloadStatuses[track.id];
  const currentDownloaded = isDownloaded(track);
  const currentDownloading = currentStatus && currentStatus.status === 'downloading';
  const isCurrent = currentTrack && sameTrack(currentTrack, track);
  const playingThis = isCurrent && isPlaying;

  const handleToggle = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      // Play online using this song plus its related tracks as the queue.
      playTrack(track, [track, ...relatedTracks], 0);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-gradient-to-b from-[#252525] to-[#121212]">
      {/* Song Header */}
      <div className="p-8 bg-gradient-to-b from-[#1a3a4b] to-[#161616] flex items-end gap-6 shadow-xl">
        <div className="w-52 h-52 rounded-lg bg-[#242424] shadow-2xl overflow-hidden shrink-0 flex items-center justify-center">
          {track.thumbnail ? (
            <img src={track.thumbnail} alt={track.title} className="w-full h-full object-cover" />
          ) : (
            <Music size={80} className="text-[#a7a7a7]" />
          )}
        </div>

        <div className="flex flex-col gap-3 overflow-hidden">
          <span className="text-xs uppercase font-bold tracking-wider text-[#1ed760]">Single / Track</span>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            {track.title}
          </h1>

          <div className="flex items-center gap-3 text-sm text-[#b3b3b3]">
            <button
              onClick={() => onOpenArtistPage && onOpenArtistPage(track.artist)}
              className="flex items-center gap-1.5 font-bold text-white hover:text-[#1ed760] transition-colors hover:underline"
            >
              <User size={16} />
              <span>{track.artist}</span>
            </button>
            <span>•</span>
            <span>{track.duration}</span>
            {track.ago && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-xs">
                  <Calendar size={13} /> {track.ago}
                </span>
              </>
            )}
            {track.views && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-xs">
                  <Eye size={13} /> {track.views.toLocaleString()} views
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Action Bar for this Song */}
      <div className="px-8 py-5 flex items-center justify-between gap-4 flex-wrap border-b border-[#242424] bg-[#161616]/80 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={handleToggle}
            title={playingThis ? 'Pause' : currentDownloaded ? 'Play from your library' : 'Play online'}
            className="flex items-center gap-2.5 bg-[#1ed760] hover:scale-105 active:scale-95 text-black font-extrabold text-sm px-6 py-3 rounded-full transition-all shadow-lg cursor-pointer"
          >
            {playingThis ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            <span>{playingThis ? 'Pause' : 'Play'}</span>
          </button>

          {currentDownloaded ? (
            <div className="flex items-center gap-2 text-sm text-[#1ed760] font-bold bg-[#1ed760]/10 px-5 py-2.5 rounded-full border border-[#1ed760]/30 shadow">
              <CheckCircle size={18} />
              <span>Downloaded to Offline Library</span>
            </div>
          ) : currentDownloading ? (
            <div className="flex items-center gap-3 text-sm text-white bg-[#282828] border border-[#3e3e3e] px-5 py-2.5 rounded-full shadow">
              <Loader2 size={16} className="animate-spin text-[#1ed760]" />
              <span className="font-bold text-[#1ed760]">{Math.round(currentStatus.percent || 0)}%</span>
              {currentStatus.speed && (
                <span className="text-xs text-[#b3b3b3] flex items-center gap-1">
                  <Zap size={13} className="text-yellow-400" />
                  {currentStatus.speed}
                </span>
              )}
              {currentStatus.eta && (
                <span className="text-xs text-[#727272]">ETA {currentStatus.eta}</span>
              )}
              {onCancelDownload && (
                <button
                  onClick={() => onCancelDownload(track.id)}
                  title="Cancel Download"
                  className="text-[#727272] hover:text-red-400 transition-colors ml-1"
                >
                  <XCircle size={16} />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => onDownload(track)}
              className="flex items-center gap-2.5 bg-[#1ed760] hover:scale-105 active:scale-95 text-black font-extrabold text-sm px-6 py-3 rounded-full transition-all shadow-lg cursor-pointer"
            >
              <Download size={18} />
              <span>Download Audio</span>
            </button>
          )}

          <button
            onClick={() => onOpenArtistPage && onOpenArtistPage(track.artist)}
            className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-full bg-[#282828] hover:bg-[#333333] text-white border border-[#3e3e3e] transition-colors"
          >
            <User size={15} />
            <span>Go to Artist Page</span>
          </button>
        </div>
      </div>

      {/* Recommended / Related Tracks */}
      <div className="px-8 py-6 flex-1">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles size={20} className="text-[#1ed760]" />
            <span>Recommended Tracks & Variations</span>
          </h2>

          <button
            onClick={() => playShuffled([track, ...relatedTracks])}
            disabled={relatedTracks.length === 0}
            title="Shuffle this song with its recommendations"
            className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full border transition-all disabled:opacity-40 ${
              isShuffle
                ? 'bg-[#1ed760] text-black border-[#1ed760]'
                : 'bg-[#242424] text-white border-[#3e3e3e] hover:bg-[#333333]'
            }`}
          >
            <Shuffle size={15} />
            <span>Shuffle all</span>
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#a7a7a7]">
            <Loader2 size={32} className="animate-spin text-[#1ed760]" />
            <p className="text-sm">Fetching recommended tracks...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {relatedTracks.map((relTrack, relIdx) => {
              const relStatus = downloadStatuses[relTrack.id];
              const isRelDownloaded = isDownloaded(relTrack);
              const isRelDownloading = relStatus && relStatus.status === 'downloading';
              const relIsCurrent = currentTrack && sameTrack(currentTrack, relTrack);
              const relPlaying = relIsCurrent && isPlaying;

              return (
                <div
                  key={relTrack.id}
                  onDoubleClick={() =>
                    relIsCurrent ? togglePlay() : playTrack(relTrack, [track, ...relatedTracks], relIdx + 1)
                  }
                  className="flex items-center justify-between p-2.5 rounded-md hover:bg-[#282828] transition-colors group"
                >
                  <div className="flex items-center gap-3 flex-1 overflow-hidden">
                    <div className="relative w-11 h-11 rounded overflow-hidden bg-[#242424] shrink-0">
                      {relTrack.thumbnail ? (
                        <img src={relTrack.thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#727272]">
                          <Music size={18} />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col overflow-hidden">
                      <span
                        onClick={() => onOpenSongPage && onOpenSongPage(relTrack)}
                        className="text-white text-sm font-medium truncate group-hover:text-[#1ed760] transition-colors cursor-pointer hover:underline"
                      >
                        {relTrack.title}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-[#a7a7a7] truncate">
                        <button
                          onClick={() => onOpenArtistPage && onOpenArtistPage(relTrack.artist)}
                          className="hover:underline hover:text-white"
                        >
                          {relTrack.artist}
                        </button>
                        <span>•</span>
                        <span>{relTrack.duration}</span>
                      </div>
                    </div>
                  </div>

<div className="flex items-center gap-2 shrink-0 ml-4">
                      <PlaylistPickerButton
                        track={relTrack}
                        playlists={playlists}
                        onAddToPlaylist={onAddToPlaylist}
                        onCreatePlaylist={onCreatePlaylist}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      />

                      {isRelDownloaded ? (
                      <div className="flex items-center gap-1.5 text-xs text-[#1ed760] font-medium bg-[#1ed760]/10 px-3 py-1.5 rounded-full border border-[#1ed760]/30">
                        <CheckCircle size={14} />
                        <span>Downloaded</span>
                      </div>
                    ) : isRelDownloading ? (
                      <div className="flex items-center gap-2 text-xs text-white bg-[#282828] border border-[#3e3e3e] px-3 py-1.5 rounded-full shadow">
                        <Loader2 size={13} className="animate-spin text-[#1ed760]" />
                        <span className="font-bold text-[#1ed760]">{Math.round(relStatus.percent || 0)}%</span>
                        {relStatus.speed && (
                          <span className="text-[11px] text-[#b3b3b3] hidden sm:inline flex items-center gap-0.5">
                            <Zap size={11} className="text-yellow-400" />
                            {relStatus.speed}
                          </span>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => onDownload(relTrack)}
                        className="flex items-center gap-2 bg-[#2a2a2a] hover:bg-white hover:text-black text-white px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border border-[#3e3e3e]"
                      >
                        <Download size={14} />
                        <span>Download</span>
                      </button>
                    )}

                    <button
                      onClick={() =>
                        relIsCurrent ? togglePlay() : playTrack(relTrack, [track, ...relatedTracks], relIdx + 1)
                      }
                      title={relPlaying ? 'Pause' : 'Play online'}
                      className="flex items-center gap-1.5 bg-[#2a2a2a] hover:bg-[#1ed760] hover:text-black text-white px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all border border-[#3e3e3e]"
                    >
                      {relPlaying ? <Pause size={14} fill="currentColor" /> : <Radio size={14} />}
                    </button>
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
