import React, { useState, useEffect } from 'react';
import {
  Download,
  CheckCircle,
  Loader2,
  Music,
  CheckSquare,
  Square,
  Sparkles,
  Zap,
  XCircle,
  UserCheck,
} from 'lucide-react';

export default function ArtistView({
  artistName,
  onDownload,
  onCancelDownload,
  onOpenSongPage,
  downloadStatuses = {},
  isDownloaded,
}) {
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState([]);
  const [banner, setBanner] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    let active = true;
    setLoading(true);
    setSelectedIds(new Set());

    window.api
      .getArtistPage(artistName)
      .then((data) => {
        if (!active) return;
        setTracks(data.tracks || []);
        setBanner(data.banner || '');
      })
      .catch((err) => {
        console.error('Error fetching artist:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [artistName]);

  const toggleSelectTrack = (trackId) => {
    const next = new Set(selectedIds);
    if (next.has(trackId)) {
      next.delete(trackId);
    } else {
      next.add(trackId);
    }
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === tracks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tracks.map((t) => t.id)));
    }
  };

  // Download selected songs in parallel
  const handleDownloadSelected = () => {
    const selectedTracks = tracks.filter(
      (t) => selectedIds.has(t.id) && !isDownloaded(t)
    );
    selectedTracks.forEach((track) => {
      onDownload(track);
    });
    setSelectedIds(new Set());
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-gradient-to-b from-[#1e1e1e] to-[#121212]">
      {/* Artist Hero Header */}
      <div className="relative p-8 bg-gradient-to-b from-[#3b2d54] to-[#181818] flex items-end gap-6 shadow-lg min-h-[220px]">
        <div className="w-40 h-40 rounded-full bg-[#242424] shadow-2xl overflow-hidden shrink-0 border-4 border-black/40 flex items-center justify-center">
          {banner ? (
            <img src={banner} alt={artistName} className="w-full h-full object-cover" />
          ) : (
            <Music size={60} className="text-[#a7a7a7]" />
          )}
        </div>

        <div className="flex flex-col gap-2 overflow-hidden z-10">
          <div className="flex items-center gap-1.5 text-xs uppercase font-bold tracking-wider text-[#1ed760]">
            <UserCheck size={16} />
            <span>Verified Artist</span>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tight truncate">{artistName}</h1>
          <p className="text-xs text-[#b3b3b3]">
            {tracks.length} discography & popular releases available for offline download
          </p>
        </div>
      </div>

      {/* Bulk Download & Selection Action Bar */}
      <div className="px-8 py-4 flex items-center justify-between border-b border-[#242424] bg-[#141414]/90 sticky top-0 z-20 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            onClick={selectAll}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#242424] hover:bg-[#333333] text-white border border-[#3e3e3e] transition-colors"
          >
            {selectedIds.size === tracks.length && tracks.length > 0 ? (
              <CheckSquare size={15} className="text-[#1ed760]" />
            ) : (
              <Square size={15} />
            )}
            <span>
              {selectedIds.size === tracks.length && tracks.length > 0
                ? 'Deselect All'
                : 'Select All'}
            </span>
          </button>

          {selectedIds.size > 0 && (
            <button
              onClick={handleDownloadSelected}
              className="flex items-center gap-2 bg-[#1ed760] text-black font-bold text-xs px-4 py-1.5 rounded-full hover:scale-105 active:scale-95 transition-all shadow-md"
            >
              <Download size={15} />
              <span>Download Selected ({selectedIds.size})</span>
            </button>
          )}
        </div>

        <span className="text-xs text-[#a7a7a7]">
          Tip: Click checkbox to select multiple tracks for batch parallel download
        </span>
      </div>

      {/* Tracks List */}
      <div className="px-8 py-4 flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#a7a7a7]">
            <Loader2 size={36} className="animate-spin text-[#1ed760]" />
            <p className="text-sm">Loading songs by {artistName}...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {tracks.map((track, idx) => {
              const status = downloadStatuses[track.id];
              const alreadyDownloaded = isDownloaded(track);
              const isDownloading = status && status.status === 'downloading';
              const isSelected = selectedIds.has(track.id);

              return (
                <div
                  key={track.id}
                  className={`flex items-center justify-between p-2.5 rounded-md hover:bg-[#282828] transition-colors group ${
                    isSelected ? 'bg-[#252525]' : ''
                  }`}
                >
                  {/* Checkbox & Track Info */}
                  <div className="flex items-center gap-3 flex-1 overflow-hidden">
                    <button
                      onClick={() => toggleSelectTrack(track.id)}
                      className="text-[#727272] hover:text-white p-1"
                    >
                      {isSelected ? (
                        <CheckSquare size={16} className="text-[#1ed760]" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>

                    <div className="relative w-11 h-11 rounded overflow-hidden bg-[#242424] shrink-0">
                      {track.thumbnail ? (
                        <img src={track.thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#727272]">
                          <Music size={18} />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col overflow-hidden">
                      <span
                        onClick={() => onOpenSongPage && onOpenSongPage(track)}
                        className="text-white text-sm font-medium truncate group-hover:text-[#1ed760] transition-colors cursor-pointer hover:underline"
                      >
                        {track.title}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-[#a7a7a7] truncate">
                        <span>{track.duration}</span>
                        {track.views && (
                          <>
                            <span>•</span>
                            <span>{track.views.toLocaleString()} views</span>
                          </>
                        )}
                        {track.ago && (
                          <>
                            <span>•</span>
                            <span>{track.ago}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Download Controls */}
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    {alreadyDownloaded ? (
                      <div className="flex items-center gap-1.5 text-xs text-[#1ed760] font-medium bg-[#1ed760]/10 px-3 py-1.5 rounded-full border border-[#1ed760]/30">
                        <CheckCircle size={14} />
                        <span>Downloaded</span>
                      </div>
                    ) : isDownloading ? (
                      <div className="flex items-center gap-2 text-xs text-white bg-[#282828] border border-[#3e3e3e] px-3 py-1.5 rounded-full shadow">
                        <Loader2 size={13} className="animate-spin text-[#1ed760]" />
                        <span className="font-bold text-[#1ed760]">{Math.round(status.percent || 0)}%</span>
                        {status.speed && (
                          <span className="text-[11px] text-[#b3b3b3] hidden sm:inline flex items-center gap-0.5">
                            <Zap size={11} className="text-yellow-400" />
                            {status.speed}
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
                        <span>Download</span>
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
