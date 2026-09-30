import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Player from './components/Player';
import SearchView from './components/SearchView';
import TrackList from './components/TrackList';
import ArtistView from './components/ArtistView';
import SongView from './components/SongView';
import { useAudio } from './context/AudioContext';
import { Heart, Download, Music2, Sparkles, FolderOpen, Play } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'search' | 'library' | 'favorites' | 'artist' | 'song' | 'playlist:id'
  const [selectedArtist, setSelectedArtist] = useState('');
  const [selectedSongTrack, setSelectedSongTrack] = useState(null);
  const [libraryTracks, setLibraryTracks] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [downloadStatuses, setDownloadStatuses] = useState({});
  const { playTrack } = useAudio();

  // Load local library and user data on start
  const refreshLibrary = async () => {
    try {
      const tracks = await window.api.getLocalLibrary();
      setLibraryTracks(tracks);
    } catch (err) {
      console.error('Failed to load local library:', err);
    }
  };

  const loadUserData = async () => {
    try {
      const data = await window.api.getUserData();
      if (data) {
        if (data.favorites) setFavorites(data.favorites);
        if (data.playlists) setPlaylists(data.playlists);
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  };

  useEffect(() => {
    refreshLibrary();
    loadUserData();

    // Listen to download progress events
    const unsub = window.api.onDownloadProgress((data) => {
      setDownloadStatuses((prev) => ({
        ...prev,
        [data.id]: data,
      }));

      if (data.status === 'completed') {
        refreshLibrary();
      }
    });

    return () => unsub();
  }, []);

  const saveUserData = (newFavs, newPlaylists) => {
    window.api.saveUserData({
      favorites: newFavs !== undefined ? newFavs : favorites,
      playlists: newPlaylists !== undefined ? newPlaylists : playlists,
    });
  };

  // Toggle favorite
  const handleToggleFavorite = (track) => {
    const exists = favorites.some((f) => (f.filePath || f.id) === (track.filePath || track.id));
    let newFavs;
    if (exists) {
      newFavs = favorites.filter((f) => (f.filePath || f.id) !== (track.filePath || track.id));
    } else {
      newFavs = [track, ...favorites];
    }
    setFavorites(newFavs);
    saveUserData(newFavs, playlists);
  };

  // Create playlist
  const handleCreatePlaylist = () => {
    const name = prompt('Enter playlist name:');
    if (!name || !name.trim()) return;
    const newPlaylist = {
      id: Date.now().toString(),
      name: name.trim(),
      tracks: [],
    };
    const newPlaylists = [...playlists, newPlaylist];
    setPlaylists(newPlaylists);
    saveUserData(favorites, newPlaylists);
    setCurrentView(`playlist:${newPlaylist.id}`);
  };

  // Add track to playlist
  const handleAddToPlaylist = (playlistId, track) => {
    const newPlaylists = playlists.map((pl) => {
      if (pl.id === playlistId) {
        const alreadyIn = pl.tracks.some((t) => (t.filePath || t.id) === (track.filePath || track.id));
        if (alreadyIn) return pl;
        return { ...pl, tracks: [...pl.tracks, track] };
      }
      return pl;
    });
    setPlaylists(newPlaylists);
    saveUserData(favorites, newPlaylists);
  };

  // Delete track from storage
  const handleDeleteTrack = async (filePath) => {
    const res = await window.api.deleteTrack(filePath);
    if (res.success) {
      refreshLibrary();
      // Remove from favorites if present
      const newFavs = favorites.filter((f) => f.filePath !== filePath);
      setFavorites(newFavs);
      // Remove from playlists
      const newPlaylists = playlists.map((pl) => ({
        ...pl,
        tracks: pl.tracks.filter((t) => t.filePath !== filePath),
      }));
      setPlaylists(newPlaylists);
      saveUserData(newFavs, newPlaylists);
    }
  };

  // In-App Download handler
  const handleDownloadTrack = async (track) => {
    setDownloadStatuses((prev) => ({
      ...prev,
      [track.id]: { id: track.id, percent: 5, status: 'downloading' },
    }));

    try {
      await window.api.downloadTrack(track);
      refreshLibrary();
    } catch (err) {
      console.error('Download error:', err);
      alert('Download error: ' + err.message);
      setDownloadStatuses((prev) => ({
        ...prev,
        [track.id]: { id: track.id, percent: 0, status: 'error' },
      }));
    }
  };

  // Cancel download handler
  const handleCancelDownload = async (id) => {
    try {
      await window.api.cancelDownload(id);
      setDownloadStatuses((prev) => ({
        ...prev,
        [id]: { id, percent: 0, status: 'cancelled' },
      }));
    } catch (err) {
      console.error('Cancel download error:', err);
    }
  };

  const isTrackDownloaded = (track) => {
    return libraryTracks.some(
      (lib) => lib.filename.includes(track.id) || (lib.title === track.title && lib.artist === track.artist)
    );
  };

  // Open artist page
  const handleOpenArtistPage = (artistName) => {
    setSelectedArtist(artistName);
    setCurrentView('artist');
  };

  // Open song page
  const handleOpenSongPage = (track) => {
    setSelectedSongTrack(track);
    setCurrentView('song');
  };

  // Determine current main view
  const renderMainView = () => {
    if (currentView === 'search') {
      return (
        <SearchView
          onDownload={handleDownloadTrack}
          onCancelDownload={handleCancelDownload}
          onOpenArtistPage={handleOpenArtistPage}
          onOpenSongPage={handleOpenSongPage}
          downloadStatuses={downloadStatuses}
          isDownloaded={isTrackDownloaded}
        />
      );
    }

    if (currentView === 'artist') {
      return (
        <ArtistView
          artistName={selectedArtist}
          onDownload={handleDownloadTrack}
          onCancelDownload={handleCancelDownload}
          onOpenSongPage={handleOpenSongPage}
          downloadStatuses={downloadStatuses}
          isDownloaded={isTrackDownloaded}
        />
      );
    }

    if (currentView === 'song') {
      return (
        <SongView
          track={selectedSongTrack}
          onDownload={handleDownloadTrack}
          onCancelDownload={handleCancelDownload}
          onOpenArtistPage={handleOpenArtistPage}
          onOpenSongPage={handleOpenSongPage}
          downloadStatuses={downloadStatuses}
          isDownloaded={isTrackDownloaded}
        />
      );
    }

    if (currentView === 'library') {
      return (
        <TrackList
          title="Downloaded Tracks"
          subtitle={`${libraryTracks.length} offline tracks downloaded & ready on your device`}
          icon={Download}
          headerBg="from-[#006450] to-[#121212]"
          tracks={libraryTracks}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          onDeleteTrack={handleDeleteTrack}
          onOpenFolder={() => window.api.openMusicFolder()}
          playlists={playlists}
          onAddToPlaylist={handleAddToPlaylist}
          onOpenArtistPage={handleOpenArtistPage}
          onOpenSongPage={handleOpenSongPage}
        />
      );
    }

    if (currentView === 'favorites') {
      return (
        <TrackList
          title="Liked Songs"
          subtitle={`${favorites.length} favorite songs saved`}
          icon={Heart}
          headerBg="from-[#450af5] to-[#121212]"
          tracks={favorites}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          onDeleteTrack={handleDeleteTrack}
          playlists={playlists}
          onAddToPlaylist={handleAddToPlaylist}
          onOpenArtistPage={handleOpenArtistPage}
          onOpenSongPage={handleOpenSongPage}
        />
      );
    }

    if (currentView.startsWith('playlist:')) {
      const plId = currentView.split(':')[1];
      const pl = playlists.find((p) => p.id === plId);
      if (!pl) return null;
      return (
        <TrackList
          title={pl.name}
          subtitle={`Custom Playlist • ${pl.tracks.length} tracks`}
          tracks={pl.tracks}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          playlists={playlists}
          onAddToPlaylist={handleAddToPlaylist}
          onOpenArtistPage={handleOpenArtistPage}
          onOpenSongPage={handleOpenSongPage}
        />
      );
    }

    // Default 'home' view
    return (
      <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-b from-[#202020] to-[#121212] flex flex-col gap-8">
        {/* Welcome Banner */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Good evening</h1>
            <p className="text-sm text-[#b3b3b3] mt-1">
              Your offline music sanctuary. Download once, listen anytime without internet.
            </p>
          </div>
          <button
            onClick={() => setCurrentView('search')}
            className="flex items-center gap-2 bg-[#1ed760] text-black font-bold px-4 py-2 rounded-full text-xs hover:scale-105 transition-transform"
          >
            <Sparkles size={16} />
            <span>Search & Add Music</span>
          </button>
        </div>

        {/* Quick Access Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            onClick={() => setCurrentView('favorites')}
            className="flex items-center bg-[#2b2b2b]/60 hover:bg-[#383838] transition-colors rounded-md overflow-hidden cursor-pointer group shadow"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-[#450af5] to-[#c4efd9] flex items-center justify-center text-white shrink-0">
              <Heart size={24} fill="currentColor" />
            </div>
            <div className="flex-1 px-4 flex items-center justify-between">
              <span className="font-bold text-sm text-white">Liked Songs</span>
              <span className="text-xs text-[#a7a7a7]">{favorites.length} songs</span>
            </div>
          </div>

          <div
            onClick={() => setCurrentView('library')}
            className="flex items-center bg-[#2b2b2b]/60 hover:bg-[#383838] transition-colors rounded-md overflow-hidden cursor-pointer group shadow"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-[#006450] to-[#1ed760] flex items-center justify-center text-white shrink-0">
              <Download size={24} />
            </div>
            <div className="flex-1 px-4 flex items-center justify-between">
              <span className="font-bold text-sm text-white">Downloaded Tracks</span>
              <span className="text-xs text-[#a7a7a7]">{libraryTracks.length} offline</span>
            </div>
          </div>

          <div
            onClick={() => setCurrentView('search')}
            className="flex items-center bg-[#2b2b2b]/60 hover:bg-[#383838] transition-colors rounded-md overflow-hidden cursor-pointer group shadow"
          >
            <div className="w-16 h-16 bg-[#333333] flex items-center justify-center text-[#1ed760] shrink-0">
              <Music2 size={24} />
            </div>
            <div className="flex-1 px-4 flex items-center justify-between">
              <span className="font-bold text-sm text-white">Explore & Download</span>
              <span className="text-xs text-[#a7a7a7]">In-App Search</span>
            </div>
          </div>
        </div>

        {/* Recently Downloaded Tracks Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight">Recently Downloaded</h2>
            {libraryTracks.length > 5 && (
              <button
                onClick={() => setCurrentView('library')}
                className="text-xs font-bold text-[#b3b3b3] hover:underline"
              >
                Show all
              </button>
            )}
          </div>

          {libraryTracks.length === 0 ? (
            <div className="bg-[#181818] border border-[#282828] rounded-xl p-8 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#242424] flex items-center justify-center text-[#1ed760]">
                <Music2 size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Your Offline Library is Empty</h3>
                <p className="text-xs text-[#a7a7a7] max-w-sm mt-1">
                  You don't need any YouTube links! Just use the in-app search, find your favorite song or artist, and hit Download.
                </p>
              </div>
              <button
                onClick={() => setCurrentView('search')}
                className="bg-white text-black font-bold text-xs px-5 py-2.5 rounded-full hover:scale-105 transition-transform"
              >
                Start Searching Music
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {libraryTracks.slice(0, 12).map((track, idx) => (
                <div
                  key={track.filePath || track.id}
                  onClick={() => playTrack(track, libraryTracks, idx)}
                  className="bg-[#181818] hover:bg-[#282828] p-3.5 rounded-lg flex flex-col gap-3 transition-colors cursor-pointer group relative shadow"
                >
                  <div className="relative w-full aspect-square rounded-md overflow-hidden bg-[#242424] shadow-md">
                    {track.cover ? (
                      <img src={track.cover} alt="" className="w-full h-full object-cover" />
                    ) : track.thumbnail ? (
                      <img src={track.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#727272]">
                        <Music2 size={32} />
                      </div>
                    )}
                    <button className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[#1ed760] text-black flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all shadow-xl hover:scale-105">
                      <Play size={18} fill="currentColor" className="ml-0.5" />
                    </button>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm text-white truncate">{track.title}</span>
                    <span className="text-xs text-[#a7a7a7] truncate">{track.artist}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-black">
      {/* Draggable Title Bar / Header */}
      <div
        className="h-9 bg-[#000000] flex items-center px-4 justify-between border-b border-[#181818] select-none text-xs text-[#727272]"
        style={{ WebkitAppRegion: 'drag' }}
      >
        <span className="font-semibold text-[#a7a7a7]">Spotifly Desktop</span>
        <span className="text-[11px] bg-[#181818] px-2 py-0.5 rounded text-[#727272]">Offline Mode Ready</span>
      </div>

      {/* Main Layout Body */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentView={currentView}
          setCurrentView={setCurrentView}
          playlists={playlists}
          onCreatePlaylist={handleCreatePlaylist}
          onOpenFolder={() => window.api.openMusicFolder()}
          downloadCount={libraryTracks.length}
        />
        {renderMainView()}
      </div>

      {/* Spotify Bottom Audio Controller */}
      <Player
        favorites={favorites}
        onToggleFavorite={handleToggleFavorite}
        onOpenSongPage={handleOpenSongPage}
        onOpenArtistPage={handleOpenArtistPage}
      />
    </div>
  );
}
