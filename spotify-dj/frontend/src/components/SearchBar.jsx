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
    <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
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
          className="input pl-10 pr-10"
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
        className="btn-primary whitespace-nowrap"
      >
        {loading ? 'Searching…' : 'Search'}
      </button>
    </form>
  );
}
