require("dotenv").config();
const axios = require("axios");
const mongoose = require("mongoose");

// Global stop signal for graceful shutdown
let SHOULD_STOP = false;
let currentSessionId = null;

// -------------------- SIGNAL HANDLERS --------------------
function setupSignalHandlers() {
  process.on("SIGTERM", () => {
    console.log("\n🛑 SIGTERM received, stopping worker gracefully...");
    SHOULD_STOP = true;
  });
  process.on("SIGINT", () => {
    console.log("\n🛑 SIGINT received, stopping worker gracefully...");
    SHOULD_STOP = true;
  });
}

// -------------------- UTILITY: SLEEP -------------------- 
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// -------------------- WAIT WITH INTERRUPT --------------------
async function waitWithInterrupt(ms) {
  const checkInterval = 1000; // Check every 1 second
  const endTime = Date.now() + ms;
  
  while (Date.now() < endTime && !SHOULD_STOP) {
    const remaining = endTime - Date.now();
    await new Promise(resolve => setTimeout(resolve, Math.min(checkInterval, remaining)));
  }
}

// -------------------- SIMPLIFIED LIVE PLAYLIST ROTATION --------------------
/**
 * Execute live playlist rotation: Add 5 songs every 6 minutes
 * Cycles through songs (indices 0 to totalSongs-1) in the Mixmind folder
 */
async function simplifiedLivePlaylistRotation(sessionId) {
  const baseUrl = process.env.EXECUTE_API_URL || "http://127.0.0.1:80";
  const totalSongs = parseInt(process.env.TOTAL_SONGS) || 94;
  const batchWaitMs = 360000; // 6 minutes = 360,000ms
  const songsPerBatch = 5; // Add 5 songs per batch
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🎵 SIMPLIFIED LIVE PLAYLIST ROTATION STARTED`);
  console.log(`${'='.repeat(70)}`);
  console.log(`📂 Total Songs: ${totalSongs}`);
  console.log(`🎵 Songs Per Batch: ${songsPerBatch}`);
  console.log(`⏱️  Wait Between Batches: ${batchWaitMs / 1000}s (${batchWaitMs / 60000} minutes)`);
  console.log(`📊 Session: ${sessionId}`);
  console.log(`${'='.repeat(70)}\n`);
  
  let currentIndex = 0;
  let batchCount = 0;
  
  // ===== INITIAL SETUP (ONE TIME AT STARTUP) =====
  try {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🚀 INITIAL SETUP`);
    console.log(`${'─'.repeat(60)}`);
    
    // Step 0: Go to Mixmind folder
    console.log(`📍 Step 0: Going to Mixmind folder...`);
    const goToFolderScript = `browser_gotofolder "beatport:\\Mixmind"`;
    const goToFolderUrl = `${baseUrl}/execute?script=${encodeURIComponent(goToFolderScript)}`;
    
    try {
      const goToFolderResponse = await axios.get(goToFolderUrl, { timeout: 10000 });
      console.log(`✓ Step 0 completed:`, goToFolderResponse.data);
    } catch (err) {
      console.error(`✗ Step 0 failed: ${err.message}`);
      throw new Error(`Go to folder failed: ${err.message}`);
    }
    
    // Step 0B: Select songs window
    console.log(`📍 Step 0B: Selecting songs window...`);
    const browserWindowScript = `browser_window "songs"`;
    const browserWindowUrl = `${baseUrl}/execute?script=${encodeURIComponent(browserWindowScript)}`;
    
    try {
      const browserWindowResponse = await axios.get(browserWindowUrl, { timeout: 10000 });
      console.log(`✓ Step 0B completed:`, browserWindowResponse.data);
    } catch (err) {
      console.error(`✗ Step 0B failed: ${err.message}`);
      throw new Error(`Browser window selection failed: ${err.message}`);
    }
    
    // Step 0C: Initial scroll to top
    console.log(`📍 Step 0C: Scrolling to top at startup...`);
    const scrollTopScript = `browser_focus & browser_scroll -1000`;
    const scrollTopUrl = `${baseUrl}/execute?script=${encodeURIComponent(scrollTopScript)}`;
    
    try {
      const scrollTopResponse = await axios.get(scrollTopUrl, { timeout: 10000 });
      console.log(`✓ Step 0C completed (scrolled to top):`, scrollTopResponse.data);
    } catch (err) {
      console.error(`✗ Step 0C failed: ${err.message}`);
      throw new Error(`Initial scroll to top failed: ${err.message}`);
    }
    
    console.log(`✅ Initial setup completed\n`);
    
  } catch (setupErr) {
    console.error(`\n❌ Initial setup failed: ${setupErr.message}`);
    console.log(`⏳ Waiting 30s before retrying initial setup...`);
    await waitWithInterrupt(30000);
    // Don't exit, will retry in next iteration
  }
  
  // ===== MAIN ROTATION LOOP =====
  while (!SHOULD_STOP) {
    batchCount++;
    
    try {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`🎵 BATCH #${batchCount} | Starting Index: ${currentIndex}/${totalSongs - 1}`);
      console.log(`${'─'.repeat(60)}`);
      
      // 1. Batch start: Reset to absolute top
      console.log(`📍 Batch Start: Scrolling to top...`);
      const scrollTopUrl = `${baseUrl}/execute?script=${encodeURIComponent('browser_focus & browser_scroll -1000')}`;
      await axios.get(scrollTopUrl, { timeout: 10000 });
      
      // 2. Jump to the starting index for this batch
      if (currentIndex > 0) {
        console.log(`📍 Jumping to batch start index: ${currentIndex}...`);
        const jumpUrl = `${baseUrl}/execute?script=${encodeURIComponent(`browser_focus & browser_scroll +${currentIndex}`)}`;
        await axios.get(jumpUrl, { timeout: 10000 });
      }
      
      // 3. Loop: Add 5 songs, moving down by just 1 each time
      for (let songNum = 1; songNum <= songsPerBatch; songNum++) {
        
        // Step A: Add current song to playlist
        console.log(`📍 Song ${songNum}/${songsPerBatch} [Index: ${currentIndex}] - Adding to playlist...`);
        const addUrl = `${baseUrl}/execute?script=${encodeURIComponent('playlist_add')}`;
        await axios.get(addUrl, { timeout: 10000 });
        
        // Step B: Calculate next index
        currentIndex = (currentIndex + 1) % totalSongs;
        
        // Step C: Move highlight to the next song (if we aren't done with the batch)
        if (songNum < songsPerBatch) {
          if (currentIndex === 0) {
            // If we hit the end of the folder mid-batch, jump back to top
            console.log(`📍 Reached end of folder, wrapping back to top...`);
            await axios.get(scrollTopUrl, { timeout: 10000 });
          } else {
            // Otherwise, just move down exactly 1 line
            console.log(`📍 Scrolling down 1 line to next song...`);
            const scrollDownUrl = `${baseUrl}/execute?script=${encodeURIComponent('browser_focus & browser_scroll +1')}`;
            await axios.get(scrollDownUrl, { timeout: 10000 });
          }
        }
      }
      
      console.log(`✅ Batch #${batchCount} completed successfully (5 songs added)`);
      console.log(`🎵 Next batch will start at index: ${currentIndex}`);
      
      // Wait before next batch
      console.log(`⏳ Waiting ${batchWaitMs / 1000}s (${batchWaitMs / 60000} minutes) before next batch...`);
      await waitWithInterrupt(batchWaitMs);
      
    } catch (err) {
      console.error(`\n❌ Batch #${batchCount} failed: ${err.message}`);
      console.log(`⏳ Waiting 30s before retrying...`);
      
      // On error, still increment to next song so we don't get stuck
      currentIndex = (currentIndex + 1) % totalSongs;
      
      // Wait before retry
      await waitWithInterrupt(30000);
    }
  }
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🛑 LIVE PLAYLIST ROTATION STOPPED`);
  console.log(`${'='.repeat(70)}\n`);
}

// -------------------- MAIN WORKER --------------------
async function livePlaylistWorker(sessionId) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log("🎵 LIVE PLAYLIST WORKER - SIMPLIFIED 3-STEP API ROTATION");
  console.log(`${'═'.repeat(70)}`);
  console.log(`📊 Session: ${sessionId}`);
  
  currentSessionId = sessionId;

  // Setup signal handlers for graceful shutdown
  setupSignalHandlers();

  try {
    await simplifiedLivePlaylistRotation(sessionId);
    console.log("\n✅ Live Playlist Worker completed!");
  } catch (err) {
    console.error(`\n❌ Worker error: ${err.message}`);
    throw err;
  }
}

// -------------------- START WORKER --------------------
async function startWorker(venueIdOrSessionId) {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    let finalSessionId = null;
    const LivePlaylistSession = require("../models/LivePlaylistSession");
    const Venue = require("../models/Venue");

    // Check if it's a valid ObjectId for venue
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(venueIdOrSessionId);
    
    if (isObjectId) {
      // It's a venueId - create new session for this venue
      console.log(`📝 Creating session for venue: ${venueIdOrSessionId}`);
      
      const venue = await Venue.findById(venueIdOrSessionId);
      if (!venue) {
        throw new Error(`Venue not found: ${venueIdOrSessionId}`);
      }

      const session = new LivePlaylistSession({
        venueId: venue._id,
        status: "active",
        tracks: [],
        startedAt: new Date()
      });

      await session.save();
      finalSessionId = session._id.toString();
      console.log(`✅ Created new session: ${finalSessionId} for venue: ${venue.name}`);
    } else {
      // It's a sessionId
      finalSessionId = venueIdOrSessionId;
      console.log(`✅ Using provided session: ${finalSessionId}`);
    }
    
    await livePlaylistWorker(finalSessionId);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    try {
      await mongoose.disconnect();
      console.log("MongoDB disconnected");
    } catch (e) {
      console.error("Error disconnecting:", e.message);
    }
  }
}

// Only start the worker when this file is executed directly.
if (require.main === module) {
  const venueId = process.argv[2];
  
  if (!venueId) {
    console.error("❌ VenueId required. Usage: node runLivePlaylistFlow.js <venueId>");
    process.exit(1);
  }
  
  startWorker(venueId);
}

module.exports = { livePlaylistWorker, startWorker };