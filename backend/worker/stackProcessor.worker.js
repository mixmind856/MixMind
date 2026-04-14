require("dotenv").config();
const axios = require("axios");
const mongoose = require("mongoose");
const Venue = require("../models/Venue");
const Request = require("../models/Request");
const { popFromStack, getStackSize } = require("../services/stackService");

// Global stop signal for graceful shutdown
let SHOULD_STOP = false;

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

// -------------------- ADD SONG TO BEATPORT (3-STEP FLOW) --------------------
/**
 * Execute 3-step flow to add song to Beatport DJ app
 * 1. Go to Mixmind folder
 * 2. Select songs window
 * 3. Search for song
 * 4. Select and scroll
 * 5. Add to automix
 */
async function addSongToBeatportFlow(songName, artistName) {
  try {
    console.log(`🎵 Processing song: "${songName}" by "${artistName}"...`);
    
    const baseUrl = process.env.EXECUTE_API_URL || "http://127.0.0.1:80";
    
    // Pre-Step 1: Go to Beatport folder
    console.log(`📍 Pre-Step 1: Going to Beatport\\Mixmind folder...`);
    const goToFolderScript = `browser_gotofolder "beatport:\\Mixmind"`;
    const goToFolderUrl = `${baseUrl}/execute?script=${encodeURIComponent(goToFolderScript)}`;
    
    try {
      const goToFolderResponse = await axios.get(goToFolderUrl, { timeout: 5000 });
      console.log(`✓ Pre-Step 1 completed`);
    } catch (err) {
      console.error(`✗ Pre-Step 1 failed:`, err.message);
      throw new Error(`Go to folder failed: ${err.message}`);
    }
    
    // Pre-Step 2: Select songs window
    console.log(`📍 Pre-Step 2: Selecting songs window...`);
    const browserWindowScript = `browser_window "songs"`;
    const browserWindowUrl = `${baseUrl}/execute?script=${encodeURIComponent(browserWindowScript)}`;
    
    try {
      const browserWindowResponse = await axios.get(browserWindowUrl, { timeout: 5000 });
      console.log(`✓ Pre-Step 2 completed`);
    } catch (err) {
      console.error(`✗ Pre-Step 2 failed:`, err.message);
      throw new Error(`Browser window selection failed: ${err.message}`);
    }
    
    // Step 1: Search for the song
    console.log(`📍 Step 1: Searching for song...`);
    const searchScript = `search "${songName} ${artistName}"`;
    const searchUrl = `${baseUrl}/execute?script=${encodeURIComponent(searchScript)}`;
    
    try {
      const searchResponse = await axios.get(searchUrl, { timeout: 5000 });
      console.log(`✓ Search step completed`);
    } catch (searchErr) {
      console.error(`✗ Search step failed:`, searchErr.message);
      throw new Error(`Search step failed: ${searchErr.message}`);
    }
    
    // Wait 1000ms between search and select
    await sleep(1000);
    
    // Step 2: Select/Focus and Scroll
    console.log(`📍 Step 2: Selecting and scrolling...`);
    const selectScript = `browser_focus & browser_scroll +2`;
    const selectUrl = `${baseUrl}/execute?script=${encodeURIComponent(selectScript)}`;
    
    try {
      const selectResponse = await axios.get(selectUrl, { timeout: 5000 });
      console.log(`✓ Select step completed`);
    } catch (selectErr) {
      console.error(`✗ Select step failed:`, selectErr.message);
      throw new Error(`Select step failed: ${selectErr.message}`);
    }
    
    // Wait 1000ms between select and add
    await sleep(1000);
    
    // Step 3: Add to playlist (automix_add_next adds to front of queue for LIFO)
    console.log(`📍 Step 3: Adding to automix...`);
    const addScript = `automix_add_next`;
    const addUrl = `${baseUrl}/execute?script=${encodeURIComponent(addScript)}`;
    
    try {
      const addResponse = await axios.get(addUrl, { timeout: 5000 });
      console.log(`✓ Add step completed - Song added to automix`);
    } catch (addErr) {
      console.error(`✗ Add step failed:`, addErr.message);
      throw new Error(`Add step failed: ${addErr.message}`);
    }
    
    console.log(`✅ All three steps completed successfully!`);
    return {
      success: true,
      message: "Song successfully added to Beatport automix",
      songName,
      artistName
    };
    
  } catch (err) {
    console.error(`❌ 3-step flow error:`, err.message);
    return {
      success: false,
      error: err.message,
      songName,
      artistName
    };
  }
}

// -------------------- PROCESS VENUE STACK --------------------
/**
 * For a given venue, pop from stack and process the song
 * Updates the Request status in database
 */
async function processVenueStack(venueId) {
  try {
    // Get stack size
    const sizeResult = await getStackSize(venueId);
    const stackSize = sizeResult.data || 0;
    
    if (stackSize === 0) {
      console.log(`📭 No pending requests for venue ${venueId}`);
      return { processed: false, reason: "Stack is empty" };
    }
    
    // Pop from stack (LIFO - most recent first)
    const popResult = await popFromStack(venueId);
    
    if (!popResult.success || !popResult.data) {
      console.log(`⚠️  Failed to pop from stack for venue ${venueId}`);
      return { processed: false, reason: "Failed to pop from stack" };
    }
    
    const requestData = popResult.data;
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🎵 PROCESSING FROM STACK (LIFO)`);
    console.log(`${'='.repeat(70)}`);
    console.log(`   Venue ID: ${venueId}`);
    console.log(`   Request ID: ${requestData._id}`);
    console.log(`   Song: "${requestData.title}" by "${requestData.artist}"`);
    console.log(`   User: ${requestData.userName}`);
    console.log(`   Remaining in stack: ${stackSize - 1}`);
    console.log(`${'='.repeat(70)}\n`);
    
    // Execute the 3-step flow to add to Beatport
    const flowResult = await addSongToBeatportFlow(requestData.title, requestData.artist);
    
    if (flowResult.success) {
      // Update request status to "processing"
      try {
        const request = await Request.findById(requestData._id);
        if (request) {
          request.status = "processing";
          request.beatPortTrackId = requestData._id; // Store track ID reference
          await request.save();
          console.log(`✅ Request status updated to "processing": ${requestData._id}\n`);
        }
      } catch (updateErr) {
        console.error(`⚠️  Failed to update request status:`, updateErr.message);
      }
      
      return { processed: true, success: true, requestId: requestData._id };
    } else {
      // If failed, put the request back on the stack (push to front)
      console.log(`⚠️  Adding back to stack due to processing failure`);
      
      // Note: We'd need to re-add to stack, but for now just log
      return { processed: false, reason: "Processing failed", error: flowResult.error };
    }
    
  } catch (err) {
    console.error(`❌ Error processing venue stack:`, err.message);
    return { processed: false, reason: err.message };
  }
}

// -------------------- MAIN STACK PROCESSOR LOOP --------------------
/**
 * Main worker loop:
 * 1. Get all venues with Live Playlist enabled
 * 2. For each venue, process one item from the stack
 * 3. Wait between processing
 * 4. Repeat
 */
async function startStackProcessor() {
  // Setup signal handlers
  setupSignalHandlers();
  
  // Connect to MongoDB
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected for Stack Processor Worker\n");
  } catch (err) {
    console.error("❌ Failed to connect MongoDB:", err.message);
    process.exit(1);
  }
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🎵 STACK PROCESSOR WORKER STARTED`);
  console.log(`${'='.repeat(70)}`);
  console.log(`⏱️  Check interval: ${process.env.STACK_PROCESS_INTERVAL || 10000}ms`);
  console.log(`${'='.repeat(70)}\n`);
  
  // Processing delay between songs (default: 2 seconds)
  const processInterval = Number(process.env.STACK_PROCESS_INTERVAL) || 10000;
  
  let processCount = 0;
  
  while (!SHOULD_STOP) {
    try {
      // Get all venues with Live Playlist enabled
      const venues = await Venue.find({ livePlaylistActive: true });
      
      if (venues.length === 0) {
        console.log(`⏳ No venues with Live Playlist enabled, waiting...`);
        await sleep(processInterval);
        continue;
      }
      
      // Process one song from each venue (round-robin)
      for (const venue of venues) {
        if (SHOULD_STOP) break;
        
        processCount++;
        console.log(`\n[Process #${processCount}] Checking venue: ${venue.name} (${venue._id})`);
        
        const result = await processVenueStack(venue._id.toString());
        
        if (result.processed) {
          console.log(`✅ Successfully processed request: ${result.requestId}`);
        } else {
          console.log(`ℹ️  ${result.reason || result.reason}`);
        }
        
        // Wait between venues
        if (venues.indexOf(venue) < venues.length - 1) {
          await sleep(2000);
        }
      }
      
      // Wait before next check
      console.log(`\n⏳ Waiting ${processInterval / 1000}s before next check...\n`);
      await sleep(processInterval);
      
    } catch (err) {
      console.error(`❌ Error in main loop:`, err.message);
      await sleep(processInterval);
    }
  }
  
  console.log(`\n🛑 Stack Processor Worker stopped gracefully`);
  process.exit(0);
}

// Start the worker
startStackProcessor().catch(err => {
  console.error(`❌ Fatal error:`, err);
  process.exit(1);
});
