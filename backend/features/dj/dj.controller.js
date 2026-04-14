const Venue = require("../../models/Venue");
const Request = require("../../models/Request");
const Payment = require("../../models/Payment");
const DJ = require("../../models/DJ");
const DJVenueAccess = require("../../models/DJVenueAccess");
const songRequestQueue = require("../../queues/songRequestQueue");
const { sendDJAcceptanceEmail, sendDJRejectionEmail } = require("../../services/emailService");
const { pushToStack, removeFromStack, getStackSize } = require("../../services/stackService");
const { capturePayment, cancelPayment, createSplitTransfers } = require("../../features/payments/stripe/stripe.service");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/* -------------------- INITIALIZE DJ MODE -------------------- */
async function initializeDJMode(req, res) {
  try {
    const { venueId } = req.params;
    const { djPassword } = req.body;

    console.log(`\n🎧 INITIALIZING DJ MODE`);
    console.log(`   Venue ID: ${venueId}`);
    console.log(`   Password provided: ${!!djPassword ? "✅ YES" : "❌ NO"}`);

    if (!djPassword) {
      return res.status(400).json({ error: "DJ password is required" });
    }

    const venue = await Venue.findById(venueId);
    if (!venue) {
      console.log(`   ❌ Venue not found!`);
      return res.status(404).json({ error: "Venue not found" });
    }

    console.log(`   Venue found: ${venue.name}`);

    // Hash DJ password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(djPassword, salt);

    venue.djMode = true;
    venue.djPassword = hashedPassword;
    await venue.save();

    console.log(`   ✅ DJ Mode set to TRUE`);
    console.log(`   ✅ Password hashed and saved`);
    console.log(`   ✅ Venue saved to database\n`);

    res.json({
      message: "DJ mode initialized successfully",
      djMode: venue.djMode
    });
  } catch (err) {
    console.error("❌ Initialize DJ mode error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* -------------------- DJ LOGIN -------------------- */
async function djLogin(req, res) {
  try {
    const { venueId, djPassword } = req.body;

    if (!venueId || !djPassword) {
      return res.status(400).json({ error: "Venue ID and password are required" });
    }

    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ error: "Venue not found" });
    }

    if (!venue.djMode) {
      return res.status(400).json({ error: "DJ mode is not enabled for this venue" });
    }

    // Verify DJ password
    const isMatch = await bcrypt.compare(djPassword, venue.djPassword);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid DJ password" });
    }

    // Generate DJ token (JWT)
    const djToken = jwt.sign(
      { venueId: venue._id, venueName: venue.name, role: "dj" },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    res.json({
      djToken,
      venueId: venue._id,
      venueName: venue.name,
      message: "DJ login successful"
    });
  } catch (err) {
    console.error("DJ login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* -------------------- TOGGLE DJ MODE -------------------- */
async function toggleDJMode(req, res) {
  try {
    const { venueId } = req.params;
    const { djPassword } = req.body;

    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ error: "Venue not found" });
    }

    // If disabling DJ mode, don't require password
    // If enabling, require password setup
    if (!venue.djMode) {
      if (!djPassword) {
        return res.status(400).json({ error: "DJ password required to enable DJ mode" });
      }
      const salt = await bcrypt.genSalt(10);
      venue.djPassword = await bcrypt.hash(djPassword, salt);
    }

    venue.djMode = !venue.djMode;
    await venue.save();

    res.json({
      djMode: venue.djMode,
      message: `DJ mode ${venue.djMode ? "enabled" : "disabled"} successfully`
    });
  } catch (err) {
    console.error("Toggle DJ mode error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* -------------------- GET PENDING REQUESTS FOR DJ -------------------- */
async function getPendingRequests(req, res) {
  try {
    const { venueId } = req.params;
    const { venueId: tokenVenueId, djId } = req.dj; // From DJ token verification

    console.log(`\n🔍 [DJ Panel] Fetching pending requests for venue: ${venueId}`);

    // Handle both venue-based DJ tokens and DJ user account tokens
    if (tokenVenueId) {
      // Venue-based DJ token (old system)
      console.log(`   Auth Type: Venue-based DJ token`);
      
      // Verify DJ is accessing their own venue (convert both to strings for comparison)
      if (tokenVenueId.toString() !== venueId.toString()) {
        console.log(`❌ Token mismatch: token=${tokenVenueId.toString()} vs param=${venueId.toString()}`);
        return res.status(403).json({ error: "Unauthorized - DJ token mismatch" });
      }
    } else if (djId) {
      // DJ user account token (new system) - verify they have approval for this venue
      console.log(`   Auth Type: DJ user account token (DJ ID: ${djId})`);
      
      // Check if this DJ user has been approved for this venue
      const accessRequest = await DJVenueAccess.findOne({
        djId: djId,
        venueId: venueId,
        status: "approved",
        currentlyActive: true
      });

      if (!accessRequest) {
        console.log(`❌ DJ user not approved for this venue`);
        return res.status(403).json({ 
          error: "You don't have active access to this venue. Your approval may have been revoked." 
        });
      }
      
      console.log(`   ✅ DJ user approved for venue`);
    } else {
      console.log(`❌ No venueId or djId found in token`);
      return res.status(401).json({ error: "Invalid DJ token" });
    }

    // First check all requests for this venue
    const allRequests = await Request.find({ venueId: venueId }).select("status venueId");
    console.log(`📊 Total requests for venue: ${allRequests.length}`);
    console.log(`   Status breakdown: ${allRequests.map(r => r.status).join(", ") || "NO REQUESTS"}`);

    // Fetch ONLY pending requests (not yet approved or rejected by DJ)
    // Check: status is pending_dj_approval AND both djApprovedAt and djRejectedAt are null
    const requests = await Request.find({
      venueId: venueId,
      status: "pending_dj_approval",
      djApprovedAt: { $eq: null },
      djRejectedAt: { $eq: null }
    })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${requests.length} pending DJ approval requests`);
    
    if (requests.length > 0) {
      requests.forEach(r => {
        console.log(`   - ${r.title} by ${r.artist} (ID: ${r._id})`);
      });
    }

    res.json(requests);
  } catch (err) {
    console.error("Get pending requests error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* -------------------- DJ ACCEPT REQUEST --------------------*/
async function djAcceptRequest(req, res) {
  try {
    const { requestId } = req.params;
    const { venueId: tokenVenueId, djId } = req.dj; // From DJ token verification

    const request = await Request.findById(requestId).populate("userId");
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Handle both venue-based DJ tokens and DJ user account tokens
    if (tokenVenueId) {
      // Venue-based DJ token
      if (request.venueId.toString() !== tokenVenueId.toString()) {
        return res.status(403).json({ error: "Unauthorized - this request is for a different venue" });
      }
    } else if (djId) {
      // DJ user account token - verify they have approval for this venue
      const accessRequest = await DJVenueAccess.findOne({
        djId: djId,
        venueId: request.venueId,
        status: "approved",
        currentlyActive: true
      });

      if (!accessRequest) {
        return res.status(403).json({ error: "You don't have access to this venue" });
      }
    } else {
      return res.status(401).json({ error: "Invalid DJ token" });
    }

    // Get venue to check if Live Playlist is active
    const venue = await Venue.findById(request.venueId);
    if (!venue) {
      return res.status(404).json({ error: "Venue not found" });
    }

    console.log(`\n🎵 DJ ACCEPTING REQUEST`);
    console.log(`   Request ID: ${request._id}`);
    console.log(`   Live Playlist Active: ${venue.livePlaylistActive}`);

    // Update status to approved and record DJ approval
    request.status = "queued";
    request.djApprovedAt = new Date();
    
    // ===== HANDLE PAYMENT BASED ON PAYMENT INTENT =====
    // DJ mode uses PaymentIntent for manual capture (authorize now, capture later)
    // When DJ approves, we capture the payment
    if (request.paymentIntentId && request.paymentStatus === "authorized") {
      try {
        console.log(`💳 Capturing payment for PaymentIntent: ${request.paymentIntentId}...`);
        
        // Capture the PaymentIntent (charge the customer)
        const captureResult = await capturePayment(request.paymentIntentId);
        
        if (captureResult.success) {
          console.log(`✅ Payment captured: ${request.paymentIntentId}`);
          request.paymentStatus = "captured";
          request.paidAt = new Date();
          request.paidAmount = request.price;
          
          // Perform split transfers (DJ mode: DJ 44.44%, Venue 33.33%)
          try {
            const amountCents = Math.round(request.price * 100);
            await createSplitTransfers(request.paymentIntentId, amountCents, request.venueId, "dj");
            console.log(`✅ Split transfers initiated for DJ mode`);
          } catch (transferErr) {
            console.warn("⚠️ Split transfer failed:", transferErr.message);
          }
        } else {
          console.warn("⚠️ Capture failed but continuing...");
        }
      } catch (captureErr) {
        console.error("❌ Payment capture failed:", captureErr.message);
        request.paymentStatus = "capture_failed";
      }
    }
    
    // ===== HANDLE CHECKOUT SESSION CAPTURE =====
    // DJ mode with checkout sessions (with manual capture via payment_intent_data)
    else if (request.checkoutSessionId && request.paymentStatus === "authorized") {
      try {
        console.log(`💳 Capturing payment for checkout session: ${request.checkoutSessionId}...`);
        
        // Need to retrieve the PaymentIntent from the session and capture it
        const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
        const session = await stripe.checkout.sessions.retrieve(request.checkoutSessionId);
        
        if (session.payment_intent) {
          const captureResult = await capturePayment(session.payment_intent, request.checkoutSessionId);
          if (captureResult.success) {
            console.log(`✅ Payment captured: ${session.payment_intent}`);
            request.paymentStatus = "captured";
            request.paidAt = new Date();
            request.paidAmount = request.price;
            
            // Perform split transfers
            try {
              const amountCents = Math.round(request.price * 100);
              await createSplitTransfers(request.checkoutSessionId, amountCents, request.venueId, "dj");
              console.log(`✅ Split transfers initiated for DJ mode`);
            } catch (transferErr) {
              console.warn("⚠️ Split transfer failed:", transferErr.message);
            }
          }
        }
      } catch (captureErr) {
        console.error("❌ Payment capture failed:", captureErr.message);
        request.paymentStatus = "capture_failed";
      }
    }
    
    await request.save();

    // Send acceptance email to user
    const emailResult = await sendDJAcceptanceEmail(request, venue);
    
    if (emailResult.success) {
      console.log(`✅ Acceptance notification sent to ${request.userId.email}`);
    } else {
      console.warn(`⚠️  Email failed but request approved:`, emailResult.error);
    }

    // ===== ONLY ADD TO STACK IF LIVE PLAYLIST IS ACTIVE =====
    if (venue.livePlaylistActive) {
      console.log(`   → Live Playlist ON: Adding to LIFO stack`);
      
      try {
        // Prepare request data for stack
        const stackData = {
          _id: request._id.toString(),
          title: request.title || request.songTitle,
          artist: request.artist || request.artistName,
          price: request.price,
          userId: request.userId._id,
          userName: request.userName,
          createdAt: request.createdAt,
          djApprovedAt: new Date(),
          checkoutSessionId: request.checkoutSessionId || null,
          paymentStatus: request.paymentStatus || null
        };

        // Push to stack (LIFO)
        const stackResult = await pushToStack(request.venueId.toString(), stackData);

        if (!stackResult.success) {
          console.warn(`⚠️  Failed to add to stack:`, stackResult.error);
        }

        // Get updated stack size
        const sizeResult = await getStackSize(request.venueId.toString());
        const stackSize = sizeResult.data || 0;

        console.log(`✅ DJ APPROVED - Added to LIFO stack - Stack size: ${stackSize}, Request ID: ${request._id}\n`);

        res.json({
          message: "Request approved and added to automix stack (LIFO)",
          requestId: request._id,
          status: request.status,
          emailSent: emailResult.success,
          livePlaylistQueued: true,
          stackSize: stackSize,
          stackAdded: stackResult.success
        });
      } catch (stackErr) {
        console.error("Error adding to stack:", stackErr);
        res.status(500).json({ 
          error: "Failed to add to stack",
          requestId: request._id 
        });
      }
    } else {
      console.log(`   → Live Playlist OFF: NOT adding to stack (DJ mode only)\n`);
      
      res.json({
        message: "Request approved and status updated in database",
        requestId: request._id,
        status: request.status,
        emailSent: emailResult.success,
        livePlaylistQueued: false,
        note: "Request accepted but NOT added to stack (Live Playlist is OFF)"
      });
    }
  } catch (err) {
    console.error("DJ accept request error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* -------------------- DJ REJECT REQUEST -------------------- */
async function djRejectRequest(req, res) {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    const { venueId: tokenVenueId, djId } = req.dj; // From DJ token verification

    const request = await Request.findById(requestId).populate("userId");
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Handle both venue-based DJ tokens and DJ user account tokens
    if (tokenVenueId) {
      // Venue-based DJ token
      if (request.venueId.toString() !== tokenVenueId.toString()) {
        return res.status(403).json({ error: "Unauthorized - this request is for a different venue" });
      }
    } else if (djId) {
      // DJ user account token - verify they have approval for this venue
      const accessRequest = await DJVenueAccess.findOne({
        djId: djId,
        venueId: request.venueId,
        status: "approved",
        currentlyActive: true
      });

      if (!accessRequest) {
        return res.status(403).json({ error: "You don't have access to this venue" });
      }
    } else {
      return res.status(401).json({ error: "Invalid DJ token" });
    }

    // Update status and record DJ rejection
    request.status = "rejected";
    request.djRejectedAt = new Date();
    request.djRejectionReason = reason || "Rejected by DJ";
    
    // ===== CANCEL PAYMENT IF AUTHORIZED OR CAPTURED =====
    if (request.paymentIntentId && (request.paymentStatus === "authorized" || request.paymentStatus === "captured")) {
      try {
        console.log(`💳 Cancelling PaymentIntent: ${request.paymentIntentId}...`);
        const cancelResult = await cancelPayment(request.paymentIntentId);
        
        if (cancelResult.success) {
          request.paymentStatus = "cancelled";
          console.log(`✅ Payment cancelled for rejected request ${request._id}`);
          
          // Payment record already updated by cancelPayment()
          // No need for duplicate update here
        }
      } catch (cancelErr) {
        console.error("❌ Cancel failed:", cancelErr.message);
        request.paymentStatus = "cancel_failed";
      }
    }
    
    // ===== CANCEL CHECKOUT SESSION (REFUND) =====
    else if (request.checkoutSessionId && request.paymentStatus === "authorized") {
      try {
        console.log(`💳 Refunding checkout session: ${request.checkoutSessionId}...`);
        
        // Need to retrieve the PaymentIntent from the session and cancel it
        const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
        const session = await stripe.checkout.sessions.retrieve(request.checkoutSessionId);
        
        if (session.payment_intent) {
          const cancelResult = await cancelPayment(session.payment_intent, request.checkoutSessionId);
          if (cancelResult.success) {
            request.paymentStatus = "cancelled";
            console.log(`✅ Checkout payment cancelled for rejected request ${request._id}`);
          }
        }
      } catch (refundErr) {
        console.error("❌ Refund failed:", refundErr.message);
        request.paymentStatus = "refund_failed";
      }
    }
    
    await request.save();

    console.log(`❌ DJ REJECTED - Request ID: ${request._id}, Reason: ${request.djRejectionReason}`);

    // If request was in stack (Live Playlist active), remove it
    const venue = await Venue.findById(request.venueId);
    if (venue && venue.livePlaylistActive) {
      console.log(`   → Removing from LIFO stack`);
      const removeResult = await removeFromStack(request.venueId.toString(), request._id.toString());
      
      if (removeResult.success) {
        console.log(`✅ Removed from stack`);
      } else {
        console.warn(`⚠️  Failed to remove from stack:`, removeResult.error);
      }
    }

    // Send rejection email to user
    const emailResult = await sendDJRejectionEmail(request, venue, request.djRejectionReason);
    
    if (emailResult.success) {
      console.log(`✅ Rejection notification sent to ${request.userId.email}`);
    } else {
      console.warn(`⚠️  Email failed but request rejected:`, emailResult.error);
    }

    res.json({
      message: "Request rejected",
      requestId: request._id,
      status: request.status,
      rejectionReason: request.djRejectionReason,
      emailSent: emailResult.success
    });
  } catch (err) {
    console.error("DJ reject request error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* -------------------- GET DJ STATS -------------------- */
async function getDJStats(req, res) {
  try {
    const { venueId } = req.params;
    const { venueId: tokenVenueId, djId } = req.dj; // From DJ token verification

    // Handle both venue-based DJ tokens and DJ user account tokens
    if (tokenVenueId) {
      // Venue-based DJ token
      if (tokenVenueId !== venueId) {
        return res.status(403).json({ error: "Unauthorized - DJ token mismatch" });
      }
    } else if (djId) {
      // DJ user account token - verify they have approval for this venue
      const accessRequest = await DJVenueAccess.findOne({
        djId: djId,
        venueId: venueId,
        status: "approved",
        currentlyActive: true
      });

      if (!accessRequest) {
        return res.status(403).json({ error: "You don't have access to this venue" });
      }
    } else {
      return res.status(401).json({ error: "Invalid DJ token" });
    }

    const requests = await Request.find({ venueId });

    const stats = {
      total: requests.length,
      pending: requests.filter(r => r.status === "pending_dj_approval").length,
      accepted: requests.filter(r => r.status === "completed").length,
      rejected: requests.filter(r => r.status === "rejected").length,
      totalRevenue: requests.reduce((sum, r) => sum + (r.price || 0), 0)
    };

    res.json(stats);
  } catch (err) {
    console.error("Get DJ stats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* ========== NEW DJ USER AUTHENTICATION SYSTEM ========== */

/* -------------------- DJ SIGNUP -------------------- */
async function djSignup(req, res) {
  try {
    const { email, password, name, genres, yearsOfExperience, bio } = req.body;

    console.log(`\n🎧 DJ SIGNUP REQUEST`);
    console.log(`   Email: ${email}`);
    console.log(`   Name: ${name}`);

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password, and name are required" });
    }

    // Check if DJ already exists
    const existingDJ = await DJ.findOne({ email: email.toLowerCase() });
    if (existingDJ) {
      console.log(`   ❌ DJ already exists with this email`);
      return res.status(400).json({ error: "DJ with this email already exists" });
    }

    // Create new DJ
    const newDJ = new DJ({
      email: email.toLowerCase(),
      password, // Will be hashed by pre-save hook
      name,
      genres: genres || [],
      yearsOfExperience: yearsOfExperience || 0,
      bio: bio || "",
      isVerified: false
    });

    await newDJ.save();

    console.log(`   ✅ DJ created successfully - ID: ${newDJ._id}`);

    // Generate JWT token for auto-login after signup
    const djToken = jwt.sign(
      { djId: newDJ._id, email: newDJ.email, role: "dj" },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    console.log(`   ✅ Token generated`);
    console.log(`   ✅ DJ signup complete\n`);

    res.status(201).json({
      message: "DJ account created successfully",
      djToken,
      djId: newDJ._id,
      email: newDJ.email,
      name: newDJ.name
    });
  } catch (err) {
    console.error("DJ signup error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* -------------------- DJ USER LOGIN -------------------- */
async function djUserLogin(req, res) {
  try {
    const { email, password } = req.body;

    console.log(`\n🎧 DJ USER LOGIN`);
    console.log(`   Email: ${email}`);

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find DJ by email
    const dj = await DJ.findOne({ email: email.toLowerCase() });
    if (!dj) {
      console.log(`   ❌ DJ not found`);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Verify password
    const isMatch = await dj.comparePassword(password);
    if (!isMatch) {
      console.log(`   ❌ Password incorrect`);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    console.log(`   ✅ Password verified`);

    // Generate JWT token
    const djToken = jwt.sign(
      { djId: dj._id, email: dj.email, role: "dj" },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    console.log(`   ✅ Token generated`);
    console.log(`   ✅ DJ login successful\n`);

    res.json({
      djToken,
      djId: dj._id,
      email: dj.email,
      name: dj.name,
      message: "DJ login successful"
    });
  } catch (err) {
    console.error("DJ user login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* -------------------- GET VENUES WITH DJ MODE -------------------- */
async function getVenuesWithDJMode(req, res) {
  try {
    console.log(`\n📍 FETCHING VENUES WITH DJ MODE`);

    // Get all venues with DJ mode enabled
    const venues = await Venue.find({ djMode: true, isActive: true })
      .select("_id name city address description livePlaylistActive")
      .sort({ name: 1 });

    console.log(`   ✅ Found ${venues.length} venues with DJ mode enabled`);

    res.json({
      count: venues.length,
      venues: venues
    });
  } catch (err) {
    console.error("Get venues with DJ mode error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* -------------------- REQUEST VENUE ACCESS -------------------- */
async function requestVenueAccess(req, res) {
  try {
    const { venueId, requestMessage } = req.body;
    const { djId, isVenueBased } = req.dj; // From DJ token verification

    console.log(`\n🎧 DJ REQUESTING VENUE ACCESS`);
    console.log(`   DJ ID: ${djId}`);
    console.log(`   Venue ID: ${venueId}`);
    console.log(`   Auth Type: ${isVenueBased ? "Venue-based" : "DJ User Account"}`);

    // Venue-based DJs should not use the access request system
    if (isVenueBased) {
      console.log(`   ⚠️  Venue-based DJ attempted to use DJ access request system`);
      return res.status(403).json({ 
        error: "This feature requires a DJ user account. Please create a DJ account to request access to multiple venues.",
        requiresDJAccount: true
      });
    }

    // Validate venue exists
    const venue = await Venue.findById(venueId);
    if (!venue) {
      console.log(`   ❌ Venue not found`);
      return res.status(404).json({ error: "Venue not found" });
    }

    // Check if venue has DJ mode enabled
    if (!venue.djMode) {
      console.log(`   ❌ Venue does not have DJ mode enabled`);
      return res.status(400).json({ error: "This venue does not have DJ mode enabled" });
    }

    // Check if DJ already has access or pending request
    const existingAccess = await DJVenueAccess.findOne({
      djId: djId,
      venueId: venueId
    });

    if (existingAccess) {
      if (existingAccess.status === "approved") {
        console.log(`   ⚠️  DJ already has approved access`);
        return res.status(400).json({ error: "You already have access to this venue" });
      } else if (existingAccess.status === "pending") {
        console.log(`   ⚠️  DJ already has pending request`);
        return res.status(400).json({ error: "You already have a pending request for this venue" });
      }
    }

    // Create access request
    const accessRequest = new DJVenueAccess({
      djId: djId,
      venueId: venueId,
      requestMessage: requestMessage || "",
      status: "pending",
      requestedAt: new Date()
    });

    await accessRequest.save();

    console.log(`   ✅ Access request created - Request ID: ${accessRequest._id}`);
    console.log(`   ✅ Request pending venue approval\n`);

    res.status(201).json({
      message: "Access request submitted successfully",
      accessRequestId: accessRequest._id,
      status: "pending",
      venueName: venue.name
    });
  } catch (err) {
    console.error("Request venue access error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* -------------------- GET DJ ACCESS STATUS -------------------- */
async function getDJAccessStatus(req, res) {
  try {
    const { djId } = req.dj; // From DJ token verification

    console.log(`\n🎧 FETCHING DJ ACCESS STATUS`);
    console.log(`   DJ ID: ${djId}`);

    // Get all access requests for this DJ
    const accessRequests = await DJVenueAccess.find({ djId: djId })
      .populate("venueId", "_id name city address")
      .sort({ requestedAt: -1 });

    console.log(`   ✅ Found ${accessRequests.length} access records`);

    // Organize by status
    const organized = {
      approved: accessRequests.filter(r => r.status === "approved"),
      pending: accessRequests.filter(r => r.status === "pending"),
      rejected: accessRequests.filter(r => r.status === "rejected"),
      revoked: accessRequests.filter(r => r.status === "revoked"),
      all: accessRequests
    };

    res.json(organized);
  } catch (err) {
    console.error("Get DJ access status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* -------------------- GET ACTIVE VENUE -------------------- */
async function getActiveVenue(req, res) {
  try {
    const { djId } = req.dj; // From DJ token verification

    console.log(`\n🎧 FETCHING ACTIVE VENUE FOR DJ`);
    console.log(`   DJ ID: ${djId}`);

    // Find active venue access for this DJ
    const activeAccess = await DJVenueAccess.findOne({
      djId: djId,
      status: "approved",
      currentlyActive: true
    }).populate("venueId");

    if (!activeAccess) {
      console.log(`   ℹ️  No currently active venue`);
      return res.json({
        activeVenue: null,
        message: "No active venue"
      });
    }

    console.log(`   ✅ Active venue found: ${activeAccess.venueId.name}`);

    res.json({
      activeVenue: {
        venueId: activeAccess.venueId._id,
        venueName: activeAccess.venueId.name,
        currentlyActive: activeAccess.currentlyActive,
        activeSince: activeAccess.activeSince
      }
    });
  } catch (err) {
    console.error("Get active venue error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* ========== VENUE DJ ACCESS MANAGEMENT ========== */

/* -------------------- GET PENDING DJ ACCESS REQUESTS FOR VENUE -------------------- */
async function getVenueDJAccessRequests(req, res) {
  try {
    const { venueId } = req.params;
    const { id: tokenVenueId } = req.venue; // From venue token verification

    console.log(`\n📍 VENUE: FETCHING DJ ACCESS REQUESTS`);
    console.log(`   Venue ID: ${venueId}`);

    // Verify venue is accessing their own data
    if (tokenVenueId !== venueId) {
      return res.status(403).json({ error: "Unauthorized - venue token mismatch" });
    }

    // Get all access requests for this venue
    const requests = await DJVenueAccess.find({ venueId: venueId })
      .populate("djId", "_id name email bio genres")
      .sort({ requestedAt: -1 });

    console.log(`   ✅ Found ${requests.length} DJ access requests`);

    // Filter out records with null djId (DJ deleted from database)
    const validRequests = requests.filter(r => r.djId !== null);
    
    if (validRequests.length < requests.length) {
      console.log(`   ⚠️  Filtered out ${requests.length - validRequests.length} requests with missing DJ records`);
    }

    // Organize by status
    const organized = {
      pending: validRequests.filter(r => r.status === "pending"),
      approved: validRequests.filter(r => r.status === "approved"),
      rejected: validRequests.filter(r => r.status === "rejected"),
      revoked: validRequests.filter(r => r.status === "revoked"),
      all: validRequests
    };

    res.json(organized);
  } catch (err) {
    console.error("Get venue DJ access requests error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* -------------------- APPROVE DJ ACCESS REQUEST -------------------- */
async function approveVenueDJAccess(req, res) {
  try {
    const { accessRequestId } = req.params;
    const { id: tokenVenueId } = req.venue; // From venue token verification

    console.log(`\n📍 VENUE: APPROVING DJ ACCESS REQUEST`);
    console.log(`   Access Request ID: ${accessRequestId}`);

    const accessRequest = await DJVenueAccess.findById(accessRequestId)
      .populate("djId")
      .populate("venueId");

    if (!accessRequest) {
      console.log(`   ❌ Access request not found`);
      return res.status(404).json({ error: "Access request not found" });
    }

    // Verify venue is managing their own access requests
    if (accessRequest.venueId._id.toString() !== tokenVenueId.toString()) {
      return res.status(403).json({ error: "Unauthorized - this request is for a different venue" });
    }

    if (accessRequest.status !== "pending") {
      return res.status(400).json({ error: `Request is already ${accessRequest.status}` });
    }

    // Update DJ's model - add this venue to approvedVenues
    await DJ.findByIdAndUpdate(
      accessRequest.djId._id,
      { $addToSet: { approvedVenues: accessRequest.venueId._id } }
    );

    // Deactivate any other active DJs for this venue
    await DJVenueAccess.updateMany(
      { venueId: accessRequest.venueId._id, currentlyActive: true },
      { currentlyActive: false }
    );

    // Update access request status and set as active
    accessRequest.status = "approved";
    accessRequest.respondedAt = new Date();
    accessRequest.currentlyActive = true;
    accessRequest.activeSince = new Date();
    await accessRequest.save();

    console.log(`   ✅ DJ access approved - DJ: ${accessRequest.djId.name} - Venue: ${accessRequest.venueId.name}`);
    console.log(`   ✅ DJ added to venue's approved DJs list`);
    console.log(`   ✅ DJ set as currently active\n`);

    res.json({
      message: "DJ access approved successfully",
      accessRequestId: accessRequest._id,
      djName: accessRequest.djId.name,
      venueName: accessRequest.venueId.name,
      status: "approved",
      currentlyActive: true
    });
  } catch (err) {
    console.error("Approve venue DJ access error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* -------------------- REJECT DJ ACCESS REQUEST -------------------- */
async function rejectVenueDJAccess(req, res) {
  try {
    const { accessRequestId } = req.params;
    const { reason } = req.body;
    const { id: tokenVenueId } = req.venue; // From venue token verification

    console.log(`\n📍 VENUE: REJECTING DJ ACCESS REQUEST`);
    console.log(`   Access Request ID: ${accessRequestId}`);

    const accessRequest = await DJVenueAccess.findById(accessRequestId)
      .populate("djId")
      .populate("venueId");

    if (!accessRequest) {
      console.log(`   ❌ Access request not found`);
      return res.status(404).json({ error: "Access request not found" });
    }

    // Verify venue is managing their own access requests
    if (accessRequest.venueId._id.toString() !== tokenVenueId.toString()) {
      return res.status(403).json({ error: "Unauthorized - this request is for a different venue" });
    }

    if (accessRequest.status !== "pending") {
      return res.status(400).json({ error: `Request is already ${accessRequest.status}` });
    }

    // Update access request
    accessRequest.status = "rejected";
    accessRequest.respondedAt = new Date();
    accessRequest.rejectionReason = reason || "Request rejected by venue";
    await accessRequest.save();

    console.log(`   ✅ DJ access rejected - Reason: ${accessRequest.rejectionReason}`);
    console.log(`   ✅ DJ: ${accessRequest.djId.name}\n`);

    res.json({
      message: "DJ access rejected",
      accessRequestId: accessRequest._id,
      djName: accessRequest.djId.name,
      status: "rejected",
      rejectionReason: accessRequest.rejectionReason
    });
  } catch (err) {
    console.error("Reject venue DJ access error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* -------------------- REVOKE DJ ACCESS -------------------- */
async function revokeVenueDJAccess(req, res) {
  try {
    const { accessRequestId } = req.params;
    const { id: tokenVenueId } = req.venue; // From venue token verification

    console.log(`\n📍 VENUE: REVOKING DJ ACCESS`);
    console.log(`   Access Request ID: ${accessRequestId}`);

    const accessRequest = await DJVenueAccess.findById(accessRequestId)
      .populate("djId")
      .populate("venueId");

    if (!accessRequest) {
      console.log(`   ❌ Access request not found`);
      return res.status(404).json({ error: "Access request not found" });
    }

    // Verify venue is managing their own access requests
    if (accessRequest.venueId._id.toString() !== tokenVenueId.toString()) {
      return res.status(403).json({ error: "Unauthorized - this access is for a different venue" });
    }

    if (accessRequest.status !== "approved") {
      return res.status(400).json({ error: "Can only revoke approved access" });
    }

    // Remove from DJ's approvedVenues
    await DJ.findByIdAndUpdate(
      accessRequest.djId._id,
      { $pull: { approvedVenues: accessRequest.venueId._id } }
    );

    // Update access request
    accessRequest.status = "revoked";
    accessRequest.revokedAt = new Date();
    accessRequest.currentlyActive = false;
    await accessRequest.save();

    console.log(`   ✅ DJ access revoked - DJ: ${accessRequest.djId.name}`);
    console.log(`   ✅ DJ removed from venue's approved DJs list\n`);

    res.json({
      message: "DJ access revoked successfully",
      accessRequestId: accessRequest._id,
      djName: accessRequest.djId.name,
      status: "revoked"
    });
  } catch (err) {
    console.error("Revoke venue DJ access error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  // Existing DJ mode routes (venue password system)
  initializeDJMode,
  djLogin,
  toggleDJMode,
  getPendingRequests,
  djAcceptRequest,
  djRejectRequest,
  getDJStats,
  // New DJ user authentication routes
  djSignup,
  djUserLogin,
  getVenuesWithDJMode,
  requestVenueAccess,
  getDJAccessStatus,
  getActiveVenue,
  // Venue DJ access management
  getVenueDJAccessRequests,
  approveVenueDJAccess,
  rejectVenueDJAccess,
  revokeVenueDJAccess
};
