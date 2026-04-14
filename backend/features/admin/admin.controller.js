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

// Import models
const Request = require("../../models/Request");
const Payment = require("../../models/Payment");
const Venue = require("../../models/Venue");

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
      .populate("requestId", "songTitle artist price status")
      .sort({ capturedAt: -1 });

    const capturedPayments = payments.filter(p => p.status === "captured");
    const authorizedPayments = payments.filter(p => p.status === "authorized");
    const failedPayments = payments.filter(p => p.status === "failed");

    const revenueBreakdown = {
      totalRevenue: venue.totalRevenue,
      capturedPayments: venue.totalCapturedPayments,
      totalAuthorizedAmount: venue.totalAuthorizedAmount,
      lastRevenueUpdateAt: venue.lastRevenueUpdateAt,
      
      // Detailed breakdown
      payments: {
        captured: {
          count: capturedPayments.length,
          amount: capturedPayments.reduce((sum, p) => sum + (p.capturedAmount || 0), 0),
          details: capturedPayments.map(p => ({
            id: p._id,
            amount: p.capturedAmount,
            song: p.requestId?.songTitle,
            artist: p.requestId?.artist,
            capturedAt: p.capturedAt
          }))
        },
        authorized: {
          count: authorizedPayments.length,
          amount: authorizedPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
          details: authorizedPayments.map(p => ({
            id: p._id,
            amount: p.amount,
            song: p.requestId?.songTitle,
            artist: p.requestId?.artist,
            authorizedAt: p.authorizedAt
          }))
        },
        failed: {
          count: failedPayments.length,
          details: failedPayments.map(p => ({
            id: p._id,
            amount: p.amount,
            song: p.requestId?.songTitle,
            artist: p.requestId?.artist,
            cancelledAt: p.cancelledAt
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
  getTopVenues
};
