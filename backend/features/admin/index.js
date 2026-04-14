const express = require("express");
const {
  listVenueRequests,
  approveRequest,
  rejectRequest,
  getLivePlaylistStatus,
  startLivePlaylist,
  stopLivePlaylist,
  getVenueRevenue,
  getPaymentStatus,
  getDashboardSummary,
  getAllVenuesStats,
  getRevenueBreakdown,
  getSongRequestDetails,
  getTopVenues
} = require("./admin.controller");

const router = express.Router();

/* -------------------- ADMIN AUTH MIDDLEWARE -------------------- */
function requireAdmin(req, res, next) {
  if (req.headers["x-admin-key"] !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

/* -------------------- REQUEST ROUTES -------------------- */
router.get("/requests/:venueId", requireAdmin, listVenueRequests);
router.post("/requests/:id/approve", requireAdmin, approveRequest);
router.post("/requests/:id/reject", requireAdmin, rejectRequest);

/* -------------------- LIVE PLAYLIST ROUTES -------------------- */
router.get("/live-playlist/status", requireAdmin, getLivePlaylistStatus);
router.post("/live-playlist/start", requireAdmin, startLivePlaylist);
router.post("/live-playlist/stop", requireAdmin, stopLivePlaylist);

/* -------------------- REVENUE ROUTES -------------------- */
router.get("/revenue/:venueId", requireAdmin, getVenueRevenue);

/* -------------------- PAYMENT ROUTES -------------------- */
router.get("/payment/:requestId", requireAdmin, getPaymentStatus);

/* ================== ADMIN DASHBOARD STATS ================== */

/* -------------------- DASHBOARD SUMMARY (ALL STATS) -------------------- */
router.get("/dashboard/summary", requireAdmin, getDashboardSummary);

/* -------------------- ALL VENUES WITH STATS -------------------- */
router.get("/venues/stats", requireAdmin, getAllVenuesStats);

/* -------------------- REVENUE BREAKDOWN -------------------- */
router.get("/revenue/breakdown", requireAdmin, getRevenueBreakdown);

/* -------------------- SONG REQUEST DETAILS -------------------- */
router.get("/requests/details/all", requireAdmin, getSongRequestDetails);

/* -------------------- TOP VENUES -------------------- */
router.get("/venues/top", requireAdmin, getTopVenues);

module.exports = router;
