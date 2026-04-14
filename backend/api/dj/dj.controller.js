const DJ = require("../../models/DJ");
const DJVenueAccess = require("../../models/DJVenueAccess");
const Venue = require("../../models/Venue");
const jwt = require("jsonwebtoken");

// DJ SIGNUP
exports.djSignup = async (req, res) => {
  try {
    const { name, email, password, phone, stripeId } = req.body;

    // Check if DJ already exists
    const existingDJ = await DJ.findOne({ email: email.toLowerCase() });
    if (existingDJ) {
      return res.status(400).json({ message: "DJ already registered with this email" });
    }

    // Create new DJ
    const newDJ = new DJ({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      stripeId, // Add Stripe ID if provided
      isVerified: true // Auto-verify for now (can add email verification later)
    });

    await newDJ.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: newDJ._id, email: newDJ.email },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "DJ registered successfully",
      token,
      dj: {
        id: newDJ._id,
        name: newDJ.name,
        email: newDJ.email,
        phone: newDJ.phone,
        stripeId: newDJ.stripeId
      }
    });
  } catch (err) {
    console.error("DJ Signup Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// DJ LOGIN
exports.djLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find DJ by email
    const dj = await DJ.findOne({ email: email.toLowerCase() });
    if (!dj) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Check password
    const isPasswordValid = await dj.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: dj._id, email: dj.email },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "DJ logged in successfully",
      token,
      dj: {
        id: dj._id,
        name: dj.name,
        email: dj.email,
        phone: dj.phone
      }
    });
  } catch (err) {
    console.error("DJ Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET VENUES WITH DJ MODE ENABLED
exports.getVenuesWithDJMode = async (req, res) => {
  try {
    const venues = await Venue.find({ djMode: true, isActive: true })
      .select("_id name city state address description currentDJ")
      .lean();

    res.status(200).json(venues);
  } catch (err) {
    console.error("Get Venues Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// REQUEST DJ ACCESS TO VENUE
exports.requestVenueAccess = async (req, res) => {
  try {
    const { venueId } = req.body;
    const djId = req.dj.id; // From middleware

    // Check if venue exists and has DJ mode enabled
    const venue = await Venue.findOne({ _id: venueId, djMode: true });
    if (!venue) {
      return res.status(400).json({ message: "Venue not found or DJ mode not enabled" });
    }

    // Check if request already exists
    const existingRequest = await DJVenueAccess.findOne({
      djId,
      venueId,
      status: { $in: ["pending", "approved"] }
    });

    if (existingRequest) {
      return res.status(400).json({ message: "Request already exists for this venue" });
    }

    // Create new access request
    const accessRequest = new DJVenueAccess({
      djId,
      venueId,
      status: "pending"
    });

    await accessRequest.save();

    res.status(201).json({
      message: "Access request sent to venue",
      accessRequest
    });
  } catch (err) {
    console.error("Request Access Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET DJ'S CURRENT ACCESS STATUS
exports.getDJAccessStatus = async (req, res) => {
  try {
    const djId = req.dj.id;

    // Get all access requests for this DJ
    const accessRequests = await DJVenueAccess.find({ djId })
      .populate("venueId", "name city state address")
      .sort({ createdAt: -1 });

    res.status(200).json(accessRequests);
  } catch (err) {
    console.error("Get Access Status Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET CURRENT ACTIVE VENUE FOR DJ
exports.getActiveVenue = async (req, res) => {
  try {
    const djId = req.dj.id;

    const activeAccess = await DJVenueAccess.findOne({
      djId,
      currentlyActive: true,
      status: "approved"
    }).populate("venueId", "name city state address");

    if (!activeAccess) {
      return res.status(404).json({ message: "No active venue access" });
    }

    res.status(200).json(activeAccess);
  } catch (err) {
    console.error("Get Active Venue Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
