const mongoose = require("mongoose");

const LivePlaylistTrackSchema = new mongoose.Schema(
  {
    trackId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },

    title: String,
    artist: String,

    duration: {
      type: Number, // seconds
      required: true
    },

    status: {
      type: String,
      enum: ["playing", "completed"],
      default: "playing"
    },

    batchId: {
      type: String // optional (for grouping 5 tracks)
    },

    addedAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "LivePlaylistTrack",
  LivePlaylistTrackSchema
);
