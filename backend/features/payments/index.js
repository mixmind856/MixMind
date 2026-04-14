const express = require("express");
const { createPaymentIntent, createVenuePaymentIntent, getPaymentStatus } = require("./payment.controller");

const router = express.Router();

/* -------------------- ROUTES -------------------- */

/**
 * POST /api/payments/venue-intent
 * Creates a payment intent for venue song requests
 */
router.post("/venue-intent", createVenuePaymentIntent);

/**
 * GET /api/payments/status/:requestId
 * Get payment status for a request
 */
router.get("/status/:requestId", getPaymentStatus);

/**
 * POST /api/payments/create-intent
 * Original endpoint for backwards compatibility
 */
router.post("/create-intent", createPaymentIntent);

module.exports = router;
