import React from 'react';
import { Home, Search, Library, Plus, Heart, Music, FolderOpen, Download, Disc3 } from 'lucide-react';

export default function Sidebar({
  currentView,
  setCurrentView,
  playlists,
  onCreatePlaylist,
  onOpenFolder,
  downloadCount = 0,
  albumCount = 0,
}) {
  return (
    <aside className="w-64 bg-[#000000] flex flex-col gap-2 p-2 select-none h-full text-[#b3b3b3]">
      {/* Brand & Main Navigation */}
      <div className="bg-[#121212] rounded-lg p-4 flex flex-col gap-4">
        <div className="flex items-center gap-3 px-2 text-white font-bold text-xl tracking-tight">
          <div className="w-8 h-8 rounded-full bg-[#1ed760] flex items-center justify-center text-black">
            <Music size={20} strokeWidth={2.5} />
          </div>
          <span>Spotifly</span>
        </div>

        <nav className="flex flex-col gap-1 mt-2">
          <button
            onClick={() => setCurrentView('home')}
            className={`flex items-center gap-4 px-3 py-2.5 rounded-md font-semibold text-sm transition-colors duration-150 ${
              currentView === 'home' ? 'text-white bg-[#282828]' : 'hover:text-white'
            }`}
          >
            <Home size={22} />
            <span>Home</span>
          </button>

          <button
            onClick={() => setCurrentView('search')}
            className={`flex items-center gap-4 px-3 py-2.5 rounded-md font-semibold text-sm transition-colors duration-150 ${
              currentView === 'search' ? 'text-white bg-[#282828]' : 'hover:text-white'
            }`}
          >
            <Search size={22} />
            <span>Search & Download</span>
          </button>
        </nav>
      </div>

      {/* Your Library Section */}
      <div className="bg-[#121212] rounded-lg flex-1 flex flex-col p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-4 px-1">
          <button
            onClick={() => setCurrentView('library')}
            className={`flex items-center gap-2 font-bold text-sm transition-colors duration-150 ${
              currentView === 'library' ? 'text-white' : 'hover:text-white'
            }`}
          >
            <Library size={22} />
            <span>Your Library</span>
          </button>

          <button
            onClick={onCreatePlaylist}
            title="Create Playlist"
            className="p-1 hover:text-white hover:bg-[#282828] rounded-full transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Quick Collections */}
        <div className="flex flex-col gap-1 overflow-y-auto flex-1 pr-1">
          <button
            onClick={() => setCurrentView('albums')}
            className={`flex items-center gap-3 p-2 rounded-md transition-colors text-left ${
              currentView === 'albums' ? 'bg-[#282828] text-white' : 'hover:bg-[#1a1a1a] hover:text-white'
            }`}
          >
            <div className="w-10 h-10 rounded bg-gradient-to-br from-[#4a3a6b] to-[#c4b5fd] flex items-center justify-center text-white shrink-0">
              <Disc3 size={18} />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate text-white">Albums</p>
              <p className="text-xs text-[#a7a7a7]">{albumCount} from library</p>
            </div>
          </button>

          <button
            onClick={() => setCurrentView('favorites')}
            className={`flex items-center gap-3 p-2 rounded-md transition-colors text-left ${
              currentView === 'favorites' ? 'bg-[#282828] text-white' : 'hover:bg-[#1a1a1a] hover:text-white'
            }`}
          >
            <div className="w-10 h-10 rounded bg-gradient-to-br from-[#450af5] to-[#c4efd9] flex items-center justify-center text-white shrink-0">
              <Heart size={18} fill="currentColor" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate text-white">Liked Songs</p>
              <p className="text-xs text-[#a7a7a7]">Playlist</p>
            </div>
          </button>

          <button
            onClick={() => setCurrentView('library')}
            className={`flex items-center gap-3 p-2 rounded-md transition-colors text-left ${
              currentView === 'library' ? 'bg-[#282828] text-white' : 'hover:bg-[#1a1a1a] hover:text-white'
            }`}
          >
            <div className="w-10 h-10 rounded bg-gradient-to-br from-[#006450] to-[#1ed760] flex items-center justify-center text-white shrink-0">
              <Download size={18} />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate text-white">Downloaded Tracks</p>
              <p className="text-xs text-[#a7a7a7]">{downloadCount} tracks offline</p>
            </div>
          </button>

          {/* User Custom Playlists */}
          {playlists.length > 0 && (
            <div className="pt-2 mt-2 border-t border-[#242424] flex flex-col gap-1">
              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => setCurrentView(`playlist:${pl.id}`)}
                  className={`flex items-center gap-3 p-2 rounded-md transition-colors text-left ${
                    currentView === `playlist:${pl.id}` ? 'bg-[#282828] text-white' : 'hover:bg-[#1a1a1a] hover:text-white'
                  }`}
                >
                  <div className="w-10 h-10 rounded bg-[#282828] flex items-center justify-center text-[#b3b3b3] shrink-0 font-bold">
                    {pl.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium truncate text-white">{pl.name}</p>
                    <p className="text-xs text-[#a7a7a7]">Playlist • {pl.tracks?.length || 0} songs</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Offline Storage Info & Folder Button */}
        <div className="pt-3 border-t border-[#242424] mt-2 flex items-center justify-between text-xs text-[#a7a7a7]">
          <span>Offline Storage</span>
          <button
            onClick={onOpenFolder}
            title="Open Offline Music Folder"
            className="flex items-center gap-1.5 hover:text-white transition-colors bg-[#1f1f1f] px-2.5 py-1 rounded"
          >
            <FolderOpen size={13} />
            <span>Files</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
