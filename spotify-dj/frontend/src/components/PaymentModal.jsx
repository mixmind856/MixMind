import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Music, ShieldCheck, AlertCircle } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { confirmPayment } from '../services/api';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const STRIPE_APPEARANCE = {
  theme: 'night',
  variables: {
    colorPrimary: '#A855F7',
    colorBackground: '#282828',
    colorText: '#ffffff',
    colorDanger: '#ef4444',
    fontFamily: 'Inter, ui-sans-serif, sans-serif',
    borderRadius: '12px',
  },
};

// ── Inner form (must be inside <Elements>) ──────────────────

function CheckoutForm({ requestId, track, amountPence, onSuccess, onError }) {
  const safeAmountPence = amountPence || 169;

  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setErrorMsg('');

    try {
      // 1. Confirm card with Stripe (places the hold)
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        setErrorMsg(error.message);
        setProcessing(false);
        return;
      }

      // 2. Tell backend to run genre check then capture or cancel
      const { data } = await confirmPayment({
        requestId,
        paymentIntentId: paymentIntent.id,
      });

      onSuccess(data);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.reason || err.message;
      const isGenreRejection = err.response?.status === 422;
      if (isGenreRejection) {
        onError({ type: 'genre', ...err.response.data });
      } else {
        setErrorMsg(msg || 'Something went wrong. Please try again.');
      }
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Pre-auth notice */}
      <div className="flex items-start gap-2 text-xs text-gray-300 bg-brand-mint/10 border border-brand-mint/25 rounded-xl p-3">
        <ShieldCheck size={14} className="text-brand-mint flex-shrink-0 mt-0.5" />
        <span>
          Your card will be pre-authorised for{' '}
          <strong className="text-white">£{(safeAmountPence / 100).toFixed(2)}</strong>.
          Payment is only charged if the song genre matches the venue's playlist.
          Otherwise your hold is automatically released — no charge.
        </span>
      </div>

      <PaymentElement />

      {errorMsg && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/40 rounded-xl p-3">
          <AlertCircle size={14} />
          <span>{errorMsg}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="btn-primary w-full text-center"
      >
        {processing ? 'Processing…' : `Authorise £${(safeAmountPence / 100).toFixed(2)}`}
      </button>
    </form>
  );
}

// ── Modal shell ─────────────────────────────────────────────

export default function PaymentModal({ track, clientSecret, requestId, amountPence, onClose, onSuccess, onGenreReject }) {
  if (!clientSecret) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          key="modal"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="card glass-card w-full max-w-md relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          {/* Track preview */}
          <div className="flex items-center gap-3 mb-5">
            {track.albumArt ? (
              <img src={track.albumArt} alt={track.album} className="w-12 h-12 rounded-lg" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-brand-card/70 flex items-center justify-center">
                <Music size={16} className="text-gray-500" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold truncate">{track.name}</p>
              <p className="text-sm text-gray-400 truncate">{track.artists}</p>
            </div>
          </div>

          <h2 className="text-lg font-bold mb-4">Complete your request</h2>

          <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance: STRIPE_APPEARANCE }}
          >
            <CheckoutForm
              requestId={requestId}
              track={track}
              amountPence={amountPence}
              onSuccess={onSuccess}
              onError={(errData) => {
                if (errData.type === 'genre') onGenreReject(errData);
              }}
            />
          </Elements>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
