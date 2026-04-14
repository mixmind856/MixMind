const express = require("express");
const { 
  createRequest, 
  getRequestById,
  approveRequest,
  rejectRequest,
  getVenuePublicRequests,
  getQueueStatus,
  getUserRequests
} = require("./requests.controller");
const verifyVenueToken = require("../../middleware/verifyVenueToken");

const router = express.Router();

/* -------------------- ROUTES -------------------- */
router.post("/", createRequest);
router.post("/create", createRequest);  // Alternative endpoint

// Queue status (must be before /:id to avoid being treated as an id)
router.get("/queue/status", getQueueStatus);

// Get user requests by email (must be before /:id to avoid being treated as an id)
router.get("/user/:email", getUserRequests);

router.get("/:id", getRequestById);

// Venue-specific routes
router.post("/:id/approve", verifyVenueToken, approveRequest);
router.post("/:id/reject", verifyVenueToken, rejectRequest);

// Get public completed requests for a venue
router.get("/venue/:venueId/public", getVenuePublicRequests);

// Get all venue requests (requires venue auth)
router.get("/venue/:venueId", verifyVenueToken, async (req, res) => {
  try {
    const { venueId } = req.params;
    
    // Verify the venue token matches the requested venue
    if (req.venue.id !== venueId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const Request = require("../../models/Request");
    const requests = await Request.find({ venueId: venueId }).populate("userId");
    
    res.json(requests);
  } catch (err) {
    console.error("Get venue requests error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
