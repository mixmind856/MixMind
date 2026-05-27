const { Schema, model } = require("mongoose");

const DJPushSubscriptionSchema = new Schema(
  {
    djId: { type: Schema.Types.ObjectId, ref: "DJ", required: true },
    venueId: { type: Schema.Types.ObjectId, ref: "Venue", required: true },
    endpoint: { type: String, required: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true }
    },
    userAgent: { type: String }
  },
  { timestamps: true }
);

DJPushSubscriptionSchema.index({ djId: 1, venueId: 1 });
DJPushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });

module.exports = model("DJPushSubscription", DJPushSubscriptionSchema);
