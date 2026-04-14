const express = require("express");
const router = express.Router();
const djController = require("./dj.controller");
const verifyDJToken = require("../../middleware/verifyDJToken");

// Public routes (no authentication needed)
router.post("/signup", djController.djSignup);
router.post("/login", djController.djLogin);
router.get("/venues-with-dj-mode", djController.getVenuesWithDJMode);

// Protected routes (require DJ authentication)
router.post("/request-access", verifyDJToken, djController.requestVenueAccess);
router.get("/access-status", verifyDJToken, djController.getDJAccessStatus);
router.get("/active-venue", verifyDJToken, djController.getActiveVenue);

module.exports = router;
