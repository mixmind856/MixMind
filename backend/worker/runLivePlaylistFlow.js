console.log("🔥🔥🔥 THIS IS MY NEW FILE RUNNING 🔥🔥🔥");

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const axios = require("axios");
const mongoose = require("mongoose");

// -------------------- GLOBAL STATE --------------------
let SHOULD_STOP = false;

// -------------------- SIGNAL HANDLERS --------------------
function setupSignalHandlers() {
  process.on("SIGTERM", () => {
    console.log("\n🛑 SIGTERM received, stopping worker...");
    SHOULD_STOP = true;
  });
  process.on("SIGINT", () => {
    console.log("\n🛑 SIGINT received, stopping worker...");
    SHOULD_STOP = true;
  });
}

// -------------------- UTILITY --------------------
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// -------------------- WAIT WITH INTERRUPT --------------------
async function waitWithInterrupt(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end && !SHOULD_STOP) {
    await sleep(1000);
  }
}

// -------------------- SHUFFLE LOGIC --------------------
function createShuffledCycle(min, max) {
  const arr = [];
  for (let i = min; i <= max; i++) arr.push(i);

  // Fisher-Yates shuffle
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

function getNextBatch(state, batchSize, min, max) {
  const picks = [];

  while (picks.length < batchSize) {
    if (state.pointer >= state.cycle.length) {
      state.cycle = createShuffledCycle(min, max);
      state.pointer = 0;
      state.cycleNumber++;
      console.log(`🔁 New shuffle cycle #${state.cycleNumber}`);
    }

    picks.push(state.cycle[state.pointer]);
    state.pointer++;
  }

  return picks;
}

// -------------------- MAIN LOGIC --------------------
async function runWorker(sessionId) {
  const baseUrl = process.env.EXECUTE_API_URL || "http://127.0.0.1:80";

  const totalSongs = parseInt(process.env.TOTAL_SONGS) || 94;

  const batchWaitMs = 360000; // 🔥 CHANGE BACK TO 360000 AFTER TEST

  const songsPerBatch = 5;

  const minIndex = 1; // skip index 0
  const maxIndex = Math.max(1, totalSongs - 1);

  const shuffleState = {
    cycle: createShuffledCycle(minIndex, maxIndex),
    pointer: 0,
    cycleNumber: 1
  };

  console.log(`🎵 Worker started | Total Songs: ${totalSongs}`);

  // Initial setup
  await axios.get(`${baseUrl}/execute?script=${encodeURIComponent('browser_gotofolder "beatport:\\Mixmind"')}`);
  await axios.get(`${baseUrl}/execute?script=${encodeURIComponent('browser_window "songs"')}`);
  await axios.get(`${baseUrl}/execute?script=${encodeURIComponent('browser_focus & browser_scroll -1000')}`);

  let batch = 0;

  while (!SHOULD_STOP) {
    batch++;

    console.log(`\n🎵 BATCH #${batch}`);

    // Reset state
    await axios.get(`${baseUrl}/execute?script=${encodeURIComponent('browser_gotofolder "beatport:\\Mixmind" & browser_window "songs" & browser_focus & browser_scroll -1000')}`);

    const indices = getNextBatch(shuffleState, songsPerBatch, minIndex, maxIndex);

    console.log(`🎲 Indices: ${indices.join(", ")}`);

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];

      console.log(`➡️ Adding index ${idx}`);

      // Reset to top
      await axios.get(`${baseUrl}/execute?script=${encodeURIComponent('browser_focus & browser_scroll -1000')}`);

      // Jump to index
      await axios.get(`${baseUrl}/execute?script=${encodeURIComponent(`browser_focus & browser_scroll +${idx}`)}`);

      // Add song
      await axios.get(`${baseUrl}/execute?script=${encodeURIComponent('playlist_add')}`);

      await sleep(1000);
    }

    console.log(`✅ Batch done`);

    await waitWithInterrupt(batchWaitMs);
  }

  console.log("🛑 Worker stopped");
}

// -------------------- START --------------------
async function startWorker(venueId) {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected");

    setupSignalHandlers();

    await runWorker(venueId);

  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await mongoose.disconnect();
  }
}

// -------------------- ENTRY --------------------
if (require.main === module) {
  const venueId = process.argv[2];

  if (!venueId) {
    console.error("❌ VenueId required");
    process.exit(1);
  }

  startWorker(venueId);
}

module.exports = { startWorker };