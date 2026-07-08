const express = require("express");
const router = express.Router();
const ctrl = require("./jukebox.controller");
const verifyVenueToken = require("../../middleware/verifyVenueToken");

router.get("/spotify/login", ctrl.spotifyLogin);
router.get("/spotify/callback", ctrl.spotifyCallback);
router.get("/debug-devices/:venueId", verifyVenueToken, ctrl.getSpotifyDebugDevices);
router.get("/stats", ctrl.getJukeboxStats);
router.get("/search", ctrl.searchTracks);
router.post("/precheck-genre", ctrl.precheckGenre);
router.post("/create-payment", ctrl.createPayment);
router.post("/confirm", ctrl.confirmAndProcess);
router.get("/queue-jump-stats", ctrl.getQueueJumpStats);

module.exports = router;
