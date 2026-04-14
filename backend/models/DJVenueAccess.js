const { Schema, model } = require("mongoose");

const DJVenueAccessSchema = new Schema(
  {
    djId: { type: Schema.Types.ObjectId, ref: "DJ", required: true },
    venueId: { type: Schema.Types.ObjectId, ref: "Venue", required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "revoked"],
      default: "pending"
    },
    requestedAt: { type: Date, default: Date.now },
    respondedAt: { type: Date },
    approvedAt: { type: Date },
    currentlyActive: { type: Boolean, default: false },
    activeSince: { type: Date },
    revokedAt: { type: Date },
    rejectionReason: { type: String }
  },
  { timestamps: true }
);

// Ensure one active DJ per venue at a time
DJVenueAccessSchema.index({ venueId: 1, currentlyActive: 1 });

module.exports = model("DJVenueAccess", DJVenueAccessSchema);
