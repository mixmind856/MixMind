const express = require("express");
const router = express.Router();
const verifyVenueToken = require("../../middleware/verifyVenueToken");
const {
  venueSignup,
  venueSignin,
  getVenueRequestStats,
  getVenueProfile,
  updateVenueProfile,
  getPublicVenue,
  toggleLivePlaylist,
  toggleVenueStatus,
  toggleSpotifyMode,
  getActiveVenues,
  setPreferredGenres,
  getPreferredGenres,
  getAvailableGenres,
  submitWaitlist,
  getAutomaticScheduling,
  updateAutomaticScheduling,
  switchToManualMode,
  resumeAutomaticMode
} = require("./venue.controller");

// Public routes
router.post("/signup", venueSignup);
router.post("/signin", venueSignin);
router.post("/waitlist", submitWaitlist);
router.get("/genres/available", getAvailableGenres);
router.get("/public/:venueId", getPublicVenue);
router.get("/active-venues", getActiveVenues);

// Protected routes
router.get("/request-stats", verifyVenueToken, getVenueRequestStats);
router.get("/profile", verifyVenueToken, getVenueProfile);
router.put("/profile", verifyVenueToken, updateVenueProfile);
router.post("/toggle-live-playlist", verifyVenueToken, toggleLivePlaylist);
router.post("/toggle-status", verifyVenueToken, toggleVenueStatus);
router.put("/spotify-mode", verifyVenueToken, toggleSpotifyMode);

// Automatic Playlist ↔ DJ mode scheduling
router.get("/automatic-scheduling", verifyVenueToken, getAutomaticScheduling);
router.put("/automatic-scheduling", verifyVenueToken, updateAutomaticScheduling);
router.post("/automatic-scheduling/manual", verifyVenueToken, switchToManualMode);
router.post("/automatic-scheduling/resume", verifyVenueToken, resumeAutomaticMode);

// Genre management routes
router.post("/genres/set", verifyVenueToken, setPreferredGenres);
router.get("/genres/get", verifyVenueToken, getPreferredGenres);

module.exports = router;
