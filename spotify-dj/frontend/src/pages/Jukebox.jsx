import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Music2, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import SearchBar from '../components/SearchBar';
import TrackCard from '../components/TrackCard';
import PaymentModal from '../components/PaymentModal';
import StatusModal from '../components/StatusModal';
import { getVenueInfo, searchTracks, createPayment, precheckGenre } from '../services/api';

export default function Jukebox() {
  const { venueSlug } = useParams();
  const navigate = useNavigate();

  const [venue, setVenue] = useState(null);
  const [venueError, setVenueError] = useState('');

  const [tracks, setTracks] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');

  const [selectedTrack, setSelectedTrack] = useState(null);

  // Payment modal state
  const [paymentData, setPaymentData] = useState(null); // { clientSecret, requestId, amountPence }
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [precheckLoading, setPrecheckLoading] = useState(false);

  // Result modal state
  const [resultState, setResultState] = useState(null); // 'genre_rejected' | 'error'
  const [resultData, setResultData] = useState(null);

  // ── Load venue ──────────────────────────────────────────

  useEffect(() => {
    if (!venueSlug) return;
    localStorage.setItem('sdj_lastSlug', venueSlug);
    getVenueInfo(venueSlug)
      .then(({ data }) => setVenue(data.venue))
      .catch(() => setVenueError('Venue not found or jukebox is currently offline.'));
  }, [venueSlug]);

  // ── Search ──────────────────────────────────────────────

  const handleSearch = useCallback(
    async (query) => {
      if (!query) {
        setTracks([]);
        setSearched(false);
        setSearchError('');
        return;
      }
      setSearchLoading(true);
      setSearchError('');
      setSelectedTrack(null);
      try {
        const { data } = await searchTracks(query, venueSlug);
        setTracks(data.tracks || []);
        setSearched(true);
      } catch (err) {
        setTracks([]);
        setSearched(true);
        const isSpotifyGateway = err?.response?.status === 502;
        const backendMessage = err?.response?.data?.error;
        setSearchError(
          isSpotifyGateway
            ? `${backendMessage || 'Spotify search failed'}. Spotify is temporarily unavailable. Please retry.`
            : backendMessage || 'Search failed. Please try again.'
        );
      } finally {
        setSearchLoading(false);
      }
    },
    [venueSlug]
  );

  // ── Select track → precheck genre → create pre-auth intent ──────

  const handleSelectTrack = async (track) => {
    if (selectedTrack?.id === track.id) {
      setSelectedTrack(null);
      return;
    }
    setSelectedTrack(track);
    setPaymentError('');
    setPaymentData(null);
    setResultState(null);
    setResultData(null);
    setPaymentLoading(true);
    setPrecheckLoading(true);

    try {
      const precheck = await precheckGenre({
        venueSlug,
        trackName: track.name,
        artistName: track.artists,
      });

      if (!precheck.data?.allowed) {
        setResultState('genre_rejected');
        setResultData({
          reason: precheck.data?.reason,
          detectedGenres: precheck.data?.detectedGenres || [],
          allowedGenres: precheck.data?.allowedGenres || [],
          precheck: true,
        });
        setSelectedTrack(null);
        return;
      }

      setPrecheckLoading(false);

      const { data } = await createPayment({
        venueSlug,
        trackId: track.id,
        trackName: track.name,
        artistName: track.artists,
        albumName: track.album,
        albumArtUrl: track.albumArt,
        durationMs: track.durationMs,
        spotifyUri: track.uri,
        requesterName: requesterName.trim(),
        requesterEmail: requesterEmail.trim(),
      });
      setPaymentData(data);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.reason || 'Failed to start payment. Please try again.';
      setPaymentError(msg);
      setSelectedTrack(null);
    } finally {
      setPrecheckLoading(false);
      setPaymentLoading(false);
    }
  };

  // ── Payment result handlers ─────────────────────────────

  const handlePaymentSuccess = (data) => {
    setPaymentData(null);
    setSelectedTrack(null);
    navigate(`/jukebox-thank-you/${data.requestId || paymentData?.requestId}`);
  };

  const handleGenreReject = (data) => {
    setPaymentData(null);
    setSelectedTrack(null);
    setResultState('genre_rejected');
    setResultData(data);
  };

  const resetFlow = () => {
    setResultState(null);
    setResultData(null);
    setSelectedTrack(null);
    setTracks([]);
    setSearched(false);
  };

  // ── Render ──────────────────────────────────────────────

  if (venueError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <WifiOff size={48} className="text-gray-500" />
        <h1 className="text-xl font-semibold">Jukebox Offline</h1>
        <p className="text-gray-400 max-w-xs">{venueError}</p>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-5 h-5 border-2 border-brand-green border-t-transparent rounded-full animate-spin" />
          <span>Loading jukebox…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07070B] text-white px-6 py-16">
      <div className="max-w-md mx-auto">
        <div
          className="inline-flex items-center justify-center w-18 h-18 rounded-lg mb-4 md:ml-45 ml-40"
          style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)' }}
        >
          <Music2 size={34} className="text-white" />
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            Request Your Song
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.72)' }}>
            Enter your details and we&apos;ll handle the rest
          </p>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{
            background: 'linear-gradient(135deg, rgba(18,18,34,0.92) 0%, rgba(18,18,34,0.55) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {venue.allowedGenres?.length > 0 && (
            <div
              className="mb-6 p-4 rounded-xl"
              style={{
                background: 'rgba(168,85,247,0.12)',
                border: '1px solid rgba(168,85,247,0.28)',
              }}
            >
              <p className="text-sm font-semibold mb-3 text-white">
                This venue is currently accepting:
              </p>
              <div className="flex flex-wrap gap-2">
                {venue.allowedGenres.map((genre) => (
                  <span
                    key={genre}
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      background: 'rgba(168,85,247,0.18)',
                      border: '1px solid rgba(168,85,247,0.3)',
                      color: '#D8B4FE',
                    }}
                  >
                    {genre}
                  </span>
                ))}
              </div>
              <p className="text-xs mt-3" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Try another song that fits the venue vibe.
              </p>
            </div>
          )}

          {searchError && (
            <div
              className="mb-6 p-4 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <p className="text-red-300 text-sm">{searchError}</p>
            </div>
          )}
          {paymentError && (
            <div
              className="mb-6 p-4 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              <p className="text-red-300 text-sm">{paymentError}</p>
            </div>
          )}

          <div className="space-y-4">
            <SearchBar onSearch={handleSearch} loading={searchLoading} />

            {precheckLoading && (
              <p className="text-xs animate-pulse" style={{ color: '#A855F7' }}>
                Checking if this fits the venue...
              </p>
            )}

            <AnimatePresence mode="wait">
              {searchLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
                      <div className="w-14 h-14 rounded-lg bg-brand-card/70" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-brand-card/70 rounded w-3/4" />
                        <div className="h-3 bg-brand-card/70 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </motion.div>
              ) : tracks.length > 0 ? (
                <motion.div
                  key="tracks"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2 max-h-72 overflow-auto"
                >
                  {tracks.map((track) => (
                    <TrackCard
                      key={track.id}
                      track={track}
                      selected={selectedTrack?.id === track.id}
                      onSelect={paymentLoading || precheckLoading ? () => {} : handleSelectTrack}
                    />
                  ))}
                </motion.div>
              ) : searched ? (
                <motion.p
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-gray-500 py-4 text-sm"
                >
                  No tracks found. Try a different search.
                </motion.p>
              ) : (
                <motion.p
                  key="hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-gray-600 py-4 text-sm"
                >
                  Search and select a Spotify track
                </motion.p>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-600 mb-2" style={{ color: 'rgba(255,255,255,0.72)' }}>
                Your Name
              </label>
              <input
                type="text"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all"
                style={{
                  background: 'rgba(168,85,247,0.1)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#FFFFFF',
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-600 mb-2" style={{ color: 'rgba(255,255,255,0.72)' }}>
                Phone Number
              </label>
              <input
                type="tel"
                value={requesterPhone}
                onChange={(e) => setRequesterPhone(e.target.value)}
                placeholder="Enter phone number"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all"
                style={{
                  background: 'rgba(168,85,247,0.1)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#FFFFFF',
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-600 mb-2" style={{ color: 'rgba(255,255,255,0.72)' }}>
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={requesterEmail}
                onChange={(e) => setRequesterEmail(e.target.value)}
                placeholder="Enter email address"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all"
                style={{
                  background: 'rgba(168,85,247,0.1)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#FFFFFF',
                }}
              />
            </div>
          </div>

          <div
            className="mt-6 p-4 rounded-xl"
            style={{ background: 'rgba(34,227,161,0.1)', border: '1px solid rgba(34,227,161,0.2)' }}
          >
            <div className="flex justify-between items-center pt-2 border-t border-brand-mint/30">
              <p className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.72)' }}>
                Total to Pay
              </p>
              <p className="font-bold text-xl" style={{ color: '#22E3A1' }}>
                £{((venue.priceOverridePence || 169) / 100).toFixed(2)}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled
            className="w-full text-white font-bold py-4 rounded-2xl text-lg mt-6 flex items-center justify-center gap-2 transition-all transform hover:scale-105 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)',
              boxShadow: '0 8px 50px rgba(168,85,247,0.6)',
            }}
          >
            {paymentLoading || precheckLoading ? 'Processing...' : 'Select a Spotify track above'}
          </button>

          <p className="text-xs text-center mt-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Amount will be charged only after your request is accepted
          </p>
        </div>
      </div>

      {/* Payment modal */}
      {paymentData && selectedTrack && (
        <PaymentModal
          track={selectedTrack}
          clientSecret={paymentData.clientSecret}
          requestId={paymentData.requestId}
          amountPence={paymentData.amount}
          onClose={() => {
            setPaymentData(null);
            setSelectedTrack(null);
          }}
          onSuccess={handlePaymentSuccess}
          onGenreReject={handleGenreReject}
        />
      )}

      {/* Result modal (genre reject / error only) */}
      <StatusModal
        state={resultState}
        track={selectedTrack}
        data={resultData}
        onClose={resetFlow}
        onRetry={resetFlow}
      />
    </div>
  );
}
