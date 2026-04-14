const express = require("express");
const Request = require("../../models/Request");
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

/**
 * POST /api/requests
 * Creates a request with proper DJ mode and Live Playlist routing
 */
router.post("/", createRequest);

/**
 * GET /api/requests/:id
 */
router.get("/:id", getRequestById);

/**
 * GET /api/requests/user/:email
 * Get all requests for a specific user by email
 */
router.get("/user/:email", getUserRequests);

module.exports = router;
