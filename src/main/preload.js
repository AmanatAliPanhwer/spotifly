const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Search & Exploration
  searchMusic: (query) => ipcRenderer.invoke('search-music', query),
  getArtistPage: (artistName) => ipcRenderer.invoke('get-artist-page', artistName),
  getSongPage: (track) => ipcRenderer.invoke('get-song-page', track),

  // Album discovery + metadata backfill
  searchAlbums: (query) => ipcRenderer.invoke('search-albums', query),
  refreshMetadata: () => ipcRenderer.invoke('refresh-metadata'),
  onAlbumMetadata: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('album-metadata', handler);
    return () => ipcRenderer.removeListener('album-metadata', handler);
  },

  // Library
  getLocalLibrary: () => ipcRenderer.invoke('get-local-library'),
  deleteTrack: (filePath) => ipcRenderer.invoke('delete-track', filePath),
  openMusicFolder: () => ipcRenderer.invoke('open-music-folder'),

  // Downloads
  downloadTrack: (track) => ipcRenderer.invoke('download-track', track),
  cancelDownload: (id) => ipcRenderer.invoke('cancel-download', id),

  // Online streaming (resolve a direct audio URL without downloading to disk)
  resolveStream: (videoId) => ipcRenderer.invoke('resolve-stream', videoId),
  onDownloadProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('download-progress', handler);
    return () => ipcRenderer.removeListener('download-progress', handler);
  },

  // User Data (Favorites, Playlists)
  getUserData: () => ipcRenderer.invoke('get-user-data'),
  saveUserData: (data) => ipcRenderer.invoke('save-user-data', data),
});
