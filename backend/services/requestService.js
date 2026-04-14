/**
 * Request Service
 * Handles all request-related operations: list, approve, reject
 * Coordinates between payments, venues, and queues
 */

const Request = require("../models/Request");
const Payment = require("../models/Payment");
const beatsourceQueue = require("../queues/beatsourceQueue");
const paymentService = require("./paymentService");

/**
 * List all requests with optional filters
 * @param {Object} filters - Filter criteria (status, venueId, etc.)
 * @returns {Promise<Array>} - Array of requests
 */
async function listRequests(filters = {}) {
  try {
    const requests = await Request.find(filters)
      .populate("venueId", "name email")
      .sort({ createdAt: -1 });
    return requests;
  } catch (err) {
    console.error("List Requests Error:", err.message);
    throw err;
  }
}

/**
 * List all requests for a specific venue
 * @param {string} venueId - Venue ID
 * @param {Object} filters - Additional filter criteria
 * @returns {Promise<Array>} - Array of requests for the venue
 */
async function listVenueRequests(venueId, filters = {}) {
  try {
    const allFilters = { venueId, ...filters };
    const requests = await Request.find(allFilters)
      .populate("userId", "name email")
      .sort({ createdAt: -1 });
    return requests;
  } catch (err) {
    console.error("List Venue Requests Error:", err.message);
    throw err;
  }
}

/**
 * Approve a request and capture payment
 * This is called by admin to approve and process payment
 * @param {string} requestId - Request ID to approve
 * @returns {Promise<Object>} - Approved request with success message
 */
async function approveRequest(requestId) {
  try {
    console.log(`\n📋 [ADMIN] Approving request: ${requestId}`);

    const request = await Request.findById(requestId).populate("venueId");
    if (!request) {
      console.error(`❌ Request not found: ${requestId}`);
      throw new Error("Request not found");
    }

    if (request.status !== "authorized") {
      console.error(`❌ Request not authorized. Current status: ${request.status}`);
      throw new Error("Request not authorized yet");
    }

    if (!request.paymentIntentId) {
      console.error(`❌ No payment intent found for request: ${requestId}`);
      throw new Error("No payment intent found");
    }

    const payment = await Payment.findOne({ requestId: request._id });
    if (!payment) {
      console.error(`❌ Payment record not found for request: ${requestId}`);
      throw new Error("Payment record not found");
    }

    if (payment.status !== "authorized") {
      console.error(`❌ Payment not authorized. Current status: ${payment.status}`);
      throw new Error("Payment not authorized yet");
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
      throw new Error("Failed to capture payment: " + captureErr.message);
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

    return {
      success: true,
      message: "Request approved and payment captured",
      request: request
    };
  } catch (err) {
    console.error(`❌ Approve Request Error: ${err.message}`);
    throw err;
  }
}

/**
 * Reject a request and release payment
 * This is called by admin to reject request and release the authorized payment
 * @param {string} requestId - Request ID to reject
 * @param {string} reason - Reason for rejection
 * @returns {Promise<Object>} - Rejected request with success message
 */
async function rejectRequest(requestId, reason = null) {
  try {
    console.log(`\n🚫 [ADMIN] Rejecting request: ${requestId}`);

    const request = await Request.findById(requestId).populate("venueId");
    if (!request) {
      console.error(`❌ Request not found: ${requestId}`);
      throw new Error("Request not found");
    }

    if (!request.paymentIntentId) {
      console.error(`❌ No payment intent found for request: ${requestId}`);
      throw new Error("No payment intent found");
    }

    const payment = await Payment.findOne({ requestId: request._id });
    if (!payment) {
      console.error(`❌ Payment record not found for request: ${requestId}`);
      throw new Error("Payment record not found");
    }

    if (!["authorized", "pending"].includes(payment.status)) {
      console.error(`❌ Cannot reject payment with status: ${payment.status}`);
      throw new Error(`Cannot reject payment with status: ${payment.status}`);
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
      throw new Error("Failed to release payment: " + releaseErr.message);
    }

    // Update request status
    request.status = "rejected";
    request.rejectedAt = new Date();
    if (reason) request.rejectionReason = reason;
    await request.save();
    console.log(`✅ Request status updated to: rejected`);
    console.log(`📝 Rejection reason: ${reason || "None provided"}`);

    return {
      success: true,
      message: "Request rejected and payment released",
      request: request
    };
  } catch (err) {
    console.error(`❌ Reject Request Error: ${err.message}`);
    throw err;
  }
}

module.exports = {
  listRequests,
  listVenueRequests,
  approveRequest,
  rejectRequest
};
