import React, { useMemo } from 'react';
import { Disc3, Play, Music2, RefreshCw } from 'lucide-react';
import { groupAlbums } from '../utils/tracks';

export default function AlbumsView({
  tracks = [],
  onOpenAlbum,
  onRefreshMetadata,
  isRefreshing = false,
}) {
  const albums = useMemo(() => groupAlbums(tracks), [tracks]);
  const unknownCount = useMemo(
    () => albums.filter((a) => a.name === 'Unknown Album').length,
    [albums]
  );

  if (albums.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#181818] to-[#121212] flex flex-col items-center justify-center gap-4 text-center px-8">
        <div className="w-16 h-16 rounded-full bg-[#242424] flex items-center justify-center text-[#1ed760]">
          <Disc3 size={32} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">No albums yet</h2>
          <p className="text-xs text-[#a7a7a7] max-w-sm mt-1">
            Albums are grouped automatically from the album tag written into each downloaded file.
            Download a few tracks and they will show up here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#181818] to-[#121212] p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Albums</h1>
          <p className="text-sm text-[#b3b3b3] mt-1">
            {albums.length} albums grouped from your downloaded tracks
            {unknownCount > 0 && ` · ${unknownCount} awaiting album tags`}
          </p>
        </div>

        {onRefreshMetadata && (
          <button
            onClick={onRefreshMetadata}
            disabled={isRefreshing}
            className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-full bg-[#242424] hover:bg-[#333333] text-white border border-[#3e3e3e] transition-colors disabled:opacity-50 shrink-0"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Reading tags…' : 'Refresh album metadata'}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {albums.map((album) => (
          <div
            key={album.key}
            onClick={() => onOpenAlbum?.(album)}
            className="bg-[#181818] hover:bg-[#282828] p-3.5 rounded-lg flex flex-col gap-3 transition-colors cursor-pointer group shadow"
          >
            <div className="relative w-full aspect-square rounded-md overflow-hidden bg-[#242424] shadow-md">
              {album.cover ? (
                <img src={album.cover} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#727272]">
                  <Music2 size={32} />
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAlbum?.(album);
                }}
                className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1ed760] text-black flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all shadow-xl hover:scale-105"
              >
                <Play size={18} fill="currentColor" className="ml-0.5" />
              </button>
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm text-white truncate">{album.name}</span>
              <span className="text-xs text-[#a7a7a7] truncate">
                {album.artist} • {album.tracks.length} song{album.tracks.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}