const { Schema, model } = require("mongoose");

const RequestSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    venueId: { type: Schema.Types.ObjectId, ref: "Venue" },
    title: { type: String, required: true },
    songTitle: { type: String },
    artist: { type: String, required: true },
    artistName: { type: String },
    userName: { type: String },
    phone: { type: String },
    countryCode: { type: String }, // e.g., "+44", "+1", "+33"
    price: { type: Number, required: true, default: 0 },

    status: {
      type: String,
      enum: ["queued", "created", "pending_dj_approval", "paid", "approved", "processing", "completed", "failed", "rejected", "authorized", "analyzing"],
      default: "queued"
    },

    // Payment tracking
    paymentIntentId: { type: String },
    checkoutSessionId: { type: String },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "pending", "authorized", "captured", "failed", "cancelled"],
      default: "unpaid"
    },
    paidAmount: { type: Number, default: 0 },
    paidAt: { type: Date },

    beatSourceTrackId: { type: String },
    resultUrl: { type: String },
    metadata: { type: Object },
    sourcePlaylistId: { type: String },
    
    // Three-step flow tracking (for song request queue)
    flowStatus: {
      type: String,
      enum: ["pending", "in_progress", "completed", "failed"],
      default: "pending"
    },
    flowError: { type: String },
    
    // Genre tracking (for automix when DJ mode is OFF)
    detectedGenre: { type: String },
    genreCheckPassed: { type: Boolean },
    
    // Approval tracking
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectionReason: { type: String },
    
    // DJ Approval tracking
    djApprovedAt: { type: Date },
    djRejectedAt: { type: Date },
    djRejectionReason: { type: String },
    
    // Venue tracking
    venueProcessed: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = model("Request", RequestSchema);
