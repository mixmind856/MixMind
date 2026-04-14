require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./db");
const workerManager = require("./worker/workerManager");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 4000;

// -------------------- CORS --------------------
app.use(
  cors({
    origin: process.env.CLIENT_URL, // e.g., "http://localhost:3000"
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-admin-key", "Authorization"]
  })
);

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
