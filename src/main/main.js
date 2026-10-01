const { app, BrowserWindow, ipcMain, shell, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const yts = require('yt-search');
const { spawn } = require('child_process');

// Determine music storage directory: %USERPROFILE%/Music/Spotifly
const MUSIC_DIR = path.join(app.getPath('music'), 'Spotifly');
if (!fs.existsSync(MUSIC_DIR)) {
  fs.mkdirSync(MUSIC_DIR, { recursive: true });
}

// Data storage (playlists, favorites, metadata cache)
const DATA_FILE = path.join(app.getPath('userData'), 'spotifly-data.json');
function loadUserData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Failed reading user data:', err);
  }
  return { favorites: [], playlists: [], playHistory: [] };
}

function saveUserData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed saving user data:', err);
  }
}

// yt-dlp path: check project bin, packaged resources, or system
function getYtDlpPath() {
  if (process.resourcesPath) {
    const resBin = path.join(process.resourcesPath, 'bin', 'yt-dlp.exe');
    if (fs.existsSync(resBin)) {
      return resBin;
    }
  }
  const localBin = path.join(__dirname, '..', '..', 'bin', 'yt-dlp.exe');
  if (fs.existsSync(localBin)) {
    return localBin;
  }
  const appPath = path.join(app.getAppPath(), 'bin', 'yt-dlp.exe');
  if (fs.existsSync(appPath)) {
    return appPath;
  }
  return 'yt-dlp';
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1250,
    height: 820,
    minWidth: 900,
    minHeight: 650,
    backgroundColor: '#121212',
    icon: path.join(__dirname, '..', '..', 'assets', 'icon.ico'),
    frame: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#090909',
      symbolColor: '#b3b3b3',
      height: 38,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false, // Allows playing local file:// or custom scheme media
    },
  });

  const isDev = process.env.NODE_ENV === 'development';
  const prodHtml = path.join(__dirname, '..', '..', 'dist', 'renderer', 'index.html');
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      mainWindow.loadFile(prodHtml);
    });
  } else {
    mainWindow.loadFile(prodHtml);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ==================== IPC HANDLERS ====================

// 1. In-App YouTube Search (No copy pasting needed)
ipcMain.handle('search-music', async (event, query) => {
  if (!query || !query.trim()) return [];
  try {
    const results = await yts(query);
    const videos = (results.videos || []).slice(0, 30).map((v) => ({
      id: v.videoId,
      title: v.title,
      artist: v.author?.name || 'Unknown Artist',
      duration: v.timestamp || '0:00',
      seconds: v.seconds || 0,
      thumbnail: v.thumbnail || v.image || '',
      url: v.url,
      views: v.views,
      ago: v.ago,
    }));
    return videos;
  } catch (err) {
    console.error('Search error:', err);
    throw new Error('Failed searching music: ' + err.message);
  }
});

// 1.1 Artist Page Search (Gets extensive discography and popular tracks for artist)
ipcMain.handle('get-artist-page', async (event, artistName) => {
  if (!artistName || !artistName.trim()) return { artist: '', tracks: [] };
  try {
    const results = await yts(`${artistName} songs`);
    const tracks = (results.videos || []).slice(0, 40).map((v) => ({
      id: v.videoId,
      title: v.title,
      artist: v.author?.name || artistName,
      duration: v.timestamp || '0:00',
      seconds: v.seconds || 0,
      thumbnail: v.thumbnail || v.image || '',
      url: v.url,
      views: v.views,
      ago: v.ago,
    }));
    return {
      artist: artistName,
      tracks: tracks,
      banner: tracks[0]?.thumbnail || '',
    };
  } catch (err) {
    console.error('Artist fetch error:', err);
    return { artist: artistName, tracks: [], banner: '' };
  }
});

// 1.2 Song Details & Related Songs
ipcMain.handle('get-song-page', async (event, track) => {
  try {
    const query = `${track.title} ${track.artist}`;
    const results = await yts(query);
    const related = (results.videos || [])
      .filter((v) => v.videoId !== track.id)
      .slice(0, 20)
      .map((v) => ({
        id: v.videoId,
        title: v.title,
        artist: v.author?.name || track.artist,
        duration: v.timestamp || '0:00',
        seconds: v.seconds || 0,
        thumbnail: v.thumbnail || v.image || '',
        url: v.url,
        views: v.views,
        ago: v.ago,
      }));
    return {
      track: track,
      related: related,
    };
  } catch (err) {
    console.error('Song page fetch error:', err);
    return { track, related: [] };
  }
});

// 2. Scan Offline Local Music Library
ipcMain.handle('get-local-library', async () => {
  try {
    const mm = await import('music-metadata');
    const files = fs.readdirSync(MUSIC_DIR);
    const tracks = [];

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (['.mp3', '.m4a', '.opus', '.wav', '.flac', '.ogg'].includes(ext)) {
        const filePath = path.join(MUSIC_DIR, file);
        const stats = fs.statSync(filePath);
        let title = path.basename(file, ext);
        let artist = 'Offline Artist';
        let album = 'Downloaded';
        let duration = 0;
        let cover = null;
        let ytId = '';

        try {
          const metadata = await mm.parseFile(filePath, { duration: true });
          if (metadata.common.title) title = metadata.common.title;
          if (metadata.common.artist) artist = metadata.common.artist;
          if (metadata.common.album) album = metadata.common.album;
          if (metadata.format.duration) duration = Math.round(metadata.format.duration);

          if (metadata.common.picture && metadata.common.picture.length > 0) {
            const pic = metadata.common.picture[0];
            const base64 = Buffer.from(pic.data).toString('base64');
            cover = `data:${pic.format};base64,${base64}`;
          }
        } catch (e) {
          // If metadata read fails, fallback to filename parsing
        }

        // Also check if there's a sidecar .json or .jpg metadata cached
        const sidecarJson = filePath + '.json';
        if (fs.existsSync(sidecarJson)) {
          try {
            const meta = JSON.parse(fs.readFileSync(sidecarJson, 'utf-8'));
            if (meta.title) title = meta.title;
            if (meta.artist) artist = meta.artist;
            if (meta.thumbnail && !cover) cover = meta.thumbnail;
            if (meta.seconds && !duration) duration = meta.seconds;
            if (meta.id) ytId = meta.id;
            if (meta.album && album === 'Downloaded') album = meta.album;
          } catch (_) {}
        }

        tracks.push({
          id: file,
          ytId: ytId,
          filename: file,
          filePath: filePath,
          url: `file://${filePath.replace(/\\/g, '/')}`,
          title: title,
          artist: artist,
          album: album,
          duration: duration,
          cover: cover,
          size: stats.size,
          createdAt: stats.birthtimeMs || stats.ctimeMs,
        });
      }
    }

    // Sort newest downloads first
    tracks.sort((a, b) => b.createdAt - a.createdAt);
    return tracks;
  } catch (err) {
    console.error('Error fetching local library:', err);
    return [];
  }
});

// yt-dlp exposes real album/artist/year tags, but only for videos on official
// music channels. Probe a batch in a single process and hand each video back as
// its JSON line arrives, so callers can render progressively instead of waiting
// for the whole batch (~1.5-2.5s per video).
let activeProbe = null;

function probeMetadata(videoIds, onMeta) {
  const ids = [...new Set((videoIds || []).filter(Boolean))];
  if (ids.length === 0) return Promise.resolve([]);

  const results = [];

  return new Promise((resolve) => {
    const args = [
      '-j',
      '--no-warnings',
      '--skip-download',
      '--ignore-errors',
      '--no-playlist',
      ...ids.map((id) => `https://www.youtube.com/watch?v=${id}`),
    ];

    const proc = spawn(getYtDlpPath(), args, { windowsHide: true });
    activeProbe = proc;

    let buffer = '';
    proc.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let parsed;
        try {
          parsed = JSON.parse(trimmed);
        } catch (_) {
          continue;
        }
        const meta = {
          id: parsed.id,
          album: parsed.album || '',
          artist: parsed.artist || parsed.artist_name || parsed.uploader || '',
          title: parsed.track || parsed.title || '',
          videoTitle: parsed.title || '',
          year: parsed.release_year || 0,
          duration: Math.round(parsed.duration || 0),
          thumbnail: parsed.thumbnail || '',
        };
        results.push(meta);
        try {
          onMeta?.(meta);
        } catch (_) {}
      }
    });
    proc.stderr.on('data', () => {});
    proc.on('error', () => resolve(results));
    proc.on('close', () => {
      if (activeProbe === proc) activeProbe = null;
      resolve(results);
    });
  });
}

function cancelProbe() {
  if (activeProbe) {
    try {
      activeProbe.kill();
    } catch (_) {}
    activeProbe = null;
  }
}

// 3. Download Music In-App
const activeDownloads = new Map();

const cancelledDownloads = new Set();

ipcMain.handle('download-track', (event, track) => {
  return new Promise((resolve, reject) => {
  const { id, title, artist, thumbnail, seconds } = track;
  const ytDlp = getYtDlpPath();

  // Sanitize filename
  const safeTitle = (title || 'Track').replace(/[/\\?%*:|"<>]/g, '').trim().slice(0, 100);
  const safeArtist = (artist || 'Artist').replace(/[/\\?%*:|"<>]/g, '').trim().slice(0, 50);
  const baseFilename = `${safeArtist} - ${safeTitle} [${id}]`;
  const outputTemplate = path.join(MUSIC_DIR, `${baseFilename}.%(ext)s`);

    // -x/--audio-format: transcode to mp3
    // -N 4: multi-threaded chunk downloading
    // --write-info-json: emit <base>.info.json alongside so we can persist the
    //   real album/artist/year tags instead of hoping ID3 has them
    const args = [
      `https://www.youtube.com/watch?v=${id}`,
      '--js-runtimes', 'node',
      '-N', '4',
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '0',
      '--embed-thumbnail',
      '--add-metadata',
      '--write-info-json',
      '-o', outputTemplate,
      '--newline',
    ];

    const proc = spawn(ytDlp, args, { windowsHide: true });
    activeDownloads.set(id, proc);

    const parseOutput = (data) => {
      const line = data.toString();
      // Match percent, speed, and ETA: [download]  45.2% of 3.42MiB at 2.45MiB/s ETA 00:02
      const percentMatch = line.match(/\[download\]\s+([\d.]+)%/);
      const speedMatch = line.match(/at\s+([^\s]+)/);
      const etaMatch = line.match(/ETA\s+([^\s]+)/);

      if (mainWindow && (percentMatch || speedMatch || etaMatch)) {
        mainWindow.webContents.send('download-progress', {
          id,
          percent: percentMatch ? parseFloat(percentMatch[1]) : undefined,
          speed: speedMatch ? speedMatch[1] : undefined,
          eta: etaMatch ? etaMatch[1] : undefined,
          status: 'downloading',
        });
      }
    };

    proc.stdout.on('data', parseOutput);
    proc.stderr.on('data', parseOutput);

    const infoJsonPath = path.join(MUSIC_DIR, `${baseFilename}.info.json`);
    const discardInfoJson = () => {
      try {
        if (fs.existsSync(infoJsonPath)) fs.unlinkSync(infoJsonPath);
      } catch (_) {}
    };

    proc.on('close', (code) => {
      activeDownloads.delete(id);
      // A user-initiated cancel is not a failure: resolve quietly so the
      // renderer does not raise a spurious "download error" alert.
      if (cancelledDownloads.delete(id)) {
        discardInfoJson();
        resolve({ success: false, cancelled: true });
        return;
      }
      if (code === 0) {
        const expectedMp3 = path.join(MUSIC_DIR, `${baseFilename}.mp3`);

        // Sidecar metadata for fast instant offline load. Album/artist/year come
        // from the info.json yt-dlp just wrote, so albums survive even when the
        // extracted ID3 album tag is missing.
        const sidecarMeta = {
          id,
          title,
          artist,
          thumbnail,
          seconds,
          album: '',
          year: 0,
          downloadedAt: Date.now(),
        };
        try {
          if (fs.existsSync(infoJsonPath)) {
            const info = JSON.parse(fs.readFileSync(infoJsonPath, 'utf-8'));
            sidecarMeta.album = info.album || info.track_album || '';
            sidecarMeta.artist = info.artist || info.uploader || sidecarMeta.artist;
            sidecarMeta.title = info.track || info.title || sidecarMeta.title;
            sidecarMeta.year =
              info.release_year ||
              (info.upload_date ? parseInt(String(info.upload_date).slice(0, 4), 10) : 0) ||
              0;
          }
        } catch (_) {}
        discardInfoJson();

        try {
          fs.writeFileSync(
            expectedMp3 + '.json',
            JSON.stringify(sidecarMeta, null, 2),
            'utf-8'
          );
        } catch (_) {}

        if (mainWindow) {
          mainWindow.webContents.send('download-progress', { id, percent: 100, speed: '', eta: '', status: 'completed' });
        }
        resolve({ success: true, filePath: expectedMp3 });
      } else {
        discardInfoJson();
        if (mainWindow) {
          mainWindow.webContents.send('download-progress', { id, percent: 0, status: 'error' });
        }
        reject(new Error(`Download process exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      activeDownloads.delete(id);
      cancelledDownloads.delete(id);
      if (mainWindow) {
        mainWindow.webContents.send('download-progress', { id, percent: 0, status: 'error' });
      }
      reject(err);
    });
  });
});

// Cancel active download
ipcMain.handle('cancel-download', (event, id) => {
  if (activeDownloads.has(id)) {
    const proc = activeDownloads.get(id);
    cancelledDownloads.add(id);
    try {
      proc.kill();
    } catch (_) {}
    activeDownloads.delete(id);
    if (mainWindow) {
      mainWindow.webContents.send('download-progress', { id, percent: 0, status: 'cancelled' });
    }
    return { success: true };
  }
  return { success: false };
});

// 4. Delete track from offline library
ipcMain.handle('delete-track', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      const sidecar = filePath + '.json';
      if (fs.existsSync(sidecar)) {
        fs.unlinkSync(sidecar);
      }
      return { success: true };
    }
    return { success: false, error: 'File not found' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 5. Open Music Directory in Explorer
ipcMain.handle('open-music-folder', () => {
  shell.openPath(MUSIC_DIR);
});

// 6. User Data (Favorites, Custom Playlists)
ipcMain.handle('get-user-data', () => {
  return loadUserData();
});

ipcMain.handle('save-user-data', (event, data) => {
  saveUserData(data);
  return true;
});

// 7. Resolve a playable direct audio URL for online (non-downloaded) playback.
// yt-dlp -g prints the URL ffmpeg would fetch, which <audio> can stream directly.
// Session cache keeps repeat/prev/skip from re-resolving the same track.
const streamUrlCache = new Map();
const STREAM_TTL_MS = 3 * 60 * 60 * 1000;

ipcMain.handle('resolve-stream', async (event, videoId) => {
  if (!videoId || typeof videoId !== 'string') {
    throw new Error('resolve-stream requires a video id');
  }

  const cached = streamUrlCache.get(videoId);
  if (cached && Date.now() - cached.at < STREAM_TTL_MS) {
    return cached.url;
  }

  const ytDlp = getYtDlpPath();
  const args = [
    '-g',
    '--no-warnings',
    '--no-playlist',
    '--js-runtimes', 'node',
    '-f', 'bestaudio/best',
    `https://www.youtube.com/watch?v=${videoId}`,
  ];

  const url = await new Promise((resolve, reject) => {
    const proc = spawn(ytDlp, args, { windowsHide: true });
    let out = '';
    const timer = setTimeout(() => {
      try {
        proc.kill();
      } catch (_) {}
    }, 30000);

    proc.stdout.on('data', (d) => {
      out += d.toString();
    });
    proc.stderr.on('data', () => {});

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      const line = out
        .split(/\r?\n/)
        .map((s) => s.trim())
        .find((s) => s.startsWith('http'));
      if (code === 0 && line) {
        resolve(line);
      } else {
        reject(new Error('Could not resolve a stream URL for this video'));
      }
    });
  });

  streamUrlCache.set(videoId, { url, at: Date.now() });
  return url;
});

// 8. Album search. Returns candidates immediately so the UI can render, then
// streams real album/artist/year metadata back as yt-dlp resolves each video.
// Album data only exists for videos on official music channels, so the UI must
// treat these as progressively refined results, not a finished answer.
const ALBUM_RESULT_LIMIT = 24;
let currentAlbumToken = '';

ipcMain.handle('search-albums', async (event, query) => {
  if (!query || !query.trim()) return { token: '', tracks: [] };

  // Only one probe can run at a time; a new search supersedes the old one.
  cancelProbe();
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  currentAlbumToken = token;

  let videos = [];
  try {
    const results = await yts(query);
    videos = (results.videos || []).slice(0, ALBUM_RESULT_LIMIT).map((v) => ({
      id: v.videoId,
      title: v.title,
      artist: v.author?.name || 'Unknown Artist',
      duration: v.timestamp || '0:00',
      seconds: v.seconds || 0,
      thumbnail: v.thumbnail || v.image || '',
      views: v.views,
      ago: v.ago,
    }));
  } catch (err) {
    console.error('Album search error:', err);
    return { token, tracks: [] };
  }

  const send = (payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('album-metadata', payload);
    }
  };

  // Fire and forget: probing is slow, so results render first and refine later.
  probeMetadata(
    videos.map((v) => v.id),
    (meta) => {
      if (token !== currentAlbumToken) return;
      send({ token, meta });
    }
  ).then(() => {
    if (token === currentAlbumToken) send({ token, done: true });
  });

  return { token, tracks: videos };
});

// 9. Backfill album metadata for the existing offline library. Tracks without a
// usable album tag get re-probed by video id and their sidecars are rewritten.
ipcMain.handle('refresh-metadata', async () => {
  let files = [];
  try {
    files = fs.readdirSync(MUSIC_DIR);
  } catch (err) {
    return { updated: 0, total: 0 };
  }

  const pending = [];
  for (const file of files) {
    if (path.extname(file).toLowerCase() !== '.mp3') continue;
    const sidecarPath = path.join(MUSIC_DIR, `${file}.json`);
    if (!fs.existsSync(sidecarPath)) continue;
    try {
      const meta = JSON.parse(fs.readFileSync(sidecarPath, 'utf-8'));
      if (meta.album && meta.artist) continue;
      if (meta.id) pending.push({ sidecarPath, meta });
    } catch (_) {}
  }

  if (pending.length === 0) return { updated: 0, total: 0 };

  const found = await probeMetadata(pending.map((p) => p.meta.id));
  let updated = 0;

  for (const entry of found) {
    const match = pending.find((p) => p.meta.id === entry.id);
    if (!match) continue;
    const next = { ...match.meta };
    if (entry.album) next.album = entry.album;
    if (entry.artist) next.artist = entry.artist;
    if (entry.title) next.title = entry.title;
    if (entry.year) next.year = entry.year;
    if (!next.album) continue; // still nothing learned; leave the file alone
    try {
      fs.writeFileSync(match.sidecarPath, JSON.stringify(next, null, 2), 'utf-8');
      updated++;
    } catch (_) {}
  }

  return { updated, total: pending.length };
});
