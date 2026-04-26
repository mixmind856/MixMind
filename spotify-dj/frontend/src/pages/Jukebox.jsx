import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Music2, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import SearchBar from '../components/SearchBar';
import TrackCard from '../components/TrackCard';
import PaymentModal from '../components/PaymentModal';
import StatusModal from '../components/StatusModal';
import { getVenueInfo, searchTracks, createPayment } from '../services/api';

export default function Jukebox() {
  const { venueSlug } = useParams();

  const [venue, setVenue] = useState(null);
  const [venueError, setVenueError] = useState('');

  const [tracks, setTracks] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [selectedTrack, setSelectedTrack] = useState(null);

  // Payment modal state
  const [paymentData, setPaymentData] = useState(null); // { clientSecret, requestId, amountPence }
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Result modal state
  const [resultState, setResultState] = useState(null); // 'success' | 'genre_rejected' | 'error'
  const [resultData, setResultData] = useState(null);

  // ── Load venue ──────────────────────────────────────────

  useEffect(() => {
    if (!venueSlug) return;
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
        return;
      }
      setSearchLoading(true);
      setSelectedTrack(null);
      try {
        const { data } = await searchTracks(query, venueSlug);
        setTracks(data.tracks || []);
        setSearched(true);
      } catch {
        setTracks([]);
      } finally {
        setSearchLoading(false);
      }
    },
    [venueSlug]
  );

  // ── Select track → create pre-auth payment intent ──────

  const handleSelectTrack = async (track) => {
    if (selectedTrack?.id === track.id) {
      setSelectedTrack(null);
      return;
    }
    setSelectedTrack(track);
    setPaymentError('');
    setPaymentData(null);
    setPaymentLoading(true);

    try {
      const { data } = await createPayment({
        venueSlug,
        trackId: track.id,
        trackName: track.name,
        artistName: track.artists,
        albumName: track.album,
        albumArtUrl: track.albumArt,
        durationMs: track.durationMs,
        spotifyUri: track.uri,
      });
      setPaymentData(data);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to start payment. Please try again.';
      setPaymentError(msg);
      setSelectedTrack(null);
    } finally {
      setPaymentLoading(false);
    }
  };

  // ── Payment result handlers ─────────────────────────────

  const handlePaymentSuccess = (data) => {
    setPaymentData(null);
    setSelectedTrack(null);
    setResultState('success');
    setResultData(data);
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
    <div className="min-h-screen bg-gradient-to-b from-brand-black via-brand-dark to-brand-dark">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-brand-black/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand-green flex items-center justify-center">
              <Music2 size={16} className="text-black" />
            </div>
            <div>
              <h1 className="font-bold leading-none">{venue.name}</h1>
              <p className="text-xs text-gray-500 mt-0.5">Jukebox</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-brand-green">
            <Wifi size={13} />
            <span>Live</span>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Allowed genres chips */}
        {venue.allowedGenres?.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Tonight's genres</p>
            <div className="flex flex-wrap gap-1.5">
              {venue.allowedGenres.map((g) => (
                <span
                  key={g}
                  className="bg-brand-green/10 border border-brand-green/20 text-brand-green text-xs px-3 py-1 rounded-full capitalize"
                >
                  {g}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Price callout */}
        <div className="card flex items-center justify-between">
          <div>
            <p className="font-semibold">Request a song</p>
            <p className="text-sm text-gray-400">
              Songs are genre-checked before your card is charged.
            </p>
          </div>
          <div className="text-right flex-shrink-0 ml-4">
            <p className="text-2xl font-bold text-brand-green">
              £{((venue.priceOverridePence || 299) / 100).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">per request</p>
          </div>
        </div>

        {/* Search */}
        <SearchBar onSearch={handleSearch} loading={searchLoading} />

        {/* Error from payment creation */}
        {paymentError && (
          <p className="text-red-400 text-sm text-center">{paymentError}</p>
        )}

        {/* Results */}
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
                  <div className="w-14 h-14 rounded-lg bg-brand-hover" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-brand-hover rounded w-3/4" />
                    <div className="h-3 bg-brand-hover rounded w-1/2" />
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
              className="space-y-1"
            >
              {tracks.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  selected={selectedTrack?.id === track.id}
                  onSelect={paymentLoading ? () => {} : handleSelectTrack}
                />
              ))}
            </motion.div>
          ) : searched ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-gray-500 py-8"
            >
              No tracks found. Try a different search.
            </motion.p>
          ) : (
            <motion.p
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-gray-600 py-8 text-sm"
            >
              Search above to browse songs
            </motion.p>
          )}
        </AnimatePresence>
      </main>

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

      {/* Result modal */}
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
