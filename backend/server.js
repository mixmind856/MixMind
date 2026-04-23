require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./db");
const workerManager = require("./worker/workerManager");
const axios = require("axios");

// ================== ENVIRONMENT DIAGNOSTICS ==================
console.log(`\n${'═'.repeat(60)}`);
console.log(`🔧 ENVIRONMENT CONFIGURATION`);
console.log(`${'═'.repeat(60)}`);
console.log(`📧 EMAIL CONFIGURATION:`);
console.log(`   GMAIL_USER: ${process.env.GMAIL_USER || "❌ NOT SET"}`);
console.log(`   GMAIL_PASSWORD: ${process.env.GMAIL_PASSWORD ? "✅ SET" : "❌ NOT SET"}`);
console.log(`   EMAIL_SERVICE: ${process.env.EMAIL_SERVICE || "default (gmail)"}`);
console.log(`   SENDGRID_API_KEY: ${process.env.SENDGRID_API_KEY ? "✅ SET" : "❌ NOT SET"}`);
console.log(`\n🔗 OTHER VARIABLES:`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || "development"}`);
console.log(`   PORT: ${process.env.PORT || 4000}`);
console.log(`   CLIENT_URL: ${process.env.CLIENT_URL || "❌ NOT SET"}`);
console.log(`   STRIPE_SECRET_KEY: ${process.env.STRIPE_SECRET_KEY ? "✅ SET" : "❌ NOT SET"}`);
console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? "✅ SET" : "❌ NOT SET"}`);
console.log(`${'═'.repeat(60)}\n`);

const app = express();
const PORT = process.env.PORT || 4000;

// -------------------- CORS --------------------
const allowedOrigins = [
  process.env.CLIENT_URL,
  "https://www.mixmind.co.uk",
  "https://mixmind.co.uk",
  "https://mix-mind-msh6.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173"
].filter(Boolean);

console.log("🌐 Allowed CORS origins:", allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-admin-key", "Authorization"],
    credentials: true
  })
);

// Important for preflight requests
app.options(/.*/, cors());

// -------------------- BODY PARSERS --------------------
// Normal JSON parser for all routes except Stripe webhook
app.use(express.json());

// -------------------- ROUTES --------------------
app.use("/api/admin", require("./features/admin"));
app.use("/api/requests", require("./features/requests"));
app.use("/api/payments", require("./features/payments"));
app.use("/api/stripe", require("./features/payments/stripe")); // webhook route
app.use("/api/venue", require("./features/venues")); // venue auth routes
app.use("/api/dj", require("./features/dj")); // DJ mode routes
app.use("/api/coupons", require("./features/coupons")); // coupon validation routes

// ================== HEALTH CHECK ENDPOINT ==================
// This endpoint can be called from frontend to check if backend is running
// It returns status and worker info
app.get("/health", async (req, res) => {
  try {
    await axios.get("http://localhost:80");
    res.json({ status: true });
  } catch (err) {
    res.json({ status: false });
  }
});

app.get("/check-vdj", async (req, res) => {
  try {
    await axios.get("http://localhost:80");
    res.json({ status: true });
  } catch (err) {
    res.json({ status: false });
  }
});

// -------------------- DATABASE & SERVER --------------------
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API server running on port ${PORT}`);
      
      // Auto-start workers
      // Live playlist worker only starts when a venue toggles it ON
      setTimeout(async () => {
        try {
          const Venue = require("./models/Venue");
          
          // Note: Beatsource queue worker no longer needed (using MongoDB instead of Redis/BullMQ)
          // Song request processing is now handled by: npm run dev:worker (MongoDB-based)
          
          // Check if any venue has live playlist active
          const activeVenue = await Venue.findOne({ livePlaylistActive: true });
          if (activeVenue) {
            console.log(`🎵 Live Playlist active for ${activeVenue.name}, starting rotation worker...`);
            workerManager.startLivePlaylist(activeVenue._id.toString());
            console.log("✅ Live Playlist Worker started");
          } else {
            console.log("📭 No active venues - Live Playlist Worker idle (toggle ON to start)");
          }
        } catch (err) {
          console.error("Worker startup error:", err.message);
        }
      }, 2000);
    });
  })
  .catch((err) => {
    console.error("Failed to connect DB", err);
    process.exit(1);
  });
