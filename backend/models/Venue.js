const { Schema, model } = require("mongoose");
const bcrypt = require("bcryptjs");

const VenueSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone: { type: String },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String },
    websiteUrl: { type: String },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    verificationToken: { type: String },
    verificationTokenExpiry: { type: Date },
    isVerified: { type: Boolean, default: false },
    livePlaylistActive: { type: Boolean, default: false },
    
    // Payments - Stripe
    stripeId: { type: String }, // Stripe customer ID for processing payments
    
    // DJ Mode
    djMode: { type: Boolean, default: false },
    djPassword: { type: String },
    spotifyMode: { type: Boolean, default: false },
    spotifyConnected: { type: Boolean, default: false },
    spotifyAccessToken: { type: String },
    spotifyRefreshToken: { type: String },
    spotifyTokenExpiresAt: { type: Date },
    
    // Genre Management System
    preferredGenres: {
      type: [String],
      enum: [
        "COMMERCIAL_POP",
        "POP",
        "RNB",
        "US_HIPHOP",
        "UK_HIPHOP",
        "AFROBEATS",
        "DRILL",
        "ROCK",
        "INDIE",
        "HOUSE",
        "DANCEHALL",
        "DISCO",
        "REGGAETON"
      ],
      default: []
    },
    genreCheckBypass: { type: Boolean, default: false }, // "All Genres" mode - pass all songs
    
    // Revenue tracking - ONLY captured payments count
    totalRevenue: { type: Number, default: 0 },
    totalCapturedPayments: { type: Number, default: 0 },
    totalAuthorizedAmount: { type: Number, default: 0 },
    lastRevenueUpdateAt: { type: Date }
  },
  { timestamps: true }
);

// Hash password before saving
VenueSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    throw err;
  }
});

// Method to compare passwords
VenueSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = model("Venue", VenueSchema);
