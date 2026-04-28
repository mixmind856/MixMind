const express = require("express");
const router = express.Router();
const ctrl = require("./jukebox.controller");

router.get("/spotify/login", ctrl.spotifyLogin);
router.get("/spotify/callback", ctrl.spotifyCallback);
router.get("/search", ctrl.searchTracks);
router.post("/precheck-genre", ctrl.precheckGenre);
router.post("/create-payment", ctrl.createPayment);
router.post("/confirm", ctrl.confirmAndProcess);

module.exports = router;
