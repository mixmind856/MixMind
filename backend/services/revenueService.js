/**
 * Revenue Service
 * Handles all revenue tracking and reporting operations
 * Provides detailed breakdowns of payments by status
 */

const Payment = require("../models/Payment");
const Venue = require("../models/Venue");

/**
 * Get complete revenue data for a specific venue
 * Includes breakdown by payment status (captured, authorized, failed)
 * @param {string} venueId - Venue ID
 * @returns {Promise<Object>} - Revenue breakdown with detailed payment info
 */
async function getVenueRevenue(venueId) {
  try {
    console.log(`📊 Fetching revenue for venue: ${venueId}`);

    const venue = await Venue.findById(venueId);
    if (!venue) {
      throw new Error("Venue not found");
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

      // Detailed breakdown by status
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
    return revenueBreakdown;
  } catch (err) {
    console.error(`❌ Revenue Error: ${err.message}`);
    throw err;
  }
}

/**
 * Get revenue summary statistics for a venue
 * Useful for quick dashboard displays
 * @param {string} venueId - Venue ID
 * @returns {Promise<Object>} - Summary statistics
 */
async function getRevenueSummary(venueId) {
  try {
    const venue = await Venue.findById(venueId);
    if (!venue) {
      throw new Error("Venue not found");
    }

    return {
      totalRevenue: venue.totalRevenue,
      totalCapturedPayments: venue.totalCapturedPayments,
      totalAuthorizedAmount: venue.totalAuthorizedAmount,
      averagePaymentAmount: venue.totalCapturedPayments > 0
        ? (venue.totalRevenue / venue.totalCapturedPayments).toFixed(2)
        : 0,
      lastUpdated: venue.lastRevenueUpdateAt
    };
  } catch (err) {
    console.error(`❌ Revenue Summary Error: ${err.message}`);
    throw err;
  }
}

module.exports = {
  getVenueRevenue,
  getRevenueSummary
};
