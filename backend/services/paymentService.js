/**
 * Payment Service
 * Handles all payment-related operations: capture, release, and status management
 * Integrates with Stripe API and database models
 */

const Stripe = require("stripe");
const Payment = require("../models/Payment");
const Request = require("../models/Request");
const Venue = require("../models/Venue");

const DEMO_MODE = process.env.DEMO_MODE === "true" || !process.env.STRIPE_SECRET_KEY;
const stripe = !DEMO_MODE ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

/**
 * Capture payment and update venue revenue
 * This function is called when admin approves a request
 * @param {string} paymentIntentId - Stripe payment intent ID
 * @param {string} requestId - Request ID from database
 * @param {string} venueId - Venue ID from database
 * @param {number} amount - Payment amount to capture
 * @returns {Promise<Object>} - Capture result with success status
 */
async function capturePaymentAndUpdateRevenue(paymentIntentId, requestId, venueId, amount) {
  try {
    let captureResult;

    if (!DEMO_MODE && paymentIntentId.startsWith("pi_") && !paymentIntentId.includes("demo")) {
      // Real Stripe capture
      console.log(`💳 Capturing real Stripe payment: ${paymentIntentId}`);
      captureResult = await stripe.paymentIntents.capture(paymentIntentId);
      console.log(`✅ Payment captured: ${captureResult.id}, Status: ${captureResult.status}`);
    } else {
      // Demo mode or mock payment
      console.log(`🎪 Demo mode: Simulating payment capture for ${paymentIntentId}`);
      captureResult = { id: paymentIntentId, status: "succeeded" };
    }

    // Update Payment record
    const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
    if (payment) {
      payment.status = "captured";
      payment.capturedAmount = amount;
      payment.capturedAt = new Date();
      payment.paymentNotes = `Payment captured on admin approval for request ${requestId}`;
      await payment.save();
      console.log(`📝 Payment record updated: Status=captured, Amount=$${amount}`);
    }

    // Update Request payment status
    await Request.findByIdAndUpdate(requestId, {
      paymentStatus: "captured"
    });

    // Update Venue revenue and statistics
    const venue = await Venue.findById(venueId);
    if (venue) {
      venue.totalRevenue += amount;
      venue.totalCapturedPayments += 1;
      venue.totalAuthorizedAmount -= amount;
      venue.lastRevenueUpdateAt = new Date();
      await venue.save();
      console.log(`💰 Venue revenue updated: Total=$${venue.totalRevenue}, Captured=${venue.totalCapturedPayments}`);
    }

    return { success: true, captureResult };
  } catch (err) {
    console.error(`❌ Payment capture failed: ${err.message}`);
    throw err;
  }
}

/**
 * Release authorized payment (when admin rejects a request)
 * @param {string} paymentIntentId - Stripe payment intent ID
 * @param {string} requestId - Request ID from database
 * @param {string} venueId - Venue ID from database
 * @param {number} amount - Payment amount to release
 * @returns {Promise<Object>} - Release result with success status
 */
async function releasePaymentAndUpdateRevenue(paymentIntentId, requestId, venueId, amount) {
  try {
    let cancelResult;

    if (!DEMO_MODE && paymentIntentId.startsWith("pi_") && !paymentIntentId.includes("demo")) {
      // Real Stripe cancellation
      console.log(`🔓 Releasing real Stripe payment: ${paymentIntentId}`);
      cancelResult = await stripe.paymentIntents.cancel(paymentIntentId);
      console.log(`✅ Payment released: ${cancelResult.id}, Status: ${cancelResult.status}`);
    } else {
      // Demo mode
      console.log(`🎪 Demo mode: Simulating payment release for ${paymentIntentId}`);
      cancelResult = { id: paymentIntentId, status: "cancelled" };
    }

    // Update Payment record
    const payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
    if (payment) {
      payment.status = "cancelled";
      payment.cancelledAt = new Date();
      payment.paymentNotes = `Payment released on rejection for request ${requestId}`;
      await payment.save();
      console.log(`📝 Payment record updated: Status=cancelled`);
    }

    // Update Request payment status
    await Request.findByIdAndUpdate(requestId, {
      paymentStatus: "failed"
    });

    // Update Venue authorized amount
    const venue = await Venue.findById(venueId);
    if (venue) {
      venue.totalAuthorizedAmount -= amount;
      venue.lastRevenueUpdateAt = new Date();
      await venue.save();
      console.log(`💰 Venue authorized amount updated: Authorized=$${venue.totalAuthorizedAmount}`);
    }

    return { success: true, cancelResult };
  } catch (err) {
    console.error(`❌ Payment release failed: ${err.message}`);
    throw err;
  }
}

/**
 * Get payment status with complete lifecycle information
 * @param {string} requestId - Request ID from database
 * @returns {Promise<Object>} - Complete payment status and lifecycle info
 */
async function getPaymentStatus(requestId) {
  try {
    console.log(`💳 Fetching payment status for request: ${requestId}`);

    const request = await Request.findById(requestId).populate("venueId");
    if (!request) {
      throw new Error("Request not found");
    }

    const payment = await Payment.findOne({ requestId });
    if (!payment) {
      throw new Error("Payment not found");
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
    return paymentStatus;
  } catch (err) {
    console.error(`❌ Payment Status Error: ${err.message}`);
    throw err;
  }
}

module.exports = {
  capturePaymentAndUpdateRevenue,
  releasePaymentAndUpdateRevenue,
  getPaymentStatus
};
