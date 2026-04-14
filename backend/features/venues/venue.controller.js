const jwt = require("jsonwebtoken");
const Venue = require("../../models/Venue");

/**
 * Generate JWT token for venue
 */
function generateToken(venueId) {
  return jwt.sign({ id: venueId }, process.env.JWT_SECRET || "your_jwt_secret_key", {
    expiresIn: "7d"
  });
}

/**
 * Sign up a new venue
 */
async function venueSignup(req, res) {
  try {
    const { name, email, password, phone, address, city, state, zipCode, country, websiteUrl, description, stripeId } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    // Check if venue already exists
    const existingVenue = await Venue.findOne({ email: email.toLowerCase() });
    if (existingVenue) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Create new venue
    const venue = new Venue({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      address,
      city,
      state,
      zipCode,
      country,
      websiteUrl,
      description,
      stripeId, // Add Stripe ID if provided
      isVerified: true // Auto-verify for testing
    });

    await venue.save();

    // Generate token
    const token = generateToken(venue._id);

    res.status(201).json({
      message: "Venue registered successfully",
      token,
      venue: {
        id: venue._id,
        name: venue.name,
        email: venue.email,
        phone: venue.phone,
        stripeId: venue.stripeId
      }
    });
  } catch (err) {
    console.error("Venue Signup Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Sign in a venue
 */
async function venueSignin(req, res) {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find venue
    const venue = await Venue.findOne({ email: email.toLowerCase() });
    if (!venue) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check password
    const isPasswordValid = await venue.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check if venue is active
    if (!venue.isActive) {
      return res.status(403).json({ error: "Venue account is inactive" });
    }

    // Generate token
    const token = generateToken(venue._id);

    res.json({
      message: "Signed in successfully",
      token,
      venue: {
        id: venue._id,
        name: venue.name,
        email: venue.email,
        phone: venue.phone,
        city: venue.city
      }
    });
  } catch (err) {
    console.error("Venue Signin Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Get venue profile
 */
async function getVenueProfile(req, res) {
  try {
    const venueId = req.venue.id;
    const venue = await Venue.findById(venueId).select("-password");

    if (!venue) {
      return res.status(404).json({ error: "Venue not found" });
    }

    res.json(venue);
  } catch (err) {
    console.error("Get Venue Profile Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Update venue profile
 */
async function updateVenueProfile(req, res) {
  try {
    const venueId = req.venue.id;
    const { name, phone, address, city, state, zipCode, country, websiteUrl, description, preferredGenres } = req.body;

    const updateData = { name, phone, address, city, state, zipCode, country, websiteUrl, description };
    
    // If preferredGenres is provided, add it to update
    if (preferredGenres) {
      updateData.preferredGenres = Array.isArray(preferredGenres) ? preferredGenres : [preferredGenres];
    }

    const venue = await Venue.findByIdAndUpdate(
      venueId,
      updateData,
      { new: true }
    ).select("-password");

    if (!venue) {
      return res.status(404).json({ error: "Venue not found" });
    }

    res.json({ message: "Profile updated successfully", venue });
  } catch (err) {
    console.error("Update Venue Profile Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Get public venue info (no authentication required)
 */
async function getPublicVenue(req, res) {
  try {
    const { venueId } = req.params;

    const venue = await Venue.findById(venueId)
      .select("-password -verificationToken -verificationTokenExpiry");

    if (!venue) {
      return res.status(404).json({ error: "Venue not found" });
    }

    res.json(venue);
  } catch (err) {
    console.error("Get Public Venue Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Toggle live playlist (Now INDEPENDENT from DJ Mode)
 */
async function toggleLivePlaylist(req, res) {
  try {
    const venueId = req.venue.id;
    const { active } = req.body;

    console.log(`\n🎛️  TOGGLE LIVE PLAYLIST`);
    console.log(`   Active: ${active}`);
    console.log(`   ⚠️  NOTE: DJ Mode is now INDEPENDENT and NOT affected`);

    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ error: "Venue not found" });
    }

    // ===== UPDATED LOGIC =====
    // Live Playlist toggle is NOW INDEPENDENT
    // DJ Mode remains unchanged when toggling Live Playlist
    venue.livePlaylistActive = active;
    
    console.log(`   → Live Playlist: ${active ? "ON" : "OFF"}`);
    console.log(`   → DJ Mode: ${venue.djMode ? "ON" : "OFF"} (unchanged)`);

    await venue.save();
    console.log(`   ✅ Venue settings saved\n`);

    // Control worker lifecycle
    const workerManager = require("../../worker/workerManager");
    
    try {
      if (active) {
        console.log(`🎛️  Starting rotation worker for venue ${venue.name} (ID: ${venueId})`);
        
        // ===== WEBHOOK CALL WHEN LIVE PLAYLIST TURNS ON =====
        // Call the Beatsource/MixMind webhook to start automix
        try {
          const webhookUrl = "http://127.0.0.1:80/execute?script=browser_window%20%22automix%22%20%26%20playlist_clear";
          console.log(`🔗 Calling webhook to start automix: ${webhookUrl}`);
          
          const axios = require("axios");
          const webhookResponse = await axios.post(webhookUrl);
          console.log(`✅ Webhook called successfully:`, webhookResponse.status);
        } catch (webhookErr) {
          console.warn(`⚠️  Webhook call failed (non-critical):`, webhookErr.message);
          // Don't fail the request for webhook errors
        }
        
        const result = workerManager.startLivePlaylist(venueId.toString());
        
        if (result.started) {
          console.log(`✅ Worker started with PID: ${result.pid}`);
          res.json({
            message: "✅ Live playlist rotation started",
            active: true,
            djMode: venue.djMode,
            venue,
            worker: result
          });
        } else {
          console.warn(`⚠️  Worker start returned: ${result.message || JSON.stringify(result)}`);
          res.json({
            message: result.message || "Status updated",
            active: true,
            djMode: venue.djMode,
            venue,
            worker: result
          });
        }
      } else {
        console.log(`⏹️  Stopping rotation worker for venue ${venue.name}`);
        workerManager.stopLivePlaylist();
        res.json({
          message: "Live playlist rotation stopped",
          active: false,
          djMode: venue.djMode,
          venue
        });
      }
    } catch (workerErr) {
      console.error(`Worker control error:`, workerErr.message);
      res.json({
        message: "Status updated but worker control failed",
        active,
        djMode: venue.djMode,
        venue,
        warning: workerErr.message
      });
    }
  } catch (err) {
    console.error("Toggle Live Playlist Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Toggle venue active status (online/offline)
 */
async function toggleVenueStatus(req, res) {
  try {
    const venueId = req.venue.id;
    const { active } = req.body;

    const venue = await Venue.findByIdAndUpdate(
      venueId,
      { isActive: active },
      { new: true }
    ).select("-password");

    if (!venue) {
      return res.status(404).json({ error: "Venue not found" });
    }

    res.json({
      message: active ? "Venue is now ONLINE" : "Venue is now OFFLINE",
      isActive: active,
      venue
    });
  } catch (err) {
    console.error("Toggle Venue Status Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Get all active venues
 */
async function getActiveVenues(req, res) {
  try {
    const venues = await Venue.find({ isActive: true })
      .select("-password -verificationToken -verificationTokenExpiry -totalAuthorizedAmount")
      .sort({ name: 1 });

    res.json(venues);
  } catch (err) {
    console.error("Get Active Venues Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Set preferred genres for automix (genre filtering) - ENHANCED with bypass mode
 */
async function setPreferredGenres(req, res) {
  try {
    const venueId = req.venue.id;
    const { preferredGenres, genreCheckBypass } = req.body;

    console.log(`\n🎵 SET GENRE PREFERENCES`);
    console.log(`   VenueId: ${venueId}`);
    console.log(`   Bypass mode: ${genreCheckBypass}`);
    console.log(`   Genres: ${preferredGenres ? preferredGenres.join(", ") : "none"}`);

    const updateData = {};

    // Handle "All Genres" mode
    if (genreCheckBypass === true) {
      updateData.genreCheckBypass = true;
      updateData.preferredGenres = [];
      console.log(`   ✅ All genres mode ENABLED`);
    } else {
      // Specific genres selected
      if (!Array.isArray(preferredGenres) || preferredGenres.length === 0) {
        return res.status(400).json({ error: "Either select specific genres or enable 'All Genres' mode" });
      }
      updateData.preferredGenres = preferredGenres;
      updateData.genreCheckBypass = false;
      console.log(`   ✅ Specific genres selected: ${preferredGenres.join(", ")}`);
    }

    const venue = await Venue.findByIdAndUpdate(
      venueId,
      updateData,
      { new: true }
    ).select("preferredGenres genreCheckBypass name");

    if (!venue) {
      return res.status(404).json({ error: "Venue not found" });
    }

    const status = genreCheckBypass 
      ? "All genres accepted - no restrictions"
      : `${(venue.preferredGenres || []).length} genres selected`;

    console.log(`   ✅ Settings saved for ${venue.name}`);

    res.json({ 
      message: "Genre settings updated successfully",
      preferredGenres: venue.preferredGenres || [],
      genreCheckBypass: venue.genreCheckBypass || false,
      status: status
    });
  } catch (err) {
    console.error("Set Preferred Genres Error:", err.message);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
}

/**
 * Get preferred genres and bypass status 
 */
async function getPreferredGenres(req, res) {
  try {
    const venueId = req.venue.id;

    const venue = await Venue.findById(venueId).select("preferredGenres genreCheckBypass");

    if (!venue) {
      return res.status(404).json({ error: "Venue not found" });
    }

    let status = "";
    if (venue.genreCheckBypass) {
      status = "All genres accepted (bypass enabled)";
    } else if ((venue.preferredGenres || []).length > 0) {
      status = `Venue accepts: ${venue.preferredGenres.join(", ")}`;
    } else {
      status = "No genres selected - configure preferences";
    }

    res.json({ 
      preferredGenres: venue.preferredGenres || [],
      genreCheckBypass: venue.genreCheckBypass || false,
      status: status
    });
  } catch (err) {
    console.error("Get Preferred Genres Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Get all available genres
 */
function getAvailableGenres(req, res) {
  try {
    const availableGenres = [
      "COMMERCIAL_POP",
      "POP",
      "RNB",
      "US_HIPHOP",
      "UK_HIPHOP",
      "AFROBEATS",
      "DRILL",
      "ROCK",
      "INDIE",
      "HOUSE",
      "DANCEHALL",
      "DISCO",
      "REGGAETON"
    ];

    res.json({
      availableGenres: availableGenres,
      count: availableGenres.length,
      message: "Select genres or enable 'All Genres' mode"
    });
  } catch (err) {
    console.error("Get Available Genres Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Submit venue to waitlist
 */
async function submitWaitlist(req, res) {
  try {
    const { name, venueName, email, phone, venueType } = req.body;

    // Validation
    if (!name || !venueName || !email || !phone || !venueType) {
      return res.status(400).json({ error: "All fields are required" });
    }

    console.log(`\n📧 WAITLIST SUBMISSION`);
    console.log(`   Name: ${name}`);
    console.log(`   Venue: ${venueName}`);
    console.log(`   Email: ${email}`);
    console.log(`   Type: ${venueType}`);

    // Create waitlist entry
    const Waitlist = require("../../models/Waitlist");
    const waitlistEntry = await Waitlist.create({
      name,
      venueName,
      email: email.toLowerCase(),
      phone,
      venueType
    });

    // Send confirmation email
    const { sendWaitlistConfirmation } = require("../../services/emailService");
    const emailResult = await sendWaitlistConfirmation(email, name, venueName);

    if (emailResult.success) {
      await Waitlist.findByIdAndUpdate(waitlistEntry._id, { emailSent: true });
      console.log(`✅ Confirmation email sent`);
    } else {
      await Waitlist.findByIdAndUpdate(waitlistEntry._id, { emailError: emailResult.error });
      console.warn(`⚠️  Email send failed: ${emailResult.error}`);
    }

    res.status(201).json({
      success: true,
      message: "Welcome to the waitlist! Check your email for confirmation.",
      entry: waitlistEntry
    });
  } catch (err) {
    console.error("Waitlist submission error:", err.message);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
}

module.exports = {
  venueSignup,
  venueSignin,
  getVenueProfile,
  updateVenueProfile,
  getPublicVenue,
  toggleLivePlaylist,
  toggleVenueStatus,
  getActiveVenues,
  setPreferredGenres,
  getPreferredGenres,
  getAvailableGenres,
  submitWaitlist
};
