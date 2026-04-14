const mongoose = require("mongoose");

const LivePlaylistSessionSchema = new mongoose.Schema(
  {
    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Venue",
      required: true
    },
    status: {
      type: String,
      enum: ["active", "paused", "stopped"],
      default: "active"
    },
    // Tracks in the current batch
    tracks: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "LivePlaylistTrack"
    }],
    currentTrackIndex: {
      type: Number,
      default: 0
    },
    // Batch timing info
    batchId: {
      type: String
    },
    batchStartedAt: {
      type: Date
    },
    batchTotalDurationMs: {
      type: Number, // Total duration in milliseconds of all 5 songs
      default: 0
    },
    fiftyPercentThresholdMs: {
      type: Number, // 50% of total duration
      default: 0
    },
    // Track which songs have been removed in current batch
    removedTrackIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "LivePlaylistTrack"
    }],
    startedAt: {
      type: Date,
      default: Date.now
    },
    stoppedAt: {
      type: Date
    },
    active: {
      type: Boolean,
      default: true
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now
    },
    lastClearedAt: {
      type: Date
    },
    lastTrackChangeAt: {
      type: Date
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "LivePlaylistSession",
  LivePlaylistSessionSchema
);
