const express = require("express");
const Stripe = require("stripe");
const Request = require("../models/Request");
const Payment = require("../models/Payment");
const Venue = require("../models/Venue");
const beatsourceQueue = require("../queues/beatsourceQueue");
const {
  listRequests: adminListRequests,
  listVenueRequests,
  approveRequest: adminApproveRequest,
  rejectRequest: adminRejectRequest,
  getVenueRevenue,
  getPaymentStatus,
  getDashboardSummary,
  getAllVenuesStats,
  getRevenueBreakdown,
  getSongRequestDetails,
  getTopVenues
} = require("../api/admin/admin.controller");
require("dotenv").config();
const router = express.Router();

const DEMO_MODE = process.env.DEMO_MODE === "true" || !process.env.STRIPE_SECRET_KEY;
const stripe = !DEMO_MODE ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

function requireAdmin(req, res, next) {
  if (req.headers["x-admin-key"] !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

/* -------------------- LIST ALL REQUESTS -------------------- */
router.get("/requests", requireAdmin, adminListRequests);

/* -------------------- LIST VENUE-SPECIFIC REQUESTS -------------------- */
router.get("/requests/venue/:venueId", requireAdmin, listVenueRequests);

/* -------------------- APPROVE (CAPTURE) -------------------- */
router.post("/requests/:id/approve", requireAdmin, adminApproveRequest);

/* -------------------- REJECT (RELEASE) -------------------- */
router.post("/requests/:id/reject", requireAdmin, adminRejectRequest);

/* -------------------- VENUE REVENUE TRACKING -------------------- */
router.get("/revenue/venue/:venueId", requireAdmin, getVenueRevenue);

/* -------------------- PAYMENT STATUS -------------------- */
router.get("/payments/:requestId/status", requireAdmin, getPaymentStatus);

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
