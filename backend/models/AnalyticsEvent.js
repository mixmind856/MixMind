const { Schema, model } = require("mongoose");

const ALLOWED_EVENT_TYPES = [
  "qr_scan_landing",
  "venue_selected",
  "venue_page_visit",
  "song_search",
  "request_started",
  "checkout_started",
  "payment_completed"
];

const AnalyticsEventSchema = new Schema(
  {
    eventType: {
      type: String,
      required: true,
      enum: ALLOWED_EVENT_TYPES,
      index: true
    },
    venueId: { type: String, index: true },
    venueName: { type: String },
    src: { type: String, index: true },
    sessionId: { type: String, index: true },
    userAgent: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now, index: true }
  },
  { timestamps: false }
);

AnalyticsEventSchema.index({ createdAt: 1, eventType: 1 });

const AnalyticsEventModel = model("AnalyticsEvent", AnalyticsEventSchema);
AnalyticsEventModel.ALLOWED_EVENT_TYPES = ALLOWED_EVENT_TYPES;
module.exports = AnalyticsEventModel;
