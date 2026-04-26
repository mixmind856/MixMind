import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Music2, CheckCircle2, XCircle, Plus, X, ExternalLink, LogOut, Save } from 'lucide-react';
import { registerVenue, updateGenres, spotifyLoginUrl } from '../services/api';

const ALL_GENRES = [
  'pop','rock','hip-hop','r&b','electronic','dance','jazz','classical',
  'country','metal','punk','reggae','latin','folk','blues','gospel',
  'indie','alternative','rave','afrobeats','k-pop','bollywood','soul','world',
];

export default function VenueSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const spotifyStatus = searchParams.get('spotify'); // 'connected' | 'denied' | 'error'

  const venueId = localStorage.getItem('sdj_venueId');
  const token = localStorage.getItem('sdj_token');
  const slug = localStorage.getItem('sdj_venueSlug');

  const isLoggedIn = !!token && !!venueId;

  // ── Register form (for new venues) ─────────────────────

  const [regForm, setRegForm] = useState({ name: '', slug: '', password: '' });
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regDone, setRegDone] = useState(false);

  // ── Genre management ────────────────────────────────────

  const [selectedGenres, setSelectedGenres] = useState([]);
  const [genresSaved, setGenresSaved] = useState(false);
  const [genresLoading, setGenresLoading] = useState(false);

  const toggleGenre = (g) => {
    setGenresSaved(false);
    setSelectedGenres((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  };

  const saveGenres = async () => {
    setGenresLoading(true);
    try {
      await updateGenres(selectedGenres);
      setGenresSaved(true);
    } catch {
      /* swallow */
    } finally {
      setGenresLoading(false);
    }
  };

  // ── Register ────────────────────────────────────────────

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError('');
    try {
      await registerVenue({ ...regForm, allowedGenres: selectedGenres });
      setRegDone(true);
      navigate('/venue-login');
    } catch (err) {
      setRegError(err.response?.data?.error || 'Registration failed');
    } finally {
      setRegLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sdj_token');
    localStorage.removeItem('sdj_venueId');
    localStorage.removeItem('sdj_venueSlug');
    navigate('/venue-login');
  };

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-green flex items-center justify-center">
              <Music2 size={18} className="text-black" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">Spotify DJ</h1>
              <p className="text-xs text-gray-500 mt-0.5">Venue setup</p>
            </div>
          </div>
          {isLoggedIn && (
            <button onClick={handleLogout} className="btn-secondary flex items-center gap-1.5 text-sm">
              <LogOut size={14} /> Logout
            </button>
          )}
        </div>

        {/* Spotify connection status */}
        {spotifyStatus === 'connected' && (
          <div className="flex items-center gap-2 text-brand-green text-sm bg-brand-green/10 border border-brand-green/20 rounded-xl px-4 py-3">
            <CheckCircle2 size={16} />
            Spotify account connected successfully!
          </div>
        )}
        {(spotifyStatus === 'denied' || spotifyStatus === 'error') && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/30 border border-red-900/30 rounded-xl px-4 py-3">
            <XCircle size={16} />
            {spotifyStatus === 'denied' ? 'Spotify connection was denied.' : 'Spotify connection failed. Try again.'}
          </div>
        )}

        {isLoggedIn ? (
          <>
            {/* Spotify connect */}
            <div className="card space-y-3">
              <h2 className="font-semibold">1. Connect Spotify</h2>
              <p className="text-sm text-gray-400">
                Connect the Spotify account that is actively playing at your venue.
                Songs will be added to its queue.
              </p>
              <a
                href={spotifyLoginUrl(venueId)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <ExternalLink size={14} />
                {spotifyStatus === 'connected' ? 'Reconnect Spotify' : 'Connect Spotify'}
              </a>
            </div>

            {/* Genre setup */}
            <div className="card space-y-3">
              <h2 className="font-semibold">2. Set allowed genres</h2>
              <p className="text-sm text-gray-400">
                Song requests are genre-checked against this list.
                Non-matching requests are automatically refunded.
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_GENRES.map((g) => (
                  <button
                    key={g}
                    onClick={() => toggleGenre(g)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors capitalize
                      ${selectedGenres.includes(g)
                        ? 'bg-brand-green text-black border-brand-green font-medium'
                        : 'border-brand-hover text-gray-400 hover:border-gray-400'
                      }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
              <button
                onClick={saveGenres}
                disabled={genresLoading || selectedGenres.length === 0}
                className="btn-primary flex items-center gap-2"
              >
                <Save size={14} />
                {genresLoading ? 'Saving…' : genresSaved ? 'Saved!' : 'Save genres'}
              </button>
            </div>

            {/* Jukebox link */}
            <div className="card space-y-2">
              <h2 className="font-semibold">3. Share jukebox link</h2>
              <p className="text-sm text-gray-400">
                Share this URL with guests so they can request songs:
              </p>
              <div className="bg-brand-black/50 rounded-xl px-4 py-3 font-mono text-sm text-brand-green break-all">
                {window.location.origin}/jukebox/{slug}
              </div>
            </div>
          </>
        ) : (
          /* Registration form for venues not logged in */
          <div className="card space-y-4">
            <h2 className="font-semibold text-lg">Register your venue</h2>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1.5">Venue name</label>
                <input
                  className="input"
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                  placeholder="e.g. Fabric London"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1.5">
                  Slug <span className="text-gray-600">(used in your jukebox URL)</span>
                </label>
                <input
                  className="input"
                  value={regForm.slug}
                  onChange={(e) =>
                    setRegForm({ ...regForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })
                  }
                  placeholder="e.g. fabric-london"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1.5">Password</label>
                <input
                  className="input"
                  type="password"
                  value={regForm.password}
                  onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>

              {regError && <p className="text-red-400 text-sm">{regError}</p>}

              <button type="submit" disabled={regLoading} className="btn-primary w-full">
                {regLoading ? 'Registering…' : 'Register venue'}
              </button>
            </form>

            <p className="text-xs text-gray-600 text-center">
              Already registered?{' '}
              <a href="/venue-login" className="text-brand-green hover:underline">
                Log in
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
