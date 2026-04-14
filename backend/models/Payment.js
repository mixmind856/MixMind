const { Schema, model } = require("mongoose");

const PaymentSchema = new Schema(
  {
    requestId: {
      type: Schema.Types.ObjectId,
      ref: "Request",
      required: true
    },

    venueId: {
      type: Schema.Types.ObjectId,
      ref: "Venue"
    },

    stripePaymentIntentId: {
      type: String,
      index: true
    },

    stripeCheckoutSessionId: {
      type: String,
      index: true
    },

    amount: Number,
    capturedAmount: { type: Number, default: 0 },
    currency: String,

    status: {
      type: String,
      enum: [
        "pending",       // created
        "authorized",    // funds held
        "captured",      // charged
        "paid",          // checkout completed
        "transferred",   // splits sent
        "cancelled",     // released
        "failed"
      ],
      default: "pending"
    },

    // Payment lifecycle timestamps
    authorizedAt: { type: Date },
    capturedAt: { type: Date },
    paidAt: { type: Date },
    cancelledAt: { type: Date },
    failedAt: { type: Date },

    // Split transfer tracking
    transfers: [{
      type: { type: String, enum: ["dj", "venue", "platform"] },
      amount: Number,
      transferId: String
    }],
    transfersCreatedAt: { type: Date },

    // Card & Customer tracking
    cardBrand: String,          // e.g., "visa", "amex"
    cardLast4: String,          // Last 4 digits of card
    cardFingerprint: String,    // Stripe card fingerprint
    customerId: String,         // Stripe customer ID if created

    // Test mode tracking
    testMode: { type: Boolean, default: true },  // Is this a test payment?
    testCard: String,            // Which test card was used (for reference)

    // Webhook tracking
    webhookEvents: [{
      eventId: String,
      type: String,              // e.g., "charge.succeeded", "charge.failed"
      receivedAt: { type: Date, default: Date.now }
    }],
    lastStripeEventId: String,
    rawWebhook: Object,
    
    // Payment notes
    paymentNotes: { type: String },
    errorMessage: { type: String },
    declineCode: String          // Stripe decline code if failed
  },
  { timestamps: true }
);

module.exports = model("Payment", PaymentSchema);
