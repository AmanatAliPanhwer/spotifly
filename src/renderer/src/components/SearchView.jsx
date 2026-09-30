import React, { useState } from 'react';
import { Search as SearchIcon, Download, CheckCircle, Loader2, Music, Sparkles, Zap, XCircle } from 'lucide-react';

const SUGGESTED_TAGS = [
  'Top Hits 2026',
  'Lo-Fi Beats',
  'Synthwave',
  'Acoustic Covers',
  'Rock Classics',
  'Hip Hop Workout',
  'Relaxing Piano',
  'Chillout Lounge',
];

export default function SearchView({
  onDownload,
  onCancelDownload,
  onOpenArtistPage,
  onOpenSongPage,
  downloadStatuses = {},
  isDownloaded,
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (searchQuery) => {
    const q = searchQuery !== undefined ? searchQuery : query;
    if (!q.trim()) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const items = await window.api.searchMusic(q);
      setResults(items);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 bg-gradient-to-b from-[#1e1e1e] to-[#121212]">
      {/* Search Header */}
      <div className="flex flex-col gap-4 max-w-3xl">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Search & Download</h1>
        <p className="text-sm text-[#a7a7a7]">
          Search any song, artist, album, or vibe. Click download to store the music locally for offline playback!
        </p>

        <div className="relative flex items-center">
          <SearchIcon size={20} className="absolute left-4 text-[#727272]" />
          <input
            type="text"
            placeholder="What do you want to play or download?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            className="w-full bg-[#242424] hover:bg-[#2a2a2a] focus:bg-[#242424] text-white pl-12 pr-28 py-3.5 rounded-full text-sm font-medium outline-none focus:ring-2 focus:ring-white transition-all shadow-inner"
          />
          <button
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            className="absolute right-2 px-5 py-2 bg-[#1ed760] text-black font-bold text-xs rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 cursor-pointer"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
          </button>
        </div>

        {/* Suggested Quick Tags */}
        <div className="flex items-center gap-2 flex-wrap pt-2">
          <span className="text-xs text-[#727272] flex items-center gap-1 font-semibold">
            <Sparkles size={14} className="text-[#1ed760]" /> Quick searches:
          </span>
          {SUGGESTED_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => {
                setQuery(tag);
                handleSearch(tag);
              }}
              className="text-xs bg-[#242424] hover:bg-[#333333] text-white px-3 py-1.5 rounded-full transition-colors font-medium border border-[#303030]"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Results List */}
      <div className="mt-8 flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#a7a7a7]">
            <Loader2 size={36} className="animate-spin text-[#1ed760]" />
            <p className="text-sm">Fetching songs and high quality audio streams...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-white mb-2">Search Results ({results.length})</h2>

            <div className="grid grid-cols-1 gap-1">
              {results.map((track) => {
                const status = downloadStatuses[track.id];
                const alreadyDownloaded = isDownloaded(track);
                const isDownloading = status && status.status === 'downloading';

                return (
                  <div
                    key={track.id}
                    className="flex items-center justify-between p-3 rounded-md hover:bg-[#282828] transition-colors group"
                  >
                    <div className="flex items-center gap-4 flex-1 overflow-hidden">
                      <div className="relative w-12 h-12 rounded overflow-hidden bg-[#242424] shrink-0">
                        {track.thumbnail ? (
                          <img src={track.thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#727272]">
                            <Music size={20} />
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
                          <button
                            onClick={() => onOpenArtistPage && onOpenArtistPage(track.artist)}
                            className="hover:underline hover:text-white transition-colors"
                          >
                            {track.artist}
                          </button>
                          <span>•</span>
                          <span>{track.duration}</span>
                          {track.ago && (
                            <>
                              <span>•</span>
                              <span>{track.ago}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Download Action Button */}
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      {alreadyDownloaded ? (
                        <div className="flex items-center gap-1.5 text-xs text-[#1ed760] font-medium bg-[#1ed760]/10 px-3 py-1.5 rounded-full border border-[#1ed760]/30">
                          <CheckCircle size={14} />
                          <span>Downloaded</span>
                        </div>
                      ) : isDownloading ? (
                        <div className="flex items-center gap-2.5 text-xs text-white bg-[#282828] border border-[#3e3e3e] px-3 py-1.5 rounded-full shadow">
                          <Loader2 size={13} className="animate-spin text-[#1ed760]" />
                          <span className="font-bold text-[#1ed760]">{Math.round(status.percent || 0)}%</span>
                          {status.speed && (
                            <span className="text-[11px] text-[#b3b3b3] hidden sm:inline flex items-center gap-0.5">
                              <Zap size={11} className="text-yellow-400" />
                              {status.speed}
                            </span>
                          )}
                          {status.eta && (
                            <span className="text-[10px] text-[#727272] hidden md:inline">
                              ETA {status.eta}
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
                          <span>Download Audio</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : hasSearched ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#a7a7a7] gap-2">
            <p className="text-base text-white font-medium">No results found for "{query}"</p>
            <p className="text-xs">Please make sure the words are spelled correctly or try artist name.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-[#27856a] p-5 rounded-lg h-44 flex flex-col justify-between font-bold text-white relative overflow-hidden shadow-lg hover:brightness-110 cursor-pointer transition-all">
              <span className="text-xl">Pop & Hits</span>
              <Music className="absolute bottom-2 right-2 opacity-30 text-white" size={60} />
            </div>
            <div className="bg-[#1e3264] p-5 rounded-lg h-44 flex flex-col justify-between font-bold text-white relative overflow-hidden shadow-lg hover:brightness-110 cursor-pointer transition-all">
              <span className="text-xl">Rock & Metal</span>
              <Music className="absolute bottom-2 right-2 opacity-30 text-white" size={60} />
            </div>
            <div className="bg-[#8d67ab] p-5 rounded-lg h-44 flex flex-col justify-between font-bold text-white relative overflow-hidden shadow-lg hover:brightness-110 cursor-pointer transition-all">
              <span className="text-xl">Lo-Fi & Study</span>
              <Music className="absolute bottom-2 right-2 opacity-30 text-white" size={60} />
            </div>
            <div className="bg-[#e8115b] p-5 rounded-lg h-44 flex flex-col justify-between font-bold text-white relative overflow-hidden shadow-lg hover:brightness-110 cursor-pointer transition-all">
              <span className="text-xl">Hip-Hop & R&B</span>
              <Music className="absolute bottom-2 right-2 opacity-30 text-white" size={60} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
