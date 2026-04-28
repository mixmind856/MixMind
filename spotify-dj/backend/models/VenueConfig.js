const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const venueConfigSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },

    // Genres the venue accepts (lowercase, normalised)
    allowedGenres: {
      type: [String],
      default: [],
    },

    // Whether jukebox is currently active for this venue
    active: { type: Boolean, default: true },

    // Stripe: optionally override the default price per venue (in pence)
    priceOverridePence: { type: Number, default: null },

    // Spotify access token & refresh for THIS venue's connected Spotify account
    spotifyAccessToken: { type: String, default: null },
    spotifyRefreshToken: { type: String, default: null },
    spotifyTokenExpiresAt: { type: Date, default: null },
    spotifyConnected: { type: Boolean, default: false },
  },
  { timestamps: true }
);

venueConfigSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

venueConfigSchema.statics.hashPassword = function (plain) {
  return bcrypt.hash(plain, 10);
};

module.exports = mongoose.model('VenueConfig', venueConfigSchema);
