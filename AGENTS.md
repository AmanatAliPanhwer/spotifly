# AGENTS.md — Spotifly

Electron desktop music player. Search YouTube in-app, download to MP3 via a bundled
`yt-dlp.exe`, then play fully offline. Windows-only, x64.

## Commandsds

```powershell
npm run dev              # Vite on :5173 + Electron (HMR) — the only dev entrypoint
npm run dev:renderer     # Vite alone (browser preview; no window.api, so IPC calls throw)
npm run dev:electron     # Electron alone, expects a server already on :5173
npm start                # electron . — loads dist/renderer/index.html (prod mode)
npm run build:renderer   # vite build -> dist/renderer
npm run build:exe        # NSIS installer + portable .exe -> release/
npm run build:portable   # portable only
npm run build:dir        # unpacked build, fastest way to smoke-test packaging
```

There is **no test, lint, typecheck, or formatter** configured, and no CI. Verification is
manual: run `npm run dev` and click through. Don't invent a test command, and don't add
lint config without asking — `package.json` has no ESLint/Prettier deps.

## Setup gotchas

- **`bin/yt-dlp.exe` is git-ignored and untracked** (`.gitignore:10` → `*.exe`). A fresh clone
  has an empty/missing `bin/`, so: downloads fall back to `yt-dlp` on `PATH`
  (`getYtDlpPath()`, `src/main/main.js:35`), and `extraResources: { from: "bin" }` packages
  nothing. Either drop yt-dlp into `bin/` locally or add `!bin/yt-dlp.exe` to `.gitignore`.
  Don't assume the bundled downloader exists.
- **`dist/` is git-ignored too**, so `npm start` on a clean checkout loads a missing file and
  you get a blank window. Run `npm run build:renderer` first.
- **`ffmpeg` must be on `PATH`** for `-x --audio-format mp3`. yt-dlp also needs Node to resolve
  YouTube's JS challenges — that's why `--js-runtimes node` is passed in the download args.
- Dev vs prod is decided *only* by `process.env.NODE_ENV === 'development'`
  (`src/main/main.js:78`). Don't add other dev-mode triggers.

## Layout & module system

- `src/main/` — CommonJS (`"type": "commonjs"` in `package.json`). `main.js` holds every
  IPC handler and all backend logic; `preload.js` is the only bridge to the renderer.
- `src/renderer/` — ESM + JSX, built by Vite (`vite.config.js`: root `src/renderer`,
  out `dist/renderer`, alias `@` → `src/renderer/src`). No router library.
- `vite.config.js` uses ESM syntax despite the CommonJS package type — that's fine (Vite
  bundles its own config); don't "fix" it.

### Module interop trap

`music-metadata` is ESM-only (`"type": "module"`, no CJS entry), so the main process loads it
with `await import('music-metadata')` inside the handler. Keep it dynamic — a top-level
`require()` of it will throw. `yt-search` *is* CJS and is `require`d normally.

## Wiring

`preload.js` exposes `window.api` → IPC → `main.js`:

| Channel | Purpose |
| --- | --- |
| `search-music`, `get-artist-page`, `get-song-page` | `yt-search` scraping (30/40/20 results) |
| `get-local-library` | scans MUSIC_DIR, parses ID3 + embedded art to base64 |
| `download-track`, `cancel-download`, `download-progress` | yt-dlp child process, progress streamed via `webContents.send` |
| `resolve-stream` | `yt-dlp -g` → direct audio URL for online playback (3h session cache) |
| `search-albums` | instant provisional albums, then streams real tags via `album-metadata` events |
| `refresh-metadata` | re-probes sidecars missing an album so old downloads gain albums |
| `delete-track`, `open-music-folder` | filesystem |
| `get-user-data`, `save-user-data` | favorites + playlists JSON |

Add a channel in `main.js` **and** `preload.js`, or the renderer silently gets `undefined`.

## Conventions that aren't obvious

- **Track identity is `trackKey()`, not `filePath || id`.** Always compare tracks with
  `sameTrack(a, b)` from `src/renderer/src/utils/tracks.js`; never inline a key comparison.
  `trackKey` prefers `ytId` over `filePath` because search results carry a YouTube video id
  while library tracks carry a filesystem path — comparing those two shapes directly (the old
  behaviour) silently broke favorites and playlists the moment a track was downloaded.
- **Filename format is load-bearing.** Downloads write
  `` `${artist} - ${title} [${ytId}].mp3` ``. `isTrackDownloaded()` in `App.jsx` matches on
  `filename.includes(track.id)`. Change the template and already-downloaded files stop being
  detected as downloaded (they get re-downloaded).
- **Sidecar metadata.** Each download also writes `<mp3>.json` (id/title/artist/thumbnail/seconds/album/year).
  `get-local-library` prefers ID3 but falls back to the sidecar, surfaces the sidecar's `id`
  as `ytId`, and `delete-track` removes both. Always delete the pair together.
  The sidecar is written from the `info.json` yt-dlp emits alongside the audio
  (`--write-info-json`), so album/artist/year survive even when the extracted ID3
  album tag is empty. That info file is deleted after being folded into the sidecar —
  on success, error, *and* cancel — or it shows up as a stray file in the library folder.
- **Albums are derived, never stored.** `groupAlbums()` in `utils/tracks.js` buckets the
  library by `artist` + `album` ID3 tags. There is no album table — changing the grouping
  changes every album page at once. Its sibling `groupSearchResults()` does the inverse for
  online discovery: it buckets flat search videos by the album tag that arrives *after* the
  search returns.
- **All app state lives in `App.jsx`** (library, favorites, playlists, download statuses, view
  string like `'playlist:123'` / `'album:<key>'`). Views are plain props, not routed
  components — add a view by extending `currentView` + `renderMainView`.
- **No native `prompt`/`confirm`/`alert`.** Use `useDialog()` (`DialogContext`) which returns
  promises: `await dialog.confirm(...)` / `await dialog.prompt(...)` / `dialog.alert(...)`.
- Playback is one `new Audio()` in `src/renderer/src/context/AudioContext.jsx`. Its listeners
  are registered once; `handleNextTrack` is reached from the `ended` handler through
  `handleNextTrackRef`, since the handler is defined after the effect that registers it.
- **Shuffle is an index permutation, not a random pick per skip.** `shuffleRef` holds a
  Fisher-Yates ordering of queue indexes, `shufflePosRef` the cursor into it. `Math.random()`
  per skip repeats tracks — don't reintroduce it. Turning shuffle off clears both refs.
- **Online playback resolves a URL before playing.** `playTrack` → `setSrcAndPlay` →
  `window.api.resolveStream(ytId)`. Resolved URLs are IP-bound and expire, so `AudioContext`
  re-resolves once on a media `error` (guarded by `retryRef`). `isBuffering` covers both the
  resolve round-trip and network rebuffering.

## Security posture — don't loosen further

- The window sets `webSecurity: false` (`src/main/main.js:74`) specifically so `file://` URLs
  can play. Removing it breaks all offline playback.
- `ipcMain.handle('delete-track')` (`src/main/main.js:376`) deletes whatever absolute path the
  renderer sends, with **no check that it's inside `MUSIC_DIR`** — and `delete-track` is
  reachable from a context-isolated but `webSecurity:false` renderer. It's an arbitrary-file-delete
  hole. Keep it in mind if you touch IPC; resolve and validate against `MUSIC_DIR` before unlinking.
- `nodeIntegration: false` / `contextIsolation: true` — don't flip these.

## Known rough edges

Don't assume these are intentional when you hit them:

- `save-user-data` overwrites the whole file, and the default data object declares `playHistory`
  (`main.js:23`) that is never written — so it's dropped on the first save.
- Bulk download fires **one yt-dlp process per track with no concurrency cap**
  (`ArtistView.jsx` `handleDownloadSelected`), each with `-N 4` fragments. Selecting 40 tracks
  spawns 40 processes × 4 fragments.
- Online streams depend on YouTube's `bestaudio` URL staying valid; a stale URL surfaces as
  `playbackError` in the player bar with a "Download instead" fallback, not a crash.
- **Album metadata only exists for videos on official music channels.** A plain user upload
  usually returns an empty `album` field, so album search is *progressive*: `search-albums`
  returns candidates grouped provisionally under the uploader, and `album-metadata` events
  re-group cards as real tags arrive. Probing 24 videos takes ~40s, so never await it before
  rendering.
- `package.json` contains a duplicate `description` key (JSON keeps the last one).