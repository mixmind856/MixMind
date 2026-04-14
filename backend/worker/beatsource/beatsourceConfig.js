/**
 * Beatsource Configuration
 * API keys, endpoints, and settings for BeatSource integration
 */

module.exports = {
  // BeatSource API Configuration
  API_ENDPOINT: process.env.BEATSOURCE_API_ENDPOINT || "https://api.beatsource.com/v1",
  API_KEY: process.env.BEATSOURCE_API_KEY || null,
  API_SECRET: process.env.BEATSOURCE_API_SECRET || null,

  // Credentials file location (for OAuth or stored credentials)
  CREDENTIALS_FILE: process.env.BEATSOURCE_CREDENTIALS_FILE || "./utils/beatsource-auth.json",

  // Upload settings
  UPLOAD: {
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100 MB
    ALLOWED_FORMATS: ["mp3", "wav", "flac", "aac"],
    TIMEOUT: 60000, // 60 seconds
    RETRIES: 3,
    RETRY_DELAY: 2000 // 2 seconds
  },

  // Metadata requirements
  METADATA: {
    REQUIRED_FIELDS: ["title", "artist", "genre", "duration"],
    MAX_TITLE_LENGTH: 255,
    MAX_ARTIST_LENGTH: 255,
    MAX_DESCRIPTION_LENGTH: 1000
  },

  // Rate limiting
  RATE_LIMIT: {
    REQUESTS_PER_MINUTE: 60,
    REQUESTS_PER_HOUR: 1000
  },

  // Demo mode (for testing without real API)
  DEMO_MODE: process.env.DEMO_MODE === "true",

  // Logging
  VERBOSE: process.env.BEATSOURCE_VERBOSE === "true",
  LOG_REQUESTS: process.env.BEATSOURCE_LOG_REQUESTS === "true"
};
