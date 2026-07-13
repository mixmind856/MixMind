/**
 * Admin Controller
 * Routes admin API calls to appropriate service layers
 * Handles HTTP requests/responses and error handling
 */

const {
  paymentService,
  requestService,
  revenueService,
  livePlaylistService
} = require("../../services");

// Import admin stats service
const adminStatsService = require("../../services/adminStatsService");
const {
  buildAnalyticsFunnel,
  buildVenueAnalyticsDeepDive
} = require("../../services/analyticsFunnelService");
const { buildMoneyVenues, buildMoneyVenue } = require("../../services/adminMoneyService");

// Import models
const Request = require("../../models/Request");
const Payment = require("../../models/Payment");
const Venue = require("../../models/Venue");
const {
  resolveVenuePrices,
  validatePricingField,
  attachGlobalPricingToVenue,
} = require("../../utils/venuePricing");
const {
  readGlobalPricing,
  writeGlobalPricing,
} = require("../../utils/globalPricingStore");
const { fetchVenueSpotifyDeviceDebug } = require("../../utils/spotifyDeviceDebug");
const { buildVenuePayoutInvoiceData } = require("../../services/venuePayoutInvoiceService");
const { generateVenuePayoutPdf } = require("../../services/venuePayoutPdfService");
const {
  writePayoutCalculatorConfig,
} = require("../../utils/payoutCalculatorStore");
const { buildCalculatorPreview } = require("../../utils/payoutCalculator");

// Import queues
const beatsourceQueue = require("../../queues/beatsourceQueue");

// Import live playlist utilities
const {
  isLivePlaylistEnabled,
  enableLivePlaylist,
  disableLivePlaylist
} = require("../../helper/livePlaylist.db");

/* ================== REQUEST MANAGEMENT ================== */

/**
 * HTTP Handler: List all requests
 */

/* -------------------- LIST REQUESTS FOR SPECIFIC VENUE -------------------- */
async function listVenueRequests(req, res) {
  try {
    const { venueId } = req.params;
    const filter = { venueId };
    if (req.query.status) filter.status = req.query.status;

    const requests = await Request.find(filter)
      .populate("userId", "name email")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error("List Venue Requests Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* -------------------- APPROVE REQUEST -------------------- */
async function approveRequest(req, res) {
  try {
    console.log(`\n📋 [ADMIN] Approving request: ${req.params.id}`);
    
    const request = await Request.findById(req.params.id).populate("venueId");
    if (!request) {
      console.error(`❌ Request not found: ${req.params.id}`);
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.status !== "authorized") {
      console.error(`❌ Request not authorized. Current status: ${request.status}`);
      return res.status(400).json({ error: "Request not authorized yet" });
    }

    if (!request.paymentIntentId) {
      console.error(`❌ No payment intent found for request: ${req.params.id}`);
      return res.status(400).json({ error: "No payment intent found" });
    }

    const payment = await Payment.findOne({ requestId: request._id });
    if (!payment) {
      console.error(`❌ Payment record not found for request: ${req.params.id}`);
      return res.status(400).json({ error: "Payment record not found" });
    }

    if (payment.status !== "authorized") {
      console.error(`❌ Payment not authorized. Current status: ${payment.status}`);
      return res.status(400).json({ error: "Payment not authorized yet" });
    }

    // Capture payment and update revenue
    try {
      await paymentService.capturePaymentAndUpdateRevenue(
        request.paymentIntentId,
        request._id,
        request.venueId._id,
        request.price
      );
    } catch (captureErr) {
      console.error(`❌ Failed to capture payment: ${captureErr.message}`);
      return res.status(400).json({ error: "Failed to capture payment: " + captureErr.message });
    }

    // Update request status
    request.status = "processing";
    request.approvedAt = new Date();
    await request.save();
    console.log(`✅ Request status updated to: processing`);

    // Add to queue for beatsource processing
    try {
      await beatsourceQueue.add("beatsourceJob", { requestId: request._id.toString() });
      console.log(`📤 Added to beatsource queue: ${request._id}`);
    } catch (queueErr) {
      console.error(`⚠️ Queue error (non-blocking): ${queueErr.message}`);
    }

    res.json({ 
      success: true, 
      message: "Request approved and payment captured",
      request: request
    });
    
  } catch (err) {
    console.error(`❌ Approve Request Error: ${err.message}`);
    res.status(500).json({ error: "Internal server error: " + err.message });
  }
}

/* -------------------- REJECT REQUEST -------------------- */
async function rejectRequest(req, res) {
  try {
    console.log(`\n🚫 [ADMIN] Rejecting request: ${req.params.id}`);
    
    const { reason } = req.body;
    const request = await Request.findById(req.params.id).populate("venueId");
    if (!request) {
      console.error(`❌ Request not found: ${req.params.id}`);
      return res.status(404).json({ error: "Request not found" });
    }

    if (!request.paymentIntentId) {
      console.error(`❌ No payment intent found for request: ${req.params.id}`);
      return res.status(400).json({ error: "No payment intent found" });
    }

    const payment = await Payment.findOne({ requestId: request._id });
    if (!payment) {
      console.error(`❌ Payment record not found for request: ${req.params.id}`);
      return res.status(400).json({ error: "Payment record not found" });
    }

    if (!["authorized", "pending"].includes(payment.status)) {
      console.error(`❌ Cannot reject payment with status: ${payment.status}`);
      return res.status(400).json({ error: `Cannot reject payment with status: ${payment.status}` });
    }

    // Release authorized payment
    try {
      await paymentService.releasePaymentAndUpdateRevenue(
        request.paymentIntentId,
        request._id,
        request.venueId._id,
        request.price
      );
    } catch (releaseErr) {
      console.error(`❌ Failed to release payment: ${releaseErr.message}`);
      return res.status(400).json({ error: "Failed to release payment: " + releaseErr.message });
    }

    // Update request status
    request.status = "rejected";
    request.rejectedAt = new Date();
    if (reason) request.rejectionReason = reason;
    await request.save();
    console.log(`✅ Request status updated to: rejected`);
    console.log(`📝 Rejection reason: ${reason || "None provided"}`);

    res.json({ 
      success: true, 
      message: "Request rejected and payment released",
      request: request
    });
    
  } catch (err) {
    console.error(`❌ Reject Request Error: ${err.message}`);
    res.status(500).json({ error: "Internal server error: " + err.message });
  }
}

/* -------------------- LIVE PLAYLIST CONTROL -------------------- */
async function getLivePlaylistStatus(req, res) {
  try {
    const enabled = await isLivePlaylistEnabled();
    res.json({ enabled });
  } catch (err) {
    console.error("Live Playlist Status Error:", err);
    res.status(500).json({ error: "Failed to get live playlist status" });
  }
}

async function startLivePlaylist(req, res) {
  try {
    await enableLivePlaylist();
    res.json({ success: true, status: "LIVE_PLAYLIST_STARTED" });
  } catch (err) {
    console.error("Start Live Playlist Error:", err);
    res.status(500).json({ error: "Failed to start live playlist" });
  }
}


async function stopLivePlaylist(req, res) {
  try {
    await disableLivePlaylist();
    res.json({ success: true, status: "LIVE_PLAYLIST_STOPPED" });
  } catch (err) {
    console.error("Stop Live Playlist Error:", err);
    res.status(500).json({ error: "Failed to stop live playlist" });
  }
}

/* -------------------- VENUE REVENUE TRACKING -------------------- */
async function getVenueRevenue(req, res) {
  try {
    const { venueId } = req.params;
    console.log(`📊 Fetching revenue for venue: ${venueId}`);

    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ error: "Venue not found" });
    }

    // Get detailed payment breakdown
    const payments = await Payment.find({ venueId })
  .populate("requestId", "songTitle title artist artistName price status")
  .sort({ capturedAt: -1, createdAt: -1 });

// Only count revenue if payment is captured AND linked request is actually accepted/completed/queued
const capturedPayments = payments.filter(
  p =>
    p.status === "captured" &&
    p.requestId &&
    ["queued", "completed", "processing", "approved"].includes(p.requestId.status)
);

// Pending money should only count if request is still waiting / pending
const authorizedPayments = payments.filter(
  p =>
    p.status === "authorized" &&
    p.requestId &&
    ["pending_dj_approval", "authorized", "created"].includes(p.requestId.status)
);

// Failed/rejected bucket should include cancelled too
const failedPayments = payments.filter(
  p =>
    (p.status === "failed" || p.status === "cancelled") &&
    p.requestId
);

const totalRevenue = capturedPayments.reduce(
  (sum, p) => sum + (p.capturedAmount || p.amount || 0),
  0
);

const totalAuthorizedAmount = authorizedPayments.reduce(
  (sum, p) => sum + (p.amount || 0),
  0
);

const revenueBreakdown = {
  totalRevenue,
  capturedPayments: capturedPayments.length,
  totalAuthorizedAmount,
  lastRevenueUpdateAt:
    payments.length > 0
      ? payments[0].updatedAt || payments[0].capturedAt || payments[0].createdAt
      : venue.lastRevenueUpdateAt,
      
      // Detailed breakdown
      payments: {
  captured: {
    count: capturedPayments.length,
    amount: totalRevenue,
    details: capturedPayments.map(p => ({
      id: p._id,
      amount: p.capturedAmount || p.amount || 0,
      song: p.requestId?.songTitle || p.requestId?.title || "Unknown Song",
      artist: p.requestId?.artist || p.requestId?.artistName || "Unknown Artist",
      capturedAt: p.capturedAt
    }))
  },
  authorized: {
    count: authorizedPayments.length,
    amount: totalAuthorizedAmount,
    details: authorizedPayments.map(p => ({
      id: p._id,
      amount: p.amount || 0,
      song: p.requestId?.songTitle || p.requestId?.title || "Unknown Song",
      artist: p.requestId?.artist || p.requestId?.artistName || "Unknown Artist",
      authorizedAt: p.authorizedAt || p.createdAt
    }))
  },
  failed: {
    count: failedPayments.length,
    details: failedPayments.map(p => ({
      id: p._id,
      amount: p.amount || 0,
      song: p.requestId?.songTitle || p.requestId?.title || "Unknown Song",
      artist: p.requestId?.artist || p.requestId?.artistName || "Unknown Artist",
      cancelledAt: p.cancelledAt || p.updatedAt
    }))
  }
}
    };

    console.log(`✅ Revenue data: Total=$${venue.totalRevenue}, Captured=${venue.totalCapturedPayments}`);
    res.json(revenueBreakdown);
  } catch (err) {
    console.error(`❌ Revenue Error: ${err.message}`);
    res.status(500).json({ error: "Failed to fetch revenue: " + err.message });
  }
}

/* -------------------- PAYMENT STATUS TRACKING -------------------- */
async function getPaymentStatus(req, res) {
  try {
    const { requestId } = req.params;
    console.log(`💳 Fetching payment status for request: ${requestId}`);

    const request = await Request.findById(requestId).populate("venueId");
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    const payment = await Payment.findOne({ requestId });
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    const paymentStatus = {
      requestId: request._id,
      requestStatus: request.status,
      paymentStatus: payment.status,
      paymentIntentId: payment.stripePaymentIntentId,
      amount: payment.amount,
      capturedAmount: payment.capturedAmount,
      timestamps: {
        createdAt: payment.createdAt,
        authorizedAt: payment.authorizedAt,
        capturedAt: payment.capturedAt,
        cancelledAt: payment.cancelledAt,
        failedAt: payment.failedAt
      },
      venue: {
        id: request.venueId._id,
        name: request.venueId.name,
        totalRevenue: request.venueId.totalRevenue
      }
    };

    console.log(`✅ Payment status: ${payment.status}`);
    res.json(paymentStatus);
  } catch (err) {
    console.error(`❌ Payment Status Error: ${err.message}`);
    res.status(500).json({ error: "Failed to fetch payment status: " + err.message });
  }
}

/* ================== ADMIN DASHBOARD STATS ================== */

/**
 * HTTP Handler: Get dashboard summary with all stats
 */
async function getDashboardSummary(req, res) {
  try {
    const summary = await adminStatsService.getDashboardSummary();
    res.json(summary);
  } catch (err) {
    console.error("Get Dashboard Summary Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * HTTP Handler: Get all venues with stats
 */
async function getAllVenuesStats(req, res) {
  try {
    const venues = await adminStatsService.getAllVenuesWithStats();
    res.json(venues);
  } catch (err) {
    console.error("Get All Venues Stats Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * HTTP Handler: Get revenue breakdown
 */
async function getRevenueBreakdown(req, res) {
  try {
    const revenue = await adminStatsService.getRevenueBreakdown();
    res.json(revenue);
  } catch (err) {
    console.error("Get Revenue Breakdown Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * HTTP Handler: Get song request details
 */
async function getSongRequestDetails(req, res) {
  try {
    const details = await adminStatsService.getSongRequestDetails();
    res.json(details);
  } catch (err) {
    console.error("Get Song Request Details Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * HTTP Handler: Get top venues
 */
async function getTopVenues(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const venues = await adminStatsService.getTopVenues(limit);
    res.json(venues);
  } catch (err) {
    console.error("Get Top Venues Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getAnalyticsFunnel(req, res) {
  try {
    const data = await buildAnalyticsFunnel(req.query);
    res.json(data);
  } catch (err) {
    console.error("Get Analytics Funnel Error:", err.message);
    const code = err.statusCode || 500;
    if (code === 400) {
      return res.status(400).json({ error: err.message || "Bad request" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getAnalyticsVenue(req, res) {
  try {
    const data = await buildVenueAnalyticsDeepDive(req.params.venueId, req.query);
    res.json(data);
  } catch (err) {
    console.error("Get Analytics Venue Error:", err.message);
    const code = err.statusCode || 500;
    if (code === 400) {
      return res.status(400).json({ error: err.message || "Bad request" });
    }
    if (code === 404) {
      return res.status(404).json({ error: err.message || "Not found" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getMoneyVenues(req, res) {
  try {
    const data = await buildMoneyVenues(req.query);
    res.json(data);
  } catch (err) {
    console.error("Get Money Venues Error:", err.message);
    const code = err.statusCode || 500;
    if (code === 400) {
      return res.status(400).json({ error: err.message || "Bad request" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getMoneyVenue(req, res) {
  try {
    const data = await buildMoneyVenue(req.params.venueId, req.query);
    res.json(data);
  } catch (err) {
    console.error("Get Money Venue Error:", err.message);
    const code = err.statusCode || 500;
    if (code === 400) {
      return res.status(400).json({ error: err.message || "Bad request" });
    }
    if (code === 404) {
      return res.status(404).json({ error: err.message || "Not found" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
}

async function updateVenuePricing(req, res) {
  try {
    const { venueId } = req.params;
    const { spotifyJukeboxPrice, djNormalPrice, djPriorityPrice } = req.body;

    const fields = [
      ["spotifyJukeboxPrice", spotifyJukeboxPrice],
      ["djNormalPrice", djNormalPrice],
      ["djPriorityPrice", djPriorityPrice],
    ];

    for (const [name, value] of fields) {
      const err = validatePricingField(value, name);
      if (err) {
        return res.status(400).json({ error: err });
      }
    }

    const venue = await Venue.findByIdAndUpdate(
      venueId,
      {
        spotifyJukeboxPrice: Number(spotifyJukeboxPrice),
        djNormalPrice: Number(djNormalPrice),
        djPriorityPrice: Number(djPriorityPrice),
      },
      { new: true }
    ).select("name useGlobalPricing spotifyJukeboxPrice djNormalPrice djPriorityPrice");

    if (!venue) {
      return res.status(404).json({ error: "Venue not found" });
    }

    const enriched = attachGlobalPricingToVenue(venue);
    const prices = resolveVenuePrices(enriched);

    res.json({
      message: "Venue pricing updated",
      venue: {
        id: String(venue._id),
        name: venue.name,
        useGlobalPricing: venue.useGlobalPricing !== false,
        ...prices,
      },
    });
  } catch (err) {
    console.error("Update Venue Pricing Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getPlatformPowers(req, res) {
  try {
    const globalPricing = readGlobalPricing();
    res.json({ globalPricing });
  } catch (err) {
    console.error("Get Platform Powers Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function updatePlatformPowers(req, res) {
  try {
    const standardRequest = Number(
      req.body.standardRequest ?? req.body.defaultSpotifyJukeboxPrice
    );
    const queueJump = Number(req.body.queueJump ?? req.body.defaultQueueJumpPrice);
    const playNext = Number(req.body.playNext ?? req.body.defaultPlayNextPrice);

    const fields = [
      ["standardRequest", standardRequest],
      ["queueJump", queueJump],
      ["playNext", playNext],
    ];

    for (const [name, value] of fields) {
      const err = validatePricingField(value, name);
      if (err) {
        return res.status(400).json({ error: err });
      }
    }

    if (queueJump < standardRequest) {
      return res.status(400).json({
        error: "Queue Jump price must be greater than or equal to Standard Request price",
      });
    }

    const globalPricing = writeGlobalPricing({
      standardRequest,
      queueJump,
      playNext,
    });

    res.json({
      message: "Global pricing updated",
      globalPricing,
    });
  } catch (err) {
    console.error("Update Platform Powers Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function setVenueUseGlobalPricing(req, res) {
  try {
    const { venueId } = req.params;
    const { useGlobalPricing } = req.body;

    if (typeof useGlobalPricing !== "boolean") {
      return res.status(400).json({ error: "useGlobalPricing must be a boolean" });
    }

    const venue = await Venue.findByIdAndUpdate(
      venueId,
      { useGlobalPricing },
      { new: true }
    ).select("_id name useGlobalPricing spotifyJukeboxPrice djNormalPrice djPriorityPrice");

    if (!venue) {
      return res.status(404).json({ error: "Venue not found" });
    }

    const enriched = attachGlobalPricingToVenue(venue);
    const prices = resolveVenuePrices(enriched);

    res.json({
      message: useGlobalPricing
        ? "Venue now uses global pricing"
        : "Venue now uses custom pricing",
      useGlobalPricing: venue.useGlobalPricing,
      venue: {
        id: String(venue._id),
        name: venue.name,
        useGlobalPricing: venue.useGlobalPricing,
        ...prices,
      },
    });
  } catch (err) {
    console.error("Set Venue Use Global Pricing Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function setVenueActive(req, res) {
  try {
    const { venueId } = req.params;
    const { active } = req.body;

    if (typeof active !== "boolean") {
      return res.status(400).json({ error: "active must be a boolean" });
    }

    const venue = await Venue.findByIdAndUpdate(
      venueId,
      { isActive: active },
      { new: true }
    ).select("_id name isActive");

    if (!venue) {
      return res.status(404).json({ error: "Venue not found" });
    }

    res.json({
      message: active ? "Venue is now ONLINE" : "Venue is now OFFLINE",
      isActive: venue.isActive,
      venue: {
        id: String(venue._id),
        name: venue.name,
        isActive: venue.isActive,
      },
    });
  } catch (err) {
    console.error("Set Venue Active Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getVenuesSpotifyDeviceStatus(req, res) {
  try {
    const venueIds = Array.isArray(req.body?.venueIds) ? req.body.venueIds : [];
    if (!venueIds.length) {
      return res.json({ statuses: {} });
    }

    const uniqueIds = [...new Set(venueIds.map(String))].slice(0, 50);
    const statuses = {};

    await Promise.all(
      uniqueIds.map(async (venueId) => {
        try {
          statuses[venueId] = await fetchVenueSpotifyDeviceDebug(venueId);
        } catch {
          statuses[venueId] = null;
        }
      })
    );

    res.json({ statuses });
  } catch (err) {
    console.error("Get Venues Spotify Device Status Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getVenuePayoutInvoicePdf(req, res) {
  try {
    const { venueId } = req.params;
    const invoiceData = await buildVenuePayoutInvoiceData(venueId, req.query);
    const pdfBuffer = await generateVenuePayoutPdf(invoiceData);

    const safeVenue = (invoiceData.venue.name || "venue")
      .replace(/[^\w-]+/g, "_")
      .slice(0, 48);
    const filename = `mixmind-payout-${safeVenue}-${invoiceData.statementReference.replace(/[^\w-]+/g, "_").slice(0, 48)}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("Get Venue Payout Invoice PDF Error:", err.message);
    const code = err.statusCode || 500;
    if (code === 400) {
      return res.status(400).json({ error: err.message || "Bad request" });
    }
    if (code === 404) {
      return res.status(404).json({ error: err.message || "Not found" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getPayoutCalculator(req, res) {
  try {
    const preview = buildCalculatorPreview();
    res.json(preview);
  } catch (err) {
    console.error("Get Payout Calculator Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function updatePayoutCalculator(req, res) {
  try {
    const body = req.body || {};
    const pl = body.playlistMode || {};
    const dn = body.djNormal || {};
    const dp = body.djPriority || {};

    if (Number(pl.venueSharePct) + Number(pl.mixmindSharePct) > 100.0001) {
      return res.status(400).json({
        error: "Playlist Venue Share + MixMind Share must not exceed 100%",
      });
    }

    const fields = [
      ["playlistMode.stripeFee", pl.stripeFee],
      ["playlistMode.platformCost", pl.platformCost],
      ["playlistMode.venueSharePct", pl.venueSharePct],
      ["playlistMode.mixmindSharePct", pl.mixmindSharePct],
      ["playlistMode.exampleCustomerPays", pl.exampleCustomerPays],
      ["djNormal.customerPrice", dn.customerPrice],
      ["djNormal.mixmindShare", dn.mixmindShare],
      ["djNormal.stripeFee", dn.stripeFee],
      ["djPriority.customerPrice", dp.customerPrice],
      ["djPriority.mixmindShare", dp.mixmindShare],
      ["djPriority.stripeFee", dp.stripeFee],
    ];

    for (const [name, value] of fields) {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ error: `${name} must be a number ≥ 0` });
      }
    }

    const config = writePayoutCalculatorConfig({
      playlistMode: pl,
      djNormal: dn,
      djPriority: dp,
      futureFields: body.futureFields || {},
    });

    res.json({
      message: "Payout calculator settings saved",
      ...buildCalculatorPreview(config),
    });
  } catch (err) {
    console.error("Update Payout Calculator Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
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
  getTopVenues,
  getAnalyticsFunnel,
  getAnalyticsVenue,
  getMoneyVenues,
  getMoneyVenue,
  updateVenuePricing,
  getPlatformPowers,
  updatePlatformPowers,
  setVenueUseGlobalPricing,
  setVenueActive,
  getVenuesSpotifyDeviceStatus,
  getVenuePayoutInvoicePdf,
  getPayoutCalculator,
  updatePayoutCalculator,
};
