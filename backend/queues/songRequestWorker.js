require("dotenv").config();
const axios = require("axios");
const mongoose = require("mongoose");
const Request = require("../models/Request");
const Venue = require("../models/Venue");
const { popFromStack, getStackSize } = require("../services/stackService");
const { validateSongGenre } = require("../services/lastfmGenreService");
const { sendGenreRejectionEmail } = require("../services/emailService");

/* -------------------- UTILITY: SLEEP -------------------- */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* -------------------- UTILITY: Check if song is essential -------------------- */
function isEssentialSong(songName, artistName) {
  const essentialSongs = [
    { name: "Happy Birthday", artist: "Stevie Wonder" },
    { name: "In Da Club", artist: "50 Cent" }
  ];
  
  return essentialSongs.some(s => 
    s.name.toLowerCase() === songName.toLowerCase() && 
    s.artist.toLowerCase() === artistName.toLowerCase()
  );
}

/* -------------------- GENRE VALIDATION AND PROCESSING -------------------- */
async function validateAndProcessSong(requestData, venue) {
  try {
    // STEP 1: Check if Genre Check is Bypassed (All Genres mode)
    if (venue.genreCheckBypass) {
      console.log(`✅ Genre Check Bypassed - "All Genres" mode enabled`);
      return { isValid: true, reason: "Genre check bypassed - All genres mode" };
    }

    // STEP 2: Check if song is Essential (e.g., Birthday songs)
    if (isEssentialSong(requestData.title, requestData.artist)) {
      console.log(`✅ Essential Song - Auto-pass (Birthday songs, etc.)`);
      return { isValid: true, reason: "Essential song - auto-approved" };
    }

    // If no preferred genres configured, accept all songs
    if (!venue.preferredGenres || venue.preferredGenres.length === 0) {
      console.log(`\n✅ No genre restrictions for venue - processing song`);
      return { isValid: true, reason: "No genre restrictions" };
    }

    console.log(`\n🔍 GENRE VALIDATION - Checking against venue genres: ${venue.preferredGenres.join(", ")}`);

    // STEP 3: Check against Song Database
    const songDB = require("../data/songDatabase.json");
    const dbSong = songDB.find(s => 
      s.name.toLowerCase() === requestData.title.toLowerCase() && 
      s.artist.toLowerCase() === requestData.artist.toLowerCase()
    );

    if (dbSong) {
      console.log(`📊 Song found in database`);
      const allGenres = [dbSong.genre, ...dbSong.secondary];
      // Case-insensitive genre matching
      const matchesGenre = allGenres.some(g => 
        venue.preferredGenres.map(vg => vg.toUpperCase()).includes(g.toUpperCase())
      );
      
      if (matchesGenre) {
        console.log(`✅ Genre match - Song genres match venue preferences`);
        console.log(`   Song genres: ${allGenres.join(", ")}`);
        console.log(`   Venue genres: ${venue.preferredGenres.join(", ")}`);
        return { isValid: true, reason: "Database genre match", source: "database" };
      } else {
        console.log(`❌ Genre mismatch - Database entry`);
        console.log(`   Song genres: ${allGenres.join(", ")}`);
        console.log(`   Venue genres: ${venue.preferredGenres.join(", ")}`);
        return {
          isValid: false,
          reason: `Song genres (${allGenres.join(", ")}) don't match venue genres (${venue.preferredGenres.join(", ")})`,
          source: "database",
          songTags: allGenres,
          venueGenres: venue.preferredGenres
        };
      }
    }

    // STEP 4: Fall back to Last.fm if not in database
    console.log(`🔗 Song not in database - Checking Last.fm...`);
    const genreValidation = await validateSongGenre(
      requestData.title,
      requestData.artist,
      venue.preferredGenres
    );

    // STEP 5: No tags on Last.fm - auto pass for safety
    if (genreValidation.tags.length === 0) {
      console.log(`⏭️  No Last.fm tags found - Auto-pass (STEP 5)`);
      return { isValid: true, reason: "No genre data available - auto-approved", source: "nodata" };
    }

    if (genreValidation.isValid) {
      console.log(`✅ GENRE VALID - Matched tag: "${genreValidation.matchedTag}"`);
      return { isValid: true, matchedTag: genreValidation.matchedTag, source: "lastfm" };
    }

    // Genre validation failed with tags present
    console.log(`❌ GENRE VALIDATION FAILED`);
    console.log(`   Reason: ${genreValidation.reason}`);

    return {
      isValid: false,
      reason: genreValidation.reason,
      songTags: genreValidation.tags,
      venueGenres: venue.preferredGenres,
      source: "lastfm"
    };
  } catch (err) {
    console.error(`❌ Genre validation error:`, err.message);
    // STEP 5: Auto-pass on error for safety
    console.log(`⏭️  Genre validation error - Auto-pass for safety`);
    return {
      isValid: true,
      reason: `Auto-pass due to validation error: ${err.message}`,
      source: "error"
    };
  }
}

/* -------------------- EXECUTE THREE-STEP REQUEST FLOW -------------------- */
async function executeThreeStepRequestFlow(songName, artistName) {
  try {
    console.log(`🎵 Processing song request: "${songName}" by "${artistName}"...`);
    
    // Check if running in MOCK mode (for testing without Beatport server)
    if (process.env.SKIP_BEATPORT === "true") {
      console.log(`🧪 MOCK MODE: Skipping actual Beatport API calls`);
      console.log(`✅ (Mock) All three steps completed successfully!`);
      return {
        success: true,
        message: "Three-step song request flow completed (MOCK)",
        songName,
        artistName
      };
    }
    
    const baseUrl = process.env.EXECUTE_API_URL || "http://127.0.0.1:80";
    console.log(`🌐 Using Beatport API at: ${baseUrl}`);
    console.log(`🎵 Song: "${songName}" by "${artistName}"`);
    
    // Pre-Step 1: Go to Online Music\Beatport folder
    console.log(`📍 Pre-Step 1: Going to Online Music\\Beatport folder...`);
    const goToFolderScript = `browser_gotofolder "Online Music\\Beatport"`;
    const goToFolderUrl = `${baseUrl}/execute?script=${encodeURIComponent(goToFolderScript)}`;
    
    try {
      const goToFolderResponse = await axios.get(goToFolderUrl, { timeout: 8000 });
      console.log(`   ✓ Pre-Step 1 completed`);
      console.log(`   Response:`, goToFolderResponse.data);
    } catch (err) {
      console.error(`   ✗ Pre-Step 1 failed:`, err.code || err.message);
      if (err.code === 'ECONNREFUSED') {
        console.error(`   💡 Connection refused - Is the automation API running at ${baseUrl}?`);
      }
      throw new Error(`Go to folder failed: ${err.message}`);
    }
    
    // Pre-Step 2: Select songs window
    console.log(`📍 Pre-Step 2: Selecting songs window...`);
    const browserWindowScript = `browser_window "songs"`;
    const browserWindowUrl = `${baseUrl}/execute?script=${encodeURIComponent(browserWindowScript)}`;
    
    try {
      const browserWindowResponse = await axios.get(browserWindowUrl, { timeout: 8000 });
      console.log(`   ✓ Pre-Step 2 completed`);
      console.log(`   Response:`, browserWindowResponse.data);
    } catch (err) {
      console.error(`   ✗ Pre-Step 2 failed:`, err.code || err.message);
      throw new Error(`Browser window selection failed: ${err.message}`);
    }
    
    // Step 1: Search for the song
    console.log(`📍 Step 1: Searching for song...`);
    const searchQuery = `${songName} ${artistName}`;
    const searchScript = `search "${searchQuery}"`;
    const searchUrl = `${baseUrl}/execute?script=${encodeURIComponent(searchScript)}`;
    
    console.log(`   Search query: "${searchQuery}"`);
    
    try {
      const searchResponse = await axios.get(searchUrl, { timeout: 8000 });
      console.log(`   ✓ Search step completed`);
      console.log(`   Response:`, searchResponse.data);
    } catch (searchErr) {
      console.error(`   ✗ Search step failed:`, searchErr.code || searchErr.message);
      throw new Error(`Search step failed: ${searchErr.message}`);
    }
    
    // Wait 2000ms for search results to load
    console.log(`   ⏳ Waiting for search results to load...`);
    await sleep(2000);
    
    // Step 2: Focus on first result and scroll to index 1 (second item)
    console.log(`📍 Step 2: Selecting and scrolling to index 1...`);
    const selectScript = `browser_focus & browser_scroll +1`;
    const selectUrl = `${baseUrl}/execute?script=${encodeURIComponent(selectScript)}`;
    
    try {
      const selectResponse = await axios.get(selectUrl, { timeout: 5000 });
      console.log(`   ✓ Select step completed`);
      console.log(`   Response:`, selectResponse.data);
    } catch (selectErr) {
      console.error(`   ✗ Select step failed:`, selectErr.code || selectErr.message);
      throw new Error(`Select step failed: ${selectErr.message}`);
    }
    
    // Step 2.5: Click/Select the highlighted item
    console.log(`📍 Step 2.5: Clicking selected item to focus...`);
    const clickScript = `browser_click`;
    const clickUrl = `${baseUrl}/execute?script=${encodeURIComponent(clickScript)}`;
    
    try {
      const clickResponse = await axios.get(clickUrl, { timeout: 5000 });
      console.log(`   ✓ Click step completed`);
      console.log(`   Response:`, clickResponse.data);
    } catch (clickErr) {
      console.warn(`   ⚠️  Click step warning (continuing anyway):`, clickErr.message);
      // Don't throw - continue anyway
    }
    
    // Wait 1500ms between click and add
    console.log(`   ⏳ Waiting before add...`);
    await sleep(1500);
    
    // Step 3: Add to automix (must be in automix window context)
    console.log(`📍 Step 3: Adding to Beatport automix...`);
    const addScript = `automix_add_next`;
    const addUrl = `${baseUrl}/execute?script=${encodeURIComponent(addScript)}`;
    
    try {
      console.log(`   Making request to: ${baseUrl}`);
      console.log(`   Script: ${addScript}`);
      const addResponse = await axios.get(addUrl, { timeout: 8000 });
      console.log(`   ✓ Add step completed`);
      console.log(`   Response:`, addResponse.data);
    } catch (addErr) {
      console.error(`   ✗ Add step failed:`, addErr.code || addErr.message);
      throw new Error(`Add step failed: ${addErr.message}`);
    }
    
    console.log(`\n✅ SONG SUCCESSFULLY ADDED TO AUTOMIX! 🎉`);
    console.log(`   Song: "${songName}" by "${artistName}"`);
    console.log(`   Status: Added to beatport:\\Mixmind\\automix queue`);
    return {
      success: true,
      message: "Song successfully added to Beatport automix",
      songName,
      artistName
    };
    
  } catch (err) {
    console.error(`\n❌ THREE-STEP FLOW ERROR:`, err.message);
    console.error(`   Error Type: ${err.code || 'Unknown'}`);
    if (err.code === 'ECONNREFUSED') {
      console.error(`   💡 DEBUG: Connection refused to ${process.env.EXECUTE_API_URL || 'http://127.0.0.1:80'}`);
      console.error(`   💡 DEBUG: Make sure the Beatport automation API is running!`);
    }
    console.error(`   Stack: ${err.stack}`);
    return {
      success: false,
      error: err.message,
      songName,
      artistName
    };
  }
}

/* -------------------- GLOBAL STOP SIGNAL -------------------- */
let SHOULD_STOP = false;

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

/* -------------------- INITIALIZE MONGODB -------------------- */
async function initializeDatabase() {
  if (mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log("✅ MongoDB connected for Song Request Worker");
    } catch (err) {
      console.error("❌ Failed to connect MongoDB:", err.message);
      setTimeout(initializeDatabase, 5000);
      return false;
    }
  }
  return true;
}

/* -------------------- MAIN STACK PROCESSOR LOOP -------------------- */
async function startStackWorker() {
  // Setup signal handlers
  setupSignalHandlers();
  
  // Connect to MongoDB
  const connected = await initializeDatabase();
  if (!connected) {
    process.exit(1);
  }
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🎵 STACK-BASED SONG REQUEST WORKER STARTED`);
  console.log(`${'='.repeat(70)}`);
  console.log(`⏱️  Process all songs every 30 seconds`);
  console.log(`${'='.repeat(70)}\n`);
  
  // Processing interval: 30 seconds
  const processInterval = 30000; // 30 seconds
  let cycleCount = 0;
  let totalProcessed = 0;
  
  while (!SHOULD_STOP) {
    try {
      cycleCount++;
      let songsProcessedThisCycle = 0;
      
      console.log(`\n${'='.repeat(70)}`);
      console.log(`🎵 CYCLE #${cycleCount} - Processing ALL songs in stack`);
      console.log(`${'='.repeat(70)}\n`);
      
      // Get all venues with Live Playlist enabled
      const venues = await Venue.find({ livePlaylistActive: true });
      
      if (venues.length === 0) {
        console.log(`⏳ No venues with Live Playlist enabled - waiting 30 seconds...\n`);
        await sleep(processInterval);
        continue;
      }
      
      // For each venue, process ALL songs in its stack
      for (const venue of venues) {
        if (SHOULD_STOP) break;
        
        let venueStackProcessed = 0;
        
        // Keep processing until stack is empty for this venue
        while (true) {
          if (SHOULD_STOP) break;
          
          // Get stack size
          const sizeResult = await getStackSize(venue._id.toString());
          const stackSize = sizeResult.data || 0;
          
          if (stackSize === 0) {
            if (venueStackProcessed > 0) {
              console.log(`✅ ${venue.name}: All ${venueStackProcessed} song(s) processed from stack\n`);
            }
            break;
          }
          
          // Pop from stack (LIFO - most recent first)
          const popResult = await popFromStack(venue._id.toString());
          
          if (!popResult.success || !popResult.data) {
            console.log(`⚠️  Failed to pop from stack for venue ${venue.name}`);
            break;
          }
          
          const requestData = popResult.data;
          venueStackProcessed++;
          songsProcessedThisCycle++;
          totalProcessed++;
          
          console.log(`   🎵 [${venue.name}] Song ${venueStackProcessed}: "${requestData.title}" by "${requestData.artist}"`);
          console.log(`      Request ID: ${requestData._id}`);
          console.log(`      User: ${requestData.userName}`);
          console.log(`      Remaining in Stack: ${stackSize - 1}`);
          
          try {
            // Update request status to "processing"
            await Request.findByIdAndUpdate(requestData._id, { 
              status: "processing",
              flowStatus: "in_progress"
            });
            
            // ===== VALIDATE SONG GENRE =====
            const genreValidation = await validateAndProcessSong(requestData, venue);
            
            if (!genreValidation.isValid) {
              console.log(`      ❌ Genre validation failed: ${genreValidation.reason}`);
              
              // Update request status to rejected
              await Request.findByIdAndUpdate(requestData._id, { 
                status: "rejected",
                flowStatus: "genre_mismatch",
                rejectionReason: `Song genre doesn't match venue preferences. ${genreValidation.reason}`,
                genreCheckPassed: false
              });
              
              // Fetch user and send rejection email
              try {
                const request = await Request.findById(requestData._id).populate("userId");
                if (request && request.userId && request.userId.email) {
                  const emailResult = await sendGenreRejectionEmail(
                    request,
                    venue,
                    genreValidation.reason,
                    genreValidation.songTags
                  );
                  
                  if (emailResult.success) {
                    console.log(`      📧 Genre rejection email sent to ${request.userId.email}`);
                  } else {
                    console.error(`      ❌ Failed to send rejection email:`, emailResult.error);
                  }
                }
              } catch (emailErr) {
                console.error(`      ❌ Error sending rejection email:`, emailErr.message);
              }
              
              // Move to next song in stack
              continue;
            }
            
            // Genre validation passed, proceed with 3-step flow
            console.log(`      ✅ Genre validation passed`);
            
            // ===== CHECK PAYMENT FOR LIVE MODE =====
            // IMPORTANT: Reload fresh Request from DB (not stack data) to get latest payment status
            let freshRequest = await Request.findById(requestData._id);
            if (!freshRequest) {
              console.log(`      ❌ Request not found in database`);
              continue;
            }
            
            const isLiveMode = !!freshRequest.checkoutSessionId;
            if (isLiveMode) {
              // LIVE mode: Check if payment is confirmed
              if (freshRequest.paymentStatus !== "captured" && freshRequest.paymentStatus !== "paid") {
                console.log(`      ⏳ LIVE mode: Waiting for payment confirmation`);
                console.log(`         Current paymentStatus: ${freshRequest.paymentStatus}`);
                console.log(`         Required: "captured" or "paid"`);
                console.log(`         Checkout Session: ${freshRequest.checkoutSessionId}`);
                
                // Defensive check: If we have a checkout session ID, verify it with Stripe
                // This handles cases where the DB might be out of sync
                if (freshRequest.checkoutSessionId) {
                  console.log(`         🔍 Attempting verification check with Stripe...`);
                  try {
                    const { verifyCheckoutSession } = require("../features/payments/stripe/stripe.verification");
                    const verifyResult = await verifyCheckoutSession(freshRequest.checkoutSessionId);
                    
                    if (verifyResult.success) {
                      console.log(`         ✅ Verification successful! Re-fetching request...`);
                      // Try fetching again after verification
                      freshRequest = await Request.findById(requestData._id);
                      
                      if (freshRequest.paymentStatus === "captured" || freshRequest.paymentStatus === "paid") {
                        console.log(`         ✅ Request now shows paymentStatus: ${freshRequest.paymentStatus}`);
                      } else {
                        console.log(`         ⚠️  After verification, paymentStatus is still: ${freshRequest.paymentStatus}`);
                      }
                    } else {
                      console.log(`         ⚠️  Verification failed: ${verifyResult.message}`);
                      
                      // Handle specific failure states
                      if (verifyResult.sessionState === "open") {
                        console.log(`            → Checkout still open, will retry next cycle`);
                      } else if (verifyResult.sessionState === "expired") {
                        console.log(`            → Checkout expired, user needs to create new request`);
                      }
                      
                      // Re-add to stack for retry
                      const { pushToStack } = require("../services/stackService");
                      try {
                        await pushToStack(venue._id.toString(), requestData);
                        console.log(`         📥 Re-added to stack for retry`);
                      } catch (requeueErr) {
                        console.warn(`         ⚠️  Failed to re-queue:`, requeueErr.message);
                      }
                      // Skip this request now since we've re-queued it
                    }
                  } catch (verifyErr) {
                    console.warn(`         ⚠️  Verification error: ${verifyErr.message}`);
                    console.warn(`         Treating as unconfirmed payment, will retry next cycle`);
                    
                    // Re-add to stack for retry
                    const { pushToStack } = require("../services/stackService");
                    try {
                      await pushToStack(venue._id.toString(), requestData);
                      console.log(`         📥 Re-added to stack for retry`);
                    } catch (requeueErr) {
                      console.warn(`         ⚠️  Failed to re-queue:`, requeueErr.message);
                    }
                  }
                }
                
                // Final check: if payment is still not confirmed, skip this request
                if (freshRequest.paymentStatus !== "captured" && freshRequest.paymentStatus !== "paid") {
                  console.log(`         ❌ Payment still not confirmed, skipping for now`);
                  continue;
                }
                
                // Payment is now confirmed! Continue to process
                console.log(`         ✅ Payment confirmed after verification!`);
              }
              console.log(`      ✅ LIVE mode: Payment confirmed (${freshRequest.paymentStatus})`);
            }
            
            // Execute the 3-step flow
            const flowResult = await executeThreeStepRequestFlow(requestData.title, requestData.artist);
            
            // Update request based on result
            if (flowResult.success) {
              await Request.findByIdAndUpdate(requestData._id, { 
                status: "completed",
                flowStatus: "completed",
                genreCheckPassed: true,
                matchedGenre: genreValidation.matchedTag
              });
              console.log(`      ✅ Added to Beatport automix`);
            } else {
              await Request.findByIdAndUpdate(requestData._id, { 
                status: "failed",
                flowStatus: "failed",
                flowError: flowResult.error
              });
              console.log(`      ❌ Failed: ${flowResult.error}`);
            }
          } catch (processErr) {
            console.error(`      ❌ Error: ${processErr.message}`);
            
            // Update request with error
            await Request.findByIdAndUpdate(requestData._id, { 
              status: "failed",
              flowStatus: "failed",
              flowError: processErr.message
            }).catch(e => console.error("Error updating request:", e));
          }
          
          // Small delay between processing songs
          await sleep(2000);
        }
      }
      
      console.log(`${'='.repeat(70)}`);
      console.log(`✅ CYCLE #${cycleCount} COMPLETE - Processed ${songsProcessedThisCycle} song(s) (Total: ${totalProcessed})`);
      console.log(`⏳ Waiting 30 seconds for next cycle...`);
      console.log(`${'='.repeat(70)}\n`);
      
      // Wait 30 seconds before next cycle
      await sleep(processInterval);
      
    } catch (err) {
      console.error(`❌ ERROR in cycle ${cycleCount}:`, err.message);
      console.log(`⏳ Waiting 30 seconds before retry...\n`);
      await sleep(processInterval);
    }
  }
  
  console.log(`\n🛑 Song Request Worker stopped gracefully (Total processed: ${totalProcessed})`);
  process.exit(0);
}

// Initialize the worker immediately
console.log(`\n${'='.repeat(70)}`);
console.log(`🚀 Starting Song Request Stack Worker...`);
console.log(`${'='.repeat(70)}\n`);

startStackWorker().catch(err => {
  console.error("\n❌ Worker FATAL ERROR:", err.message);
  console.error("Stack trace:", err.stack);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("\n❌ Uncaught Exception:", err.message);
  console.error("Stack:", err.stack);
  // Don't exit - let worker continue
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("\n❌ Unhandled Rejection at:", promise, "reason:", reason);
  // Don't exit - let worker continue
});

module.exports = startStackWorker;
