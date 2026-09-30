<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="Spotifly Logo" />
</p>

<h1 align="center">Spotifly</h1>

<p align="center">
  <b>Modern Offline Music Player with In-App YouTube Search & Accelerated Downloader</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-44.5.1-47848F?logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Release-v1.0.0-1ED760" alt="Release v1.0.0" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" />
</p>

---

## ✨ Features

- 🔍 **Zero-Friction In-App Music Search**: Search any song, artist, album, or vibe directly inside Spotifly — no URLs or copy-pasting needed.
- ⚡ **Accelerated Parallel Downloads**: Multi-threaded segment downloader (`-N 4`) with live speed badge (`MB/s`), remaining ETA, and cancel support.
- 🎤 **Artist Pages & Discographies**: Click any artist name to explore their popular tracks and view statistics.
- 📦 **Bulk / Selective Downloads**: Select multiple songs with checkboxes on artist pages and download them simultaneously in parallel.
- 🎶 **Song Detail & Related Tracks**: Discover variations, recommendations, and related releases for any song.
- 🎧 **True Offline Playback**:
  - Automatically reads ID3 tags and embedded album artwork via `music-metadata`.
  - Scrubbing slider, volume control, mute, shuffle, loop-all, and loop-one modes.
  - Curate your own **Liked Songs** and custom offline playlists.
  - Works anywhere without an active internet connection.
- 💻 **Premium Desktop UI**:
  - Frameless Spotify dark-mode aesthetic with custom Windows titlebar controls.
  - Quick **Files** button to open the offline songs storage directory in Windows Explorer.

---

## 🚀 Installation & Downloads

Prebuilt executables are provided for Windows (x64):
- **Installer**: `Spotifly Setup 1.0.0.exe` (NSIS setup wizard with desktop & start menu shortcuts)
- **Portable**: `Spotifly 1.0.0.exe` (Double-click to run anywhere without installation)

---

## 🛠️ Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [ffmpeg](https://ffmpeg.org/) installed and available in system PATH

### Quickstart
```powershell
# Clone the repository
git clone https://github.com/AmanatAliPanhwer/spotifly.git
cd spotifly

# Install dependencies
npm install

# Start in development mode (Vite HMR + Electron)
npm run dev

# Or build executables
npm run build:exe
```

---

## 📂 Offline Audio Location

All downloaded audio is stored locally in:
```text
%USERPROFILE%\Music\Spotifly
```

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
Spotifly is an open-source educational project for personal offline music playback.
