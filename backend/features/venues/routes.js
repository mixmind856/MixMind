const express = require("express");
const router = express.Router();
const verifyVenueToken = require("../../middleware/verifyVenueToken");
const {
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
} = require("./venue.controller");

// Public routes
router.post("/signup", venueSignup);
router.post("/signin", venueSignin);
router.post("/waitlist", submitWaitlist);
router.get("/genres/available", getAvailableGenres);
router.get("/public/:venueId", getPublicVenue);
router.get("/active-venues", getActiveVenues);

// Protected routes
router.get("/profile", verifyVenueToken, getVenueProfile);
router.put("/profile", verifyVenueToken, updateVenueProfile);
router.post("/toggle-live-playlist", verifyVenueToken, toggleLivePlaylist);
router.post("/toggle-status", verifyVenueToken, toggleVenueStatus);

// Genre management routes
router.post("/genres/set", verifyVenueToken, setPreferredGenres);
router.get("/genres/get", verifyVenueToken, getPreferredGenres);

module.exports = router;
