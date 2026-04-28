import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Music, ShieldCheck, AlertCircle } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

const STRIPE_APPEARANCE = {
  theme: "night",
  variables: {
    colorPrimary: "#A855F7",
    colorBackground: "#282828",
    colorText: "#ffffff",
    colorDanger: "#ef4444",
    fontFamily: "Inter, ui-sans-serif, sans-serif",
    borderRadius: "12px",
  },
};

function CheckoutForm({ requestId, amountPence, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const safeAmountPence = amountPence || 169;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || processing) return;
    setProcessing(true);
    setErrorMsg("");

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (error) {
        const isCanceledIntent =
          error.code === "payment_intent_unexpected_state" ||
          String(error.message || "").toLowerCase().includes("paymentintent status is canceled");

        if (isCanceledIntent) {
          onError({
            type: "payment_expired",
            message: "Payment expired, please try again",
          });
          return;
        }

        setErrorMsg(error.message || "Payment confirmation failed");
        setProcessing(false);
        return;
      }

      if (!paymentIntent || paymentIntent.status !== "requires_capture") {
        const isCanceledIntent = paymentIntent?.status === "canceled";
        if (isCanceledIntent) {
          onError({
            type: "payment_expired",
            message: "Payment expired, please try again",
          });
          return;
        }
        setErrorMsg("Payment not authorised. Please try again.");
        setProcessing(false);
        return;
      }

      console.log("SPOTIFY MODE FLOW ACTIVE");
      console.log("Calling /api/jukebox/confirm");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/jukebox/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          paymentIntentId: paymentIntent.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 422) onError({ type: "genre", ...data });
        else setErrorMsg(data.error || data.message || "Processing failed");
        setProcessing(false);
        return;
      }

      onSuccess({ ...data, requestId });
    } catch (err) {
      setErrorMsg(err.message || "Something went wrong");
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-start gap-2 text-xs text-gray-300 bg-emerald-500/10 border border-emerald-400/20 rounded-xl p-3">
        <ShieldCheck size={14} className="text-emerald-300 flex-shrink-0 mt-0.5" />
        <span>
          Your card will be pre-authorised for{" "}
          <strong className="text-white">£{(safeAmountPence / 100).toFixed(2)}</strong>. It is
          captured only after genre validation and successful Spotify queueing.
        </span>
      </div>

      <PaymentElement
        options={{
          paymentMethodOrder: ["apple_pay", "google_pay", "card"],
          terms: {
            card: "never",
          },
          wallets: {
            applePay: "auto",
            googlePay: "auto",
          },
        }}
      />

      {errorMsg && (
        <div className="flex items-center gap-2 text-red-300 text-sm bg-red-950/40 rounded-xl p-3">
          <AlertCircle size={14} />
          <span>{errorMsg}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-gradient-to-r from-purple-600 to-violet-700 text-white font-semibold rounded-xl py-3 disabled:opacity-50"
      >
        {processing ? "Processing..." : `Authorise £${(safeAmountPence / 100).toFixed(2)}`}
      </button>
    </form>
  );
}

export default function SpotifyPaymentModal({
  track,
  clientSecret,
  requestId,
  amountPence,
  onClose,
  onSuccess,
  onGenreReject,
  onPaymentExpired,
}) {
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
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-full max-w-md relative rounded-2xl p-5 border border-white/10 bg-[#121222]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-3 mb-5">
            {track?.albumArtUrl ? (
              <img src={track.albumArtUrl} alt={track.albumName} className="w-12 h-12 rounded-lg" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                <Music size={16} className="text-gray-400" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold truncate text-white">{track?.trackName}</p>
              <p className="text-sm text-gray-400 truncate">{track?.artistName}</p>
            </div>
          </div>

          <h2 className="text-lg font-bold mb-4 text-white">Complete your request</h2>

          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: STRIPE_APPEARANCE,
            }}
          >
            <CheckoutForm
              requestId={requestId}
              amountPence={amountPence}
              onSuccess={onSuccess}
              onError={(errData) => {
                if (errData.type === "genre") onGenreReject(errData);
                if (errData.type === "payment_expired") onPaymentExpired?.(errData);
              }}
            />
          </Elements>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
