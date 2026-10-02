import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { isLocal, trackKey } from '../utils/tracks';

const AudioContext = createContext(null);

// Fisher-Yates on the queue's indexes, with `first` pinned to the current track
// so enabling shuffle never immediately repeats what is already playing.
function buildShuffleOrder(length, first) {
  const order = [];
  for (let i = 0; i < length; i++) if (i !== first) order.push(i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return first >= 0 ? [first, ...order] : order;
}

export function AudioProvider({ children }) {
  const audioRef = useRef(new Audio());
  const [currentTrack, setCurrentTrack] = useState(null);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackError, setPlaybackError] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off' | 'all' | 'one'

  // Indices into `queue`, in play order. Null means "play in natural order".
  const shuffleRef = useRef(null);
  const shufflePosRef = useRef(-1);
  const handleNextTrackRef = useRef(null);
  const retryRef = useRef(false);

  const positionInShuffle = useCallback(
    (index) => (shuffleRef.current ? shuffleRef.current.indexOf(index) : -1),
    []
  );

  const setSrcAndPlay = useCallback(async (track) => {
    const audio = audioRef.current;

    if (isLocal(track)) {
      setPlaybackError('');
      setIsBuffering(false);
      const src = track.filePath;
      if (audio.src !== src) {
        audio.src = src;
        audio.load();
      }
      await audio.play().catch((err) => {
        console.warn('Playback error or blocked by autoplay policy:', err);
      });
      return;
    }

    // Online track: resolve a direct stream URL before attempting playback.
    setIsBuffering(true);
    setPlaybackError('');
    try {
      const url = await window.api.resolveStream(track.ytId || track.id);
      if (retryRef.current) retryRef.current = false;
      setIsBuffering(false);
      audio.src = url;
      audio.load();
      await audio.play().catch((err) => {
        console.warn('Stream playback error:', err);
      });
    } catch (err) {
      setIsBuffering(false);
      setPlaybackError(err.message || 'Could not stream this track');
    }
  }, []);

  const playTrack = useCallback(
    (track, trackList = null, index = -1) => {
      if (!track) return;

      if (trackList && trackList.length > 0) {
        setQueue(trackList);
        const resolved =
          index >= 0
            ? index
            : trackList.findIndex((t) => trackKey(t) === trackKey(track));
        const target = resolved >= 0 ? resolved : 0;
        setCurrentIndex(target);
        if (isShuffle) {
          const order = buildShuffleOrder(trackList.length, target);
          shuffleRef.current = order;
          shufflePosRef.current = 0;
        }
      }

      setCurrentTrack(track);
      setSrcAndPlay(track);
    },
    [isShuffle, setSrcAndPlay]
  );

  // Media element listeners. Registered once; they read live state through refs
  // and setters, so they no longer re-bind on every queue change.
  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = volume;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsBuffering(false);
    };
    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleError = () => {
      const err = audio.error;
      if (!err) return;
      // A resolved stream URL can expire or be rejected; re-resolve once.
      if (currentTrack && !isLocal(currentTrack) && !retryRef.current) {
        retryRef.current = true;
        setSrcAndPlay(currentTrack);
        return;
      }
      setIsBuffering(false);
      setPlaybackError(err.code === 4 ? 'This stream is not available right now' : 'Playback failed');
    };

    const handleEnded = () => handleNextTrackRef.current?.();

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  }, [volume, currentTrack, setSrcAndPlay]);

  const handleNextTrack = useCallback(() => {
    const audio = audioRef.current;

    if (repeatMode === 'one') {
      audio.currentTime = 0;
      audio.play().catch(() => {});
      return;
    }

    if (queue.length === 0) return;

    let nextIndex;

    if (isShuffle && shuffleRef.current && shuffleRef.current.length === queue.length) {
      const order = shuffleRef.current;
      const pos = shufflePosRef.current;
      if (pos >= 0 && pos + 1 < order.length) {
        shufflePosRef.current = pos + 1;
        nextIndex = order[pos + 1];
      } else if (repeatMode === 'all') {
        // Reshuffle, anchored on the track that follows the current one.
        const pos = positionInShuffle(currentIndex);
        const base = pos >= 0 && pos + 1 < order.length ? order[pos + 1] : order[0];
        const fresh = buildShuffleOrder(queue.length, base);
        shuffleRef.current = fresh;
        shufflePosRef.current = 0;
        nextIndex = fresh[0];
      } else {
        setIsPlaying(false);
        return;
      }
    } else {
      nextIndex = currentIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeatMode === 'all') {
          nextIndex = 0;
        } else {
          setIsPlaying(false);
          return;
        }
      }
    }

    setCurrentIndex(nextIndex);
    const nextTrack = queue[nextIndex];
    if (nextTrack) playTrack(nextTrack);
  }, [queue, currentIndex, repeatMode, isShuffle, playTrack, positionInShuffle]);

  handleNextTrackRef.current = handleNextTrack;

  const handlePrevTrack = useCallback(() => {
    const audio = audioRef.current;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    if (queue.length === 0) return;

    let prevIndex;

    if (isShuffle && shuffleRef.current && shuffleRef.current.length === queue.length) {
      const order = shuffleRef.current;
      const pos = shufflePosRef.current;
      if (pos > 0) {
        shufflePosRef.current = pos - 1;
        prevIndex = order[pos - 1];
      } else {
        prevIndex = order[order.length - 1] ?? currentIndex;
      }
    } else {
      prevIndex = currentIndex - 1;
      if (prevIndex < 0) prevIndex = repeatMode === 'all' ? queue.length - 1 : currentIndex;
    }

    setCurrentIndex(prevIndex);
    const prevTrack = queue[prevIndex];
    if (prevTrack) {
      playTrack(prevTrack);
    }
  }, [queue, currentIndex, repeatMode, isShuffle, playTrack]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!currentTrack) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
  }, [currentTrack, isPlaying]);

  const seek = useCallback((time) => {
    const audio = audioRef.current;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

  const handleVolumeChange = useCallback((newVol) => {
    setVolume(newVol);
    audioRef.current.volume = newVol;
    if (newVol > 0 && isMuted) setIsMuted(false);
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => {
      const next = !prev;
      if (next) {
        const currentKey = currentTrack ? trackKey(currentTrack) : null;
        const anchor = queue.findIndex((t) => trackKey(t) === currentKey);
        const order = buildShuffleOrder(queue.length, anchor >= 0 ? anchor : currentIndex);
        shuffleRef.current = order;
        shufflePosRef.current = anchor >= 0 ? 0 : -1;
      } else {
        shuffleRef.current = null;
        shufflePosRef.current = -1;
      }
      return next;
    });
  }, [queue, currentIndex, currentTrack]);

  // Start a shuffled playthrough of `trackList` (defaults to the live queue).
  // Unlike toggleShuffle this is idempotent: it turns shuffle *on* rather than
  // flipping it, so pressing "Shuffle" twice never lands you back in order.
  // The anchor is whatever is already playing if it's in this list, so a shuffle
  // started from a list the user is mid-way through continues from that track.
  const playShuffled = useCallback(
    (trackList = null) => {
      const list = trackList && trackList.length > 0 ? trackList : queue;
      if (list.length === 0) return;

      const currentKey = currentTrack ? trackKey(currentTrack) : null;
      const anchor = currentKey ? list.findIndex((t) => trackKey(t) === currentKey) : -1;
      const start = anchor >= 0 ? anchor : Math.floor(Math.random() * list.length);

      setQueue(list);
      setCurrentIndex(start);
      setIsShuffle(true);
      shuffleRef.current = buildShuffleOrder(list.length, start);
      shufflePosRef.current = 0;
      setCurrentTrack(list[start]);
      setSrcAndPlay(list[start]);
    },
    [queue, currentTrack, setSrcAndPlay]
  );

  const toggleRepeat = useCallback(() => {
    setRepeatMode((m) => (m === 'off' ? 'all' : m === 'all' ? 'one' : 'off'));
  }, []);

  return (
    <AudioContext.Provider
      value={{
        currentTrack,
        isPlaying,
        isBuffering,
        playbackError,
        currentTime,
        duration,
        volume,
        isMuted,
        isShuffle,
        repeatMode,
        queue,
        currentIndex,
        playTrack,
        playShuffled,
        togglePlay,
        seek,
        handleNextTrack,
        handlePrevTrack,
        handleVolumeChange,
        toggleMute,
        toggleShuffle,
        toggleRepeat,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio must be used within AudioProvider');
  return context;
}