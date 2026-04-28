const mongoose = require("mongoose");

const jukeboxRequestSchema = new mongoose.Schema(
  {
    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
      required: true,
    },
    trackId: { type: String, required: true },
    trackName: { type: String, required: true },
    artistName: { type: String, required: true },
    albumName: { type: String, default: "" },
    albumArtUrl: { type: String, default: "" },
    durationMs: { type: Number, default: 0 },
    spotifyUri: { type: String, required: true },
    detectedGenres: [String],
    venueAllowedGenres: [String],
    genreMatch: { type: Boolean, default: null },
    stripePaymentIntentId: { type: String, required: true, unique: true },
    amountPence: { type: Number, required: true, default: 169 },
    currency: { type: String, default: "gbp" },
    paymentStatus: {
      type: String,
      enum: [
        "requires_payment_method",
        "requires_confirmation",
        "requires_capture",
        "succeeded",
        "canceled",
      ],
      default: "requires_payment_method",
    },
    status: {
      type: String,
      enum: [
        "pending_payment",
        "paid_pending_genre",
        "genre_approved",
        "genre_rejected",
        "queued",
        "failed",
      ],
      default: "pending_payment",
    },
    requesterName: { type: String, default: "" },
    requesterEmail: { type: String, default: "" },
    rejectionReason: { type: String, default: "" },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("JukeboxRequest", jukeboxRequestSchema);
