const mongoose = require('mongoose');

const jukeboxRequestSchema = new mongoose.Schema(
  {
    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VenueConfig',
      required: true,
    },

    // Spotify track details captured at request time
    trackId: { type: String, required: true },
    trackName: { type: String, required: true },
    artistName: { type: String, required: true },
    albumName: { type: String, default: '' },
    albumArtUrl: { type: String, default: '' },
    durationMs: { type: Number, default: 0 },
    spotifyUri: { type: String, required: true },

    // Genre data
    detectedGenres: [String],      // from Last.fm + internal DB
    venueAllowedGenres: [String],  // snapshot of venue's genres at request time
    genreMatch: {                  // null = not yet checked
      type: Boolean,
      default: null,
    },

    // Payment (pre-authorisation / capture flow)
    stripePaymentIntentId: { type: String, required: true, unique: true },
    amountPence: { type: Number, required: true, default: 169 }, // £1.69
    currency: { type: String, default: 'gbp' },
    paymentStatus: {
      type: String,
      enum: ['requires_payment_method', 'requires_confirmation', 'requires_capture', 'succeeded', 'canceled', 'refunded'],
      default: 'requires_payment_method',
    },

    // Overall request lifecycle
    status: {
      type: String,
      enum: ['pending_payment', 'paid_pending_genre', 'genre_approved', 'genre_rejected', 'queued', 'failed'],
      default: 'pending_payment',
    },

    // Requester metadata (optional – collected from frontend)
    requesterName: { type: String, default: '' },
    requesterEmail: { type: String, default: '' },

    // Notes / audit
    rejectionReason: { type: String, default: '' },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('JukeboxRequest', jukeboxRequestSchema);
