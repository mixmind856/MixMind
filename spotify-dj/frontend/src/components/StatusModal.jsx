import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, RefreshCw, Music } from 'lucide-react';

export default function StatusModal({ state, track, data, onClose, onRetry }) {
  if (!state) return null;

  const isSuccess = state === 'success';
  const isGenreReject = state === 'genre_rejected';

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={isSuccess ? onClose : undefined}
      >
        <motion.div
          key="modal"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="card w-full max-w-sm text-center"
          onClick={(e) => e.stopPropagation()}
        >
          {isSuccess ? (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="flex justify-center mb-4"
              >
                <CheckCircle2 size={64} className="text-brand-mint" />
              </motion.div>
              <h2 className="text-2xl font-bold mb-2">Song Queued!</h2>
              <p className="text-gray-400 mb-1">
                <span className="text-white font-medium">{data?.trackName || track?.name}</span>
                {' '}by{' '}
                <span className="text-white font-medium">{data?.artistName || track?.artists}</span>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Genre matched. Your card has been charged and the song is on its way to the queue.
              </p>
              {data?.matched?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center mb-5">
                  {data.matched.map((g) => (
                    <span key={g} className="bg-brand-mint/20 text-brand-mint text-xs px-2.5 py-1 rounded-full">
                      {g}
                    </span>
                  ))}
                </div>
              )}
              <button onClick={onClose} className="btn-primary w-full">
                Request another song
              </button>
            </>
          ) : isGenreReject ? (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="flex justify-center mb-4"
              >
                <XCircle size={64} className="text-red-400" />
              </motion.div>
              <h2 className="text-2xl font-bold mb-2">Genre Not Allowed</h2>
              <p className="text-gray-400 mb-4 text-sm">
                This song didn't match the venue's playlist genres.
                <strong className="text-white block mt-1"> Your payment has been automatically refunded.</strong>
              </p>

              <div className="bg-brand-black/50 rounded-xl p-3 mb-5 text-left text-sm space-y-2">
                {data?.detectedGenres?.length > 0 && (
                  <div>
                    <span className="text-gray-500 text-xs uppercase tracking-wide">Detected genres</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {data.detectedGenres.map((g) => (
                        <span key={g} className="bg-red-950/50 text-red-300 text-xs px-2 py-0.5 rounded-full">{g}</span>
                      ))}
                    </div>
                  </div>
                )}
                {data?.allowedGenres?.length > 0 && (
                  <div>
                    <span className="text-gray-500 text-xs uppercase tracking-wide">Venue allows</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {data.allowedGenres.map((g) => (
                        <span key={g} className="bg-brand-purple/15 text-brand-purple text-xs px-2 py-0.5 rounded-full">{g}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={onRetry} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <RefreshCw size={14} /> Try another song
                </button>
              </div>
            </>
          ) : (
            <>
              <Music size={48} className="text-gray-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
              <p className="text-gray-400 text-sm mb-5">Your payment hold has been released. Please try again.</p>
              <button onClick={onRetry} className="btn-primary w-full">Try again</button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
