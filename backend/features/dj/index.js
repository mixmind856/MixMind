const express = require("express");
const djController = require("./dj.controller");
const authController = require("./dj.controller");
const verifyVenueToken = require("../../middleware/verifyVenueToken");
const verifyDJToken = require("../../middleware/verifyDJToken");
const verifyDJUserToken = require("../../middleware/verifyDJUserToken");

const router = express.Router();

/* ========== DJ USER AUTHENTICATION (NEW DJ SYSTEM) ========== */
/**
 * POST /api/dj/signup
 * DJ creates a new account
 * No authentication required
 */
router.post("/signup", authController.djSignup);

/**
 * POST /api/dj/user-login
 * DJ logs in to their account with email/password
 * No authentication required (returns JWT token)
 */
router.post("/user-login", authController.djUserLogin);

/**
 * GET /api/dj/venues-with-dj-mode
 * Get list of all venues with DJ mode enabled
 * No authentication required
 */
router.get("/venues-with-dj-mode", authController.getVenuesWithDJMode);

/**
 * POST /api/dj/request-access
 * DJ requests access to a specific venue
 * Requires DJ user JWT token
 */
router.post("/request-access", verifyDJUserToken, authController.requestVenueAccess);

/**
 * GET /api/dj/access-status
 * DJ checks their access request status for all venues
 * Requires DJ user JWT token
 */
router.get("/access-status", verifyDJUserToken, authController.getDJAccessStatus);

/**
 * GET /api/dj/active-venue
 * DJ gets their currently active venue
 * Requires DJ user JWT token
 */
router.get("/active-venue", verifyDJUserToken, authController.getActiveVenue);

/* ========== EXISTING DJ MODE ROUTES (VENUE PASSWORD SYSTEM) ========== */
/**
 * POST /api/dj/initialize/:venueId
 * Initialize DJ mode for a venue (set DJ password)
 * Only venue can call this to enable DJ mode
 */
router.post("/initialize/:venueId", verifyVenueToken, djController.initializeDJMode);

/**
 * POST /api/dj/login
 * DJ login endpoint - public, no authentication required
 * Returns a DJ token after password verification
 * Used for venue-based DJ mode (legacy system)
 */
router.post("/login", djController.djLogin);

/**
 * POST /api/dj/toggle/:venueId
 * Toggle DJ mode on/off
 * Only venue can call this to disable DJ mode
 */
router.post("/toggle/:venueId", verifyVenueToken, djController.toggleDJMode);

/**
 * GET /api/dj/requests/:venueId
 * Get pending requests for DJ
 * Requires valid DJ token (venue-based)
 */
router.get("/requests/:venueId", verifyDJToken, djController.getPendingRequests);

/**
 * POST /api/dj/requests/:requestId/accept
 * DJ accepts a request
 * Requires valid DJ token (venue-based)
 */
router.post("/requests/:requestId/accept", verifyDJToken, djController.djAcceptRequest);

/**
 * POST /api/dj/requests/:requestId/reject
 * DJ rejects a request
 * Requires valid DJ token (venue-based)
 */
router.post("/requests/:requestId/reject", verifyDJToken, djController.djRejectRequest);

/**
 * GET /api/dj/stats/:venueId
 * Get DJ statistics
 * Requires valid DJ token (venue-based)
 */
router.get("/stats/:venueId", verifyDJToken, djController.getDJStats);

/* ========== VENUE DJ ACCESS MANAGEMENT ========== */
/**
 * GET /api/dj/venue/:venueId/access-requests
 * Get all DJ access requests for a venue (pending, approved, rejected, revoked)
 * Only venue can call this
 */
router.get("/venue/:venueId/access-requests", verifyVenueToken, djController.getVenueDJAccessRequests);

/**
 * POST /api/dj/venue/:accessRequestId/approve
 * Venue approves a DJ access request
 * Only venue can call this
 */
router.post("/venue/:accessRequestId/approve", verifyVenueToken, djController.approveVenueDJAccess);

/**
 * POST /api/dj/venue/:accessRequestId/reject
 * Venue rejects a DJ access request
 * Only venue can call this
 */
router.post("/venue/:accessRequestId/reject", verifyVenueToken, djController.rejectVenueDJAccess);

/**
 * POST /api/dj/venue/:accessRequestId/revoke
 * Venue revokes an approved DJ's access
 * Only venue can call this
 */
router.post("/venue/:accessRequestId/revoke", verifyVenueToken, djController.revokeVenueDJAccess);

module.exports = router;
