require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const { livePlaylistWorker } = require("./runLivePlaylistFlow");
const Request = require("../models/Request");

// -------------------- FETCH RANDOM TRACKS --------------------
async function getRandomTracksFromMainPlaylist(limit = 5) {
  return Request.aggregate([
    { $match: { status: { $in: ["created", "paid", "approved", "processing", "completed", "failed", "rejected","authorized"] } } },
    { $sample: { size: limit } }
  ]);
}

// -------------------- START WORKER --------------------
async function startWorker() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB connected");
  console.log("Starting Live Playlist Worker...");

  await livePlaylistWorker();
}

startWorker();
