import React, { useEffect, useRef, useState } from 'react';
import { ListPlus, ListMusic, Check, Plus } from 'lucide-react';
import { sameTrack } from '../utils/tracks';

// Dropdown for adding a track to any number of playlists, plus inline
// "create playlist" so the flow never needs a native prompt().
export default function PlaylistPicker({
  track,
  playlists = [],
  onAddToPlaylist,
  onCreatePlaylist,
  onClose,
  align = 'right',
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [addedTo, setAddedTo] = useState(() => new Set());
  const wrapRef = useRef(null);
  const nameRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) onClose?.();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  useEffect(() => {
    if (creating) nameRef.current?.focus();
  }, [creating]);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const pl = await onCreatePlaylist?.(trimmed);
    setName('');
    setCreating(false);
    if (pl && onAddToPlaylist) {
      onAddToPlaylist(pl.id, track);
      setAddedTo((prev) => new Set(prev).add(pl.id));
    }
  };

  return (
    <div
      ref={wrapRef}
      onClick={(e) => e.stopPropagation()}
      className={`absolute top-7 w-56 bg-[#282828] border border-[#3e3e3e] rounded-md shadow-2xl py-1.5 z-40 ${
        align === 'right' ? 'right-0' : 'left-0'
      }`}
    >
      <span className="px-3 py-1 text-[10px] uppercase font-bold text-[#727272] block">
        Add to playlist
      </span>

      {playlists.length === 0 && !creating && (
        <p className="px-3 py-2 text-[11px] text-[#727272]">No playlists yet.</p>
      )}

      {playlists.map((pl) => {
        const already = addedTo.has(pl.id) || pl.tracks.some((t) => sameTrack(t, track));
        return (
          <button
            key={pl.id}
            onClick={() => {
              if (already) return;
              onAddToPlaylist?.(pl.id, track);
              setAddedTo((prev) => new Set(prev).add(pl.id));
            }}
            className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors truncate ${
              already ? 'text-[#1ed760]' : 'text-white hover:bg-[#3e3e3e]'
            }`}
          >
            {already ? <Check size={13} className="shrink-0" /> : <ListMusic size={13} className="shrink-0 opacity-60" />}
            <span className="truncate">{pl.name}</span>
          </button>
        );
      })}

      {creating ? (
        <div className="px-2 pt-1.5 mt-1 border-t border-[#3e3e3e]">
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') setCreating(false);
            }}
            placeholder="Playlist name"
            className="w-full bg-[#121212] text-white px-2 py-1.5 rounded text-xs outline-none focus:ring-1 focus:ring-white placeholder-[#727272]"
          />
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="mt-1.5 w-full py-1.5 rounded text-[11px] font-bold bg-[#1ed760] text-black disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create &amp; Add
          </button>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="w-full text-left px-3 py-1.5 text-xs text-[#b3b3b3] hover:text-white hover:bg-[#3e3e3e] flex items-center gap-2 border-t border-[#3e3e3e] mt-1 pt-2"
        >
          <Plus size={13} /> New playlist
        </button>
      )}
    </div>
  );
}

export function PlaylistPickerButton({
  track,
  playlists = [],
  onAddToPlaylist,
  onCreatePlaylist,
  onClose,
  className = '',
  title = 'Add to playlist',
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title={title}
        className="opacity-0 group-hover:opacity-100 hover:text-white transition-opacity p-1 text-[#a7a7a7]"
      >
        <ListPlus size={16} />
      </button>
      {open && (
        <PlaylistPicker
          track={track}
          playlists={playlists}
          onAddToPlaylist={onAddToPlaylist}
          onCreatePlaylist={onCreatePlaylist}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}