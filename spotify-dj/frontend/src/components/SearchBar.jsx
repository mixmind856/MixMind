import React, { useState, useRef } from 'react';
import { Search, X } from 'lucide-react';

export default function SearchBar({ onSearch, loading }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const submitted = String(formData.get('q') || '').trim();
    if (submitted.length < 2) return;
    onSearch(submitted);
  };

  const clear = () => {
    setQuery('');
    onSearch('');
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label className="block text-xs font-600 mb-2" style={{ color: 'rgba(255,255,255,0.72)' }}>
        Find a song on Spotify
      </label>
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
        <Search
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          name="q"
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a song or artist…"
          className="w-full px-4 py-3 pl-10 pr-10 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all"
          style={{
            background: 'rgba(168,85,247,0.1)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#FFFFFF',
          }}
          autoComplete="off"
          spellCheck="false"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        )}
        </div>
        <button
          type="submit"
          disabled={loading || query.trim().length < 2}
          className="px-4 py-3 rounded-xl font-medium transition-all text-white"
          style={{
            background: loading || query.trim().length < 2
              ? 'rgba(168,85,247,0.3)'
              : 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)',
            opacity: loading || query.trim().length < 2 ? 0.6 : 1,
          }}
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>
    </form>
  );
}
