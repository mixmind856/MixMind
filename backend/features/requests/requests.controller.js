const User = require("../../models/User");
const Request = require("../../models/Request");
const Payment = require("../../models/Payment");
const { validateSongGenre } = require("../../services/lastfmGenreService");
const { sendGenreRejectionEmail } = require("../../services/emailService");
const beatsourceQueue = require("../../queues/beatsourceQueue");
const livePlaylistQueue = require("../../queues/livePlaylistQueue");
const songRequestQueue = require("../../queues/songRequestQueue");
const Venue = require("../../models/Venue");
const axios = require("axios");
const { pushToStack, getStackSize } = require("../../services/stackService");
const { createCheckoutSession, createCheckoutSessionDJ, createPaymentIntentDJ } = require("../../features/payments/stripe/stripe.service");

/* -------------------- UTILITY: SLEEP -------------------- */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* -------------------- UTILITY: CHECK IF SONG IS ESSENTIAL -------------------- */
function isEssentialSong(songName, artistName) {
  const songDB = require("../../data/songDatabase.json");
  const essential = songDB.find(s => 
    s.essential === true &&
    s.name.toLowerCase() === songName.toLowerCase() && 
    s.artist.toLowerCase() === artistName.toLowerCase()
  );
  return !!essential;
}

/* -------------------- CREATE REQUEST -------------------- */
async function createRequest(req, res) {
  try {
    const { name, email, title, artist, price, songTitle, artistName, userName, venueId, phone, countryCode } = req.body;

    console.log(`\n📨 INCOMING REQUEST:`);
    console.log(`   Name: ${name}, Email: ${email}`);
    console.log(`   Song: ${songTitle || title}, Artist: ${artistName || artist}`);
    console.log(`   Phone: ${phone}, Country Code: ${countryCode}`);
    console.log(`   VenueId: ${venueId}\n`);

    // Use new field names or fallback to old ones for backwards compatibility
    // IMPORTANT: Trim whitespace from song and artist names for Last.fm API matching
    const songName = (title || songTitle || "").trim();
    const artistName_ = (artist || artistName || "").trim();
    const userName_ = (name || userName || "").trim();

    if (!userName_ || !email || !songName || !artistName_) {
      console.error(`❌ Missing fields validation failed`);
      return res.status(400).json({ error: "Missing required fields" });
    }

    console.log(`✅ Field validation passed`);

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ name: userName_, email, role: "user" });
      console.log(`✅ Created new user: ${user._id}`);
    } else {
      console.log(`✅ Found existing user: ${user._id}`);
    }

    // Check if venue exists and get its DJ mode and Live Playlist settings
    let djModeEnabled = false;
    let livePlaylistActive = false;
    let venue = null;
    if (venueId) {
      venue = await Venue.findById(venueId);
      djModeEnabled = venue && venue.djMode ? true : false;
      livePlaylistActive = venue && venue.livePlaylistActive ? true : false;
      
      console.log(`\n🎯 REQUEST ROUTING LOGIC for Venue ${venueId}:`);
      console.log(`   Venue found: ${!!venue}`);
      console.log(`   Venue name: ${venue?.name || "N/A"}`);
      console.log(`   DJ Mode: ${djModeEnabled ? "✅ ON" : "❌ OFF"}`);
      console.log(`   Live Playlist: ${livePlaylistActive ? "✅ ON" : "❌ OFF"}`);
    }

    // ===== KEY DECISION LOGIC =====
    // NOW INDEPENDENT: DJ Mode and Live Playlist work SEPARATELY
    // 1. If DJ Mode is ON → send to DJ panel (pending_dj_approval)
    // 2. Else if Live Playlist is ON → auto-process (queued)
    // 3. Else → send to DJ panel (pending_dj_approval, default fallback)
    let initialStatus = "queued";
    let routingReason = "";

    if (djModeEnabled) {
      initialStatus = "pending_dj_approval";
      routingReason = "DJ Mode enabled → DJ Panel for approval";
    } else if (livePlaylistActive) {
      initialStatus = "queued";
      routingReason = "Live Playlist enabled → Auto-process queue";
    } else {
      initialStatus = "pending_dj_approval";
      routingReason = "Neither DJ nor Live Playlist → DJ Panel (fallback)";
    }

    console.log(`   📍 Status: "${initialStatus}"`);
    console.log(`   📝 Reason: ${routingReason}\n`);

    // ===== CALCULATE DYNAMIC PRICING BASED ON DJ MODE =====
    // DJ Mode ON: £9 | DJ Mode OFF: £3
    let finalPrice = price || 0;
    if (venueId && venue) {
      finalPrice = djModeEnabled ? 9 : 3;
      console.log(`💷 PRICING CALCULATION:`);
      console.log(`   DJ Mode: ${djModeEnabled ? "ON" : "OFF"}`);
      console.log(`   Price: £${finalPrice}`);
    }

    const requestData = {
      userId: user._id,
      title: songName,
      songTitle: songName,
      artist: artistName_,
      artistName: artistName_,
      userName: userName_,
      phone: phone,
      countryCode: countryCode,
      price: finalPrice,
      status: initialStatus,
      sourcePlaylistId: process.env.SOURCE_PLAYLIST_ID
    };

    // Add venueId if provided
    if (venueId) {
      requestData.venueId = venueId;
      console.log(`   VenueId prepared for saving: ${venueId}`);
    }

    console.log(`📝 About to save request with data:`, requestData);

    const request = await Request.create(requestData);
    
    console.log(`✅ Request.create() returned:`);
    console.log(`   ID: ${request._id}`);
    console.log(`   Title: ${request.title}`);
    console.log(`   Status: ${request.status}`);
    
    // Force flush to database with explicit wait
    const savedReq = await Request.findById(request._id);
    if (!savedReq) {
      console.error(`❌ SAVE FAILED - Could not retrieve saved request immediately after creation`);
      console.error(`   Looking for ID: ${request._id}`);
      throw new Error("Request save verification failed");
    }
    
    console.log(`✅ CONFIRMED - Request exists in database`);
    console.log(`   VenueId in DB: ${savedReq.venueId}`);  

    // If DJ mode is enabled, send to DJ panel + create Checkout Session with manual capture
    if (djModeEnabled) {
      console.log(`📌 DJ MODE ACTIVE - Request will appear in DJ panel`);
      console.log(`📌 DJ Approval Pending - Request ID: ${request._id}, Song: "${songName}"`);
      
      try {
        // Create Checkout Session for DJ mode (manual capture - redirects to Stripe like LIVE)
        console.log(`💳 Creating Checkout Session for DJ mode (manual capture)...`);
        const checkoutData = await createCheckoutSessionDJ(request, venueId);
        const checkoutSessionId = checkoutData.checkoutSessionId;
        const checkoutUrl = checkoutData.url;
        
        // Update request with checkout session
        await Request.findByIdAndUpdate(request._id, {
          checkoutSessionId: checkoutSessionId,
          paymentStatus: "pending"
        });
        
        console.log(`✅ DJ Checkout session created: ${checkoutSessionId}`);
        
        // Note: Payment record is already created by createCheckoutSessionDJ()
        // No need to create it again here
        
        return res.status(201).json({ 
          requestId: request._id, 
          status: request.status,
          message: "Song request submitted. Awaiting DJ approval.",
          djPending: true,
          checkoutUrl: checkoutUrl,
          checkoutSessionId: checkoutSessionId
        });
      } catch (checkoutErr) {
        console.error("❌ Checkout session creation failed:", checkoutErr.message);
        // Still return success - request created even if payment prep failed
        return res.status(201).json({ 
          requestId: request._id, 
          status: request.status,
          message: "Song request submitted. Awaiting DJ approval.",
          djPending: true,
          warning: "Checkout setup failed but request created"
        });
      }
    }

    // If live playlist is OFF (and DJ also off), needs DJ approval
    if (!livePlaylistActive && !djModeEnabled) {
      console.log(`📌 BOTH OFF - Request routing to DJ panel (DJ disabled)`);
      
      try {
        // Create Checkout Session for DJ mode (manual capture)
        console.log(`💳 Creating DJ Checkout Session (fallback DJ mode)...`);
        const checkoutData = await createCheckoutSessionDJ(request, venueId);
        const checkoutSessionId = checkoutData.checkoutSessionId;
        const checkoutUrl = checkoutData.url;
        
        await Request.findByIdAndUpdate(request._id, {
          checkoutSessionId: checkoutSessionId,
          paymentStatus: "pending"
        });
        
        // Note: Payment record is already created by createCheckoutSessionDJ()
        // No need to create it again here
        
        return res.status(201).json({
          requestId: request._id,
          status: request.status,
          message: "Song request submitted. Awaiting DJ approval.",
          djPending: true,
          checkoutUrl: checkoutUrl,
          checkoutSessionId: checkoutSessionId
        });
      } catch (checkoutErr) {
        console.error("❌ Checkout setup failed:", checkoutErr.message);
        return res.status(201).json({
          requestId: request._id,
          status: request.status,
          message: "Song request submitted. Awaiting DJ approval.",
          djPending: true
        });
      }
    }

    // ===== GENRE FILTERING LOGIC =====
    // Applies only when: Live Playlist ON + DJ OFF + Genre preferences set
    try {
      console.log(`\n[DEBUG] Genre check conditions - livePlaylistActive: ${livePlaylistActive}, djModeEnabled: ${djModeEnabled}, venue exists: ${!!venue}`);
      
      if (livePlaylistActive && !djModeEnabled && venue) {
        console.log(`\n🔎 GENRE CHECK SYSTEM:`);
      
      // STEP 1: Check if Genre Check is Bypassed (All Genres mode)
      if (venue.genreCheckBypass) {
        console.log(`✅ Genre Check Bypassed - "All Genres" mode enabled`);
        console.log(`   All songs will pass without genre validation`);
        await Request.findByIdAndUpdate(request._id, { 
          genreCheckPassed: true,
          detectedTags: ["BYPASS"],
          metadata: { note: "Genre check bypassed - All genres mode" }
        });
      } 
      // STEP 2: Check if song is Essential (e.g., Birthday songs)
      else if (isEssentialSong(songName, artistName_)) {
        console.log(`✅ Essential Song - Auto-pass (Birthday songs, etc.)`);
        console.log(`   Song: "${songName}" by "${artistName_}"`);
        await Request.findByIdAndUpdate(request._id, { 
          genreCheckPassed: true,
          detectedTags: ["ESSENTIAL"],
          metadata: { note: "Essential song - auto-approved" }
        });
      }
      // STEP 3: Check against Song Database
      else if (venue.preferredGenres && venue.preferredGenres.length > 0) {
        console.log(`🎵 Validating genre for: "${songName}" by "${artistName_}"...`);
        
        const songDB = require("../../data/songDatabase.json");
        console.log(`📖 Database has ${songDB.length} songs. Searching for: "${songName}" / "${artistName_}"`);
        
        const dbSong = songDB.find(s => {
          const nameMatch = s.name.toLowerCase() === songName.toLowerCase();
          const artistMatch = s.artist.toLowerCase() === artistName_.toLowerCase();
          console.log(`   Checking: "${s.name}" / "${s.artist}" → name:${nameMatch}, artist:${artistMatch}`);
          return nameMatch && artistMatch;
        });

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
            await Request.findByIdAndUpdate(request._id, { 
              genreCheckPassed: true,
              detectedTags: allGenres,
              metadata: { 
                source: "database",
                matchedGenres: allGenres.filter(g => 
                  venue.preferredGenres.map(vg => vg.toUpperCase()).includes(g.toUpperCase())
                )
              }
            });
          } else {
            console.log(`❌ Genre mismatch - Database entry`);
            console.log(`   Song genres: ${allGenres.join(", ")}`);
            console.log(`   Venue genres: ${venue.preferredGenres.join(", ")}`);
            
            await Request.findByIdAndUpdate(request._id, { 
              status: "rejected",
              rejectionReason: "Genre mismatch",
              genreCheckPassed: false,
              detectedTags: allGenres,
              metadata: { source: "database" }
            });

            try {
              const populatedRequest = await Request.findById(request._id).populate("userId");
              if (populatedRequest && populatedRequest.userId && populatedRequest.userId.email) {
                await sendGenreRejectionEmail(
                  populatedRequest,
                  venue,
                  "Song genre doesn't match your venue's preferred genres",
                  allGenres
                );
              }
            } catch (emailErr) {
              console.error(`⚠️  Failed to send rejection email:`, emailErr.message);
            }

            return res.status(400).json({ 
              error: "Genre mismatch",
              message: "Song genre doesn't match venue's preferred genres",
              songGenres: allGenres,
              venueGenres: venue.preferredGenres,
              venueCanAccept: venue.preferredGenres,
              requestId: request._id
            });
          }
        } 
        // STEP 4: Fall back to Last.fm if not in database
        else {
          console.log(`🔗 Song not in database - Checking Last.fm...`);
          try {
            const genreValidation = await validateSongGenre(songName, artistName_, venue.preferredGenres);

            // STEP 5: No tags on Last.fm - auto pass for safety
            if (genreValidation.tags.length === 0) {
              console.log(`⏭️  No Last.fm tags found - Auto-pass (STEP 5)`);
              await Request.findByIdAndUpdate(request._id, { 
                genreCheckPassed: true,
                detectedTags: [],
                metadata: { 
                  source: "nodata",
                  note: "No genre data available - auto-approved"
                }
              });
            } else if (genreValidation.isValid) {
              // Last.fm tags match
              console.log(`✅ Genre match - Last.fm tags match venue preferences`);
              await Request.findByIdAndUpdate(request._id, { 
                genreCheckPassed: true,
                detectedTags: genreValidation.tags,
                metadata: { 
                  source: "lastfm",
                  matchedTag: genreValidation.matchedTag
                }
              });
            } else {
              // Genre validation failed with tags present
              console.log(`❌ Genre mismatch - Last.fm tags`);
              console.log(`   Song tags: ${genreValidation.tags.join(", ")}`);
              console.log(`   Venue genres: ${venue.preferredGenres.join(", ")}`);
              
              await Request.findByIdAndUpdate(request._id, { 
                status: "rejected",
                rejectionReason: genreValidation.reason,
                genreCheckPassed: false,
                detectedTags: genreValidation.tags,
                metadata: { source: "lastfm" }
              });

              try {
                const populatedRequest = await Request.findById(request._id).populate("userId");
                if (populatedRequest && populatedRequest.userId && populatedRequest.userId.email) {
                  await sendGenreRejectionEmail(
                    populatedRequest,
                    venue,
                    genreValidation.reason,
                    genreValidation.tags
                  );
                }
              } catch (emailErr) {
                console.error(`⚠️  Failed to send rejection email:`, emailErr.message);
              }

              return res.status(400).json({ 
                error: "Genre mismatch",
                message: genreValidation.reason,
                songTags: genreValidation.tags,
                venueGenres: venue.preferredGenres,
                venueCanAccept: venue.preferredGenres,
                requestId: request._id
              });
            }
          } catch (lastfmErr) {
            console.error(`⚠️  Last.fm validation error:`, lastfmErr.message);
            // Auto-pass on error
            console.log(`⏭️  Last.fm error - Auto-pass for safety`);
            await Request.findByIdAndUpdate(request._id, { 
              genreCheckPassed: true,
              metadata: { 
                source: "error",
                note: "Last.fm lookup failed - auto-approved"
              }
            });
          }
        }

        console.log(`✅ Genre validation complete - Request approved to continue`);
      } else {
        console.log(`⏭️  No preferred genres set - Skipping genre check`);
      }
      } else if (livePlaylistActive) {
        console.log(`\n✅ LIVE PLAYLIST ON - No genre filtering configured`);
      } else {
        console.log(`\n⏭️  GENRE CHECK SKIPPED - DJ mode pending approval`);
      }
    } catch (genreErr) {
      console.error(`❌ GENRE VALIDATION ERROR: ${genreErr.message}`);
      
      // If genre validation fails, still allow the request (fallback)
      console.warn(`⚠️  Genre validation failed, allowing request to proceed as fallback`);
      
      await Request.findByIdAndUpdate(request._id, { 
        genreCheckPassed: true,
        metadata: { 
          genreCheckWarning: genreErr.message
        }
      });
    }

    // ===== LIFO STACK PROCESSING FOR LIVE PLAYLIST =====
    // If Live Playlist is ON, add directly to LIFO stack for processing
    // If Live Playlist is OFF, request is already set to pending_dj_approval (handled earlier)
    if (livePlaylistActive) {
      try {
        console.log(`\n🔄 PREPARING FOR LIFO STACK - Live Playlist is active`);
        
        // ===== CREATE STRIPE CHECKOUT SESSION FIRST =====
        let checkoutSessionId = null;
        let checkoutUrl = null;
        
        try {
          console.log(`💳 Creating Stripe Checkout Session for LIVE mode...`);
          const checkoutData = await createCheckoutSession(request, venueId);
          checkoutSessionId = checkoutData.checkoutSessionId;
          checkoutUrl = checkoutData.url;
          
          // Update request with checkout session BEFORE pushing to stack
          await Request.findByIdAndUpdate(request._id, {
            checkoutSessionId: checkoutSessionId,
            paymentStatus: "pending"
          });
          
          console.log(`✅ Checkout session created: ${checkoutSessionId}`);
          
          // Note: Payment record is already created by createCheckoutSession()
          // No need to create it again here
        } catch (checkoutErr) {
          console.warn("⚠️ Checkout session creation failed:", checkoutErr.message);
          // Continue anyway - stack will be added but customer won't have checkout URL
          checkoutSessionId = null;
        }
        
        // ===== NOW PUSH TO LIFO STACK WITH CHECKOUT SESSION ID =====
        console.log(`\n🔄 ADDING TO LIFO STACK - Live Playlist is active`);
        
        // Prepare data for stack WITH checkoutSessionId now populated
        const stackData = {
          _id: request._id.toString(),
          title: request.title || request.songTitle,
          artist: request.artist || request.artistName,
          price: request.price,
          userId: request.userId,
          userName: request.userName,
          createdAt: request.createdAt,
          requestedAt: new Date(),
          checkoutSessionId: checkoutSessionId,  // NOW HAS REAL VALUE!
          paymentStatus: "pending"
        };
        
        // Push to LIFO stack
        const stackResult = await pushToStack(request.venueId.toString(), stackData);
        
        if (!stackResult.success) {
          throw new Error(stackResult.error || "Failed to add to stack");
        }
        
        // Get updated stack size
        const sizeResult = await getStackSize(request.venueId.toString());
        const stackSize = sizeResult.data || 0;
        
        console.log(`✅ ADDED TO LIFO STACK - Request ID: ${request._id}, Stack size: ${stackSize}`);
        console.log(`🎵 Song: "${songName}" by "${artistName_}" - Position: #1 (Most recent - will be processed first)\n`);

        res.status(201).json({ 
          requestId: request._id, 
          status: request.status,
          message: "✅ Song request added to automix stack (LIFO)",
          stackSize: stackSize,
          stackAdded: true,
          checkoutUrl: checkoutUrl,
          checkoutSessionId: checkoutSessionId
        });
      } catch (stackErr) {
        console.error("Stack error:", stackErr.message);
        
        // Update request status to failed if stack operation fails
        await Request.findByIdAndUpdate(request._id, { 
          status: "rejected",
          rejectionReason: "Failed to add to stack"
        });

        res.status(500).json({ 
          error: "Failed to add request to stack",
          message: stackErr.message,
          requestId: request._id
        });
      }
    } else {
      // Live Playlist OFF - Request is pending DJ approval already
      console.log(`\n📍 ROUTED TO DJ PANEL - Request is pending DJ approval`);
      res.status(201).json({
        requestId: request._id,
        status: request.status,
        message: "Song request sent to DJ panel for approval",
        djPending: true
      });
    }
  } catch (err) {
    console.error("Create request error:", err.message);
    res.status(500).json({ error: "Failed to create request", details: err.message });
  }
}

/* -------------------- GET REQUEST BY ID -------------------- */
async function getRequestById(req, res) {
  try {
    const request = await Request.findById(req.params.id).populate("userId");
    if (!request) return res.status(404).json({ error: "Not found" });

    res.json(request);
  } catch (err) {
    console.error("Get request error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* -------------------- VENUE APPROVE REQUEST -------------------- */
async function approveRequest(req, res) {
  try {
    const { id } = req.params;
    const { venueId } = req.body;

    const request = await Request.findById(id).populate("venueId");
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Verify venue ownership
    if (venueId && request.venueId && request.venueId._id.toString() !== venueId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Update status
    request.status = "authorized";
    request.approvedAt = new Date();
    await request.save();

    // ===== LIVE MODE: Check payment before processing =====
    if (request.checkoutSessionId) {
      // This is a LIVE mode request - require payment confirmation
      if (request.paymentStatus !== "captured" && request.paymentStatus !== "paid") {
        console.log(`⏳ LIVE mode: Cannot approve until payment is confirmed`);
        return res.status(400).json({ 
          error: "Payment not yet confirmed. Cannot process request.",
          paymentStatus: request.paymentStatus
        });
      }
      console.log(`✅ LIVE mode: Payment confirmed (${request.paymentStatus})`);
    }

    // Immediately add to MixMind playlist via beatsource
    try {
      console.log(`🎵 Approved! Adding "${request.songTitle || request.title}" to MixMind playlist...`);
      
      const runBeatsourceFlow = require("../../worker/beatsourceClient");
      const result = await runBeatsourceFlow(request);
      
      // Update as completed
      request.status = "completed";
      request.beatSourceTrackId = result?.trackId || null;
      request.resultUrl = result?.url || null;
      await request.save();
      
      console.log(`✅ Song added to playlist!`);
      
      res.json({
        message: "Request approved and added to MixMind playlist!",
        request,
        added: true
      });
    } catch (beatsourceErr) {
      console.error(`❌ Failed to add to playlist:`, beatsourceErr.message);
      
      // Still mark as authorized even if beatsource fails
      // Can retry later via admin panel
      res.json({
        message: "Request approved but playlist add failed. Will retry via queue.",
        request,
        warning: beatsourceErr.message,
        added: false
      });
    }
  } catch (err) {
    console.error("Approve request error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* -------------------- VENUE REJECT REQUEST -------------------- */
async function rejectRequest(req, res) {
  try {
    const { id } = req.params;
    const { venueId, reason } = req.body;

    const request = await Request.findById(id);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Verify venue ownership
    if (venueId && request.venueId && request.venueId.toString() !== venueId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Update status
    request.status = "rejected";
    request.rejectionReason = reason || "Rejected by venue";
    request.rejectedAt = new Date();
    await request.save();

    res.json({
      message: "Request rejected",
      request
    });
  } catch (err) {
    console.error("Reject request error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* -------------------- GET VENUE REQUESTS (PUBLIC) -------------------- */
async function getVenuePublicRequests(req, res) {
  try {
    const { venueId } = req.params;

    const requests = await Request.find({
      venueId: venueId,
      status: "completed"
    })
      .sort({ approvedAt: -1 })
      .limit(50);

    res.json(requests);
  } catch (err) {
    console.error("Get public venue requests error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* -------------------- LIVE PLAYLIST ROTATION (3-STEP FLOW) -------------------- */
/**
 * Execute live playlist rotation every 2 minutes
 * Cycles through 500 songs (indices 0-499) in the Mixmind folder
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.baseUrl - Base URL for execute API (default: http://127.0.0.1:80)
 * @param {number} options.totalSongs - Total number of songs to cycle through (default: 500)
 * @param {number} options.intervalMs - Interval between rotations in ms (default: 120000 = 2 minutes)
 * @returns {Promise<void>} - Runs continuously until stopped
 */
async function executeLivePlaylistRotation(options = {}) {
  const baseUrl = options.baseUrl || process.env.EXECUTE_API_URL || "http://127.0.0.1:80";
  const totalSongs = options.totalSongs || 500;
  const intervalMs = options.intervalMs || 120000; // 2 minutes by default
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🎵 LIVE PLAYLIST ROTATION STARTED`);
  console.log(`${'='.repeat(70)}`);
  console.log(`📂 Total Songs: ${totalSongs}`);
  console.log(`⏱️  Rotation Interval: ${intervalMs / 1000}s (${intervalMs / 60000} minutes)`);
  console.log(`${'='.repeat(70)}\n`);
  
  let currentIndex = 0;
  let rotationCount = 0;
  
  while (!SHOULD_STOP) {
    rotationCount++;
    
    try {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`🎵 ROTATION #${rotationCount} | Index: ${currentIndex}/${totalSongs - 1}`);
      console.log(`${'─'.repeat(60)}`);
      
      // Step 1: Go to Mixmind folder
      console.log(`📍 Step 1: Going to Mixmind folder...`);
      const goToFolderScript = `browser_gotofolder "beatport:\\Mixmind"`;
      const goToFolderUrl = `${baseUrl}/execute?script=${encodeURIComponent(goToFolderScript)}`;
      
      try {
        const goToFolderResponse = await axios.get(goToFolderUrl, { timeout: 10000 });
        console.log(`✓ Step 1 completed`);
      } catch (err) {
        console.error(`✗ Step 1 failed: ${err.message}`);
        throw new Error(`Go to folder failed: ${err.message}`);
      }
      
      // Step 2: Scroll to the current index
      console.log(`📍 Step 2: Scrolling to index ${currentIndex}...`);
      const scrollScript = `browser_scroll ${currentIndex}`;
      const scrollUrl = `${baseUrl}/execute?script=${encodeURIComponent(scrollScript)}`;
      
      try {
        const scrollResponse = await axios.get(scrollUrl, { timeout: 10000 });
        console.log(`✓ Step 2 completed`);
      } catch (err) {
        console.error(`✗ Step 2 failed: ${err.message}`);
        throw new Error(`Scroll failed: ${err.message}`);
      }
      
      // Step 3: Add song to playlist
      console.log(`📍 Step 3: Adding song to playlist...`);
      const addScript = `playlist_add`;
      const addUrl = `${baseUrl}/execute?script=${encodeURIComponent(addScript)}`;
      
      try {
        const addResponse = await axios.get(addUrl, { timeout: 10000 });
        console.log(`✓ Step 3 completed`);
      } catch (err) {
        console.error(`✗ Step 3 failed: ${err.message}`);
        throw new Error(`Add to playlist failed: ${err.message}`);
      }
      
      console.log(`✅ Rotation #${rotationCount} completed successfully`);
      
      // Increment index and cycle back to 0 when reaching totalSongs
      currentIndex = (currentIndex + 1) % totalSongs;
      
      // Wait for interval before next rotation
      console.log(`⏳ Waiting ${intervalMs / 1000}s before next rotation...`);
      await waitWithInterrupt(intervalMs);
      
    } catch (err) {
      console.error(`\n❌ Rotation #${rotationCount} failed: ${err.message}`);
      console.log(`⏳ Waiting 30s before retrying...`);
      
      // On error, still increment index so we don't get stuck
      currentIndex = (currentIndex + 1) % totalSongs;
      
      // Wait before retry
      await waitWithInterrupt(30000);
    }
  }
  
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🛑 LIVE PLAYLIST ROTATION STOPPED`);
  console.log(`${'='.repeat(70)}\n`);
}

/* -------------------- GET QUEUE STATUS -------------------- */
async function getQueueStatus(req, res) {
  try {
    const queueCounts = await songRequestQueue.getCountsPerStatus();
    const allJobs = await songRequestQueue.getJobCounts();
    const activeJobs = await songRequestQueue.getActiveCount();
    const waitingJobs = await songRequestQueue.getWaitingCount();
    const failedJobs = await songRequestQueue.getFailedCount();
    const completedJobs = await songRequestQueue.getCompletedCount();

    res.json({
      status: "ok",
      queue: {
        active: activeJobs,
        waiting: waitingJobs,
        failed: failedJobs,
        completed: completedJobs,
        total: allJobs || {}
      },
      message: `Queue status: ${activeJobs} processing, ${waitingJobs} waiting, ${failedJobs} failed`
    });
  } catch (err) {
    console.error("Get queue status error:", err);
    res.status(500).json({ error: "Failed to get queue status" });
  }
}

/* -------------------- GET USER REQUESTS BY EMAIL -------------------- */
async function getUserRequests(req, res) {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({ error: "Email parameter required" });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // Return empty array if user doesn't exist
      return res.json([]);
    }

    // Find all requests for this user
    const requests = await Request.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json(requests);
  } catch (err) {
    console.error("Get user requests error:", err);
    res.status(500).json({ error: "Failed to get user requests" });
  }
}

module.exports = { 
  createRequest, 
  getRequestById,
  approveRequest,
  rejectRequest,
  getVenuePublicRequests,
  executeLivePlaylistRotation,
  getQueueStatus,
  getUserRequests
};
