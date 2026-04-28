const express = require('express');
const router = express.Router();
const ctrl = require('./jukebox.controller');
const venueAuth = require('../../middleware/venueAuth');

// ── Spotify OAuth ──────────────────────────────────────────
router.get('/spotify/login', ctrl.spotifyLogin);
router.get('/spotify/callback', ctrl.spotifyCallback);

// ── Track search ───────────────────────────────────────────
router.get('/search', ctrl.searchTracks);

// ── Venue public info ──────────────────────────────────────
router.get('/venue/:slug', ctrl.getVenueInfo);

// ── Payment flow ───────────────────────────────────────────
router.post('/precheck-genre', ctrl.precheckGenre);
router.post('/create-payment', ctrl.createPayment);
router.post('/confirm', ctrl.confirmAndProcess);

// ── Request status ─────────────────────────────────────────
router.get('/status/:requestId', ctrl.getRequestStatus);

// ── Venue management (protected) ──────────────────────────
router.post('/venue/register', ctrl.registerVenue);
router.post('/venue/login', ctrl.venueLogin);
router.put('/venue/genres', venueAuth, ctrl.updateGenres);

module.exports = router;
