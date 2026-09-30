import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  VolumeX,
  Heart,
  Music,
} from 'lucide-react';
import { useAudio } from '../context/AudioContext';

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function Player({ favorites = [], onToggleFavorite, onOpenSongPage, onOpenArtistPage }) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    togglePlay,
    seek,
    handleNextTrack,
    handlePrevTrack,
    handleVolumeChange,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
  } = useAudio();

  const [isSeeking, setIsSeeking] = useState(false);
  const [seekTime, setSeekTime] = useState(0);

  const isFavorited = currentTrack && favorites.some((f) => (f.filePath || f.id) === (currentTrack.filePath || currentTrack.id));

  const progressPercent = duration > 0 ? ((isSeeking ? seekTime : currentTime) / duration) * 100 : 0;

  return (
    <footer className="h-20 bg-[#000000] border-t border-[#282828] px-4 flex items-center justify-between select-none z-50">
      {/* Currently Playing Track Info */}
      <div className="flex items-center gap-3 w-1/4 min-w-[200px]">
        {currentTrack ? (
          <>
            <div
              onClick={() => onOpenSongPage && onOpenSongPage(currentTrack)}
              className="w-14 h-14 rounded overflow-hidden bg-[#282828] shrink-0 flex items-center justify-center shadow cursor-pointer hover:opacity-90"
            >
              {currentTrack.cover ? (
                <img src={currentTrack.cover} alt="Cover" className="w-full h-full object-cover" />
              ) : currentTrack.thumbnail ? (
                <img src={currentTrack.thumbnail} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <Music size={24} className="text-[#a7a7a7]" />
              )}
            </div>
            <div className="overflow-hidden flex flex-col justify-center">
              <span
                onClick={() => onOpenSongPage && onOpenSongPage(currentTrack)}
                className="text-sm font-medium text-white truncate hover:underline cursor-pointer"
              >
                {currentTrack.title || 'Unknown Title'}
              </span>
              <span
                onClick={() => onOpenArtistPage && currentTrack.artist && onOpenArtistPage(currentTrack.artist)}
                className="text-xs text-[#b3b3b3] truncate hover:underline cursor-pointer"
              >
                {currentTrack.artist || 'Unknown Artist'}
              </span>
            </div>
            <button
              onClick={() => onToggleFavorite(currentTrack)}
              className={`p-1.5 rounded-full transition-colors ml-1 ${
                isFavorited ? 'text-[#1ed760]' : 'text-[#b3b3b3] hover:text-white'
              }`}
            >
              <Heart size={18} fill={isFavorited ? 'currentColor' : 'none'} />
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3 text-sm text-[#727272]">
            <div className="w-14 h-14 rounded bg-[#181818] flex items-center justify-center">
              <Music size={20} />
            </div>
            <span>No song selected</span>
          </div>
        )}
      </div>

      {/* Center Controls & Progress Bar */}
      <div className="flex flex-col items-center gap-1.5 w-2/4 max-w-[650px]">
        {/* Buttons */}
        <div className="flex items-center gap-5">
          <button
            onClick={toggleShuffle}
            title="Enable Shuffle"
            className={`transition-colors ${isShuffle ? 'text-[#1ed760]' : 'text-[#b3b3b3] hover:text-white'}`}
          >
            <Shuffle size={18} />
          </button>

          <button
            onClick={handlePrevTrack}
            title="Previous"
            className="text-[#b3b3b3] hover:text-white transition-colors"
          >
            <SkipBack size={20} fill="currentColor" />
          </button>

          <button
            onClick={togglePlay}
            disabled={!currentTrack}
            className={`w-9 h-9 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 active:scale-95 transition-transform ${
              !currentTrack ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
          </button>

          <button
            onClick={handleNextTrack}
            title="Next"
            className="text-[#b3b3b3] hover:text-white transition-colors"
          >
            <SkipForward size={20} fill="currentColor" />
          </button>

          <button
            onClick={toggleRepeat}
            title={`Repeat: ${repeatMode}`}
            className={`transition-colors relative ${repeatMode !== 'off' ? 'text-[#1ed760]' : 'text-[#b3b3b3] hover:text-white'}`}
          >
            <Repeat size={18} />
            {repeatMode === 'one' && (
              <span className="absolute -top-1.5 -right-2 text-[9px] font-bold bg-[#1ed760] text-black px-1 rounded-full">
                1
              </span>
            )}
          </button>
        </div>

        {/* Scrubber */}
        <div className="flex items-center gap-2 w-full text-xs text-[#a7a7a7] range-group">
          <span className="w-10 text-right">{formatTime(isSeeking ? seekTime : currentTime)}</span>
          <div className="relative flex-1 flex items-center h-4">
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.5"
              value={isSeeking ? seekTime : currentTime}
              onMouseDown={() => setIsSeeking(true)}
              onChange={(e) => setSeekTime(parseFloat(e.target.value))}
              onMouseUp={(e) => {
                setIsSeeking(false);
                seek(parseFloat(e.target.value));
              }}
              className="w-full"
              style={{
                background: `linear-gradient(to right, #ffffff ${progressPercent}%, #4f4f4f ${progressPercent}%)`,
              }}
            />
          </div>
          <span className="w-10">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right Controls: Volume */}
      <div className="flex items-center justify-end gap-2.5 w-1/4 min-w-[200px] text-[#b3b3b3] range-group">
        <button onClick={toggleMute} className="hover:text-white transition-colors">
          {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        <div className="w-24 relative flex items-center">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full"
            style={{
              background: `linear-gradient(to right, #ffffff ${(isMuted ? 0 : volume) * 100}%, #4f4f4f ${(isMuted ? 0 : volume) * 100}%)`,
            }}
          />
        </div>
      </div>
    </footer>
  );
}
