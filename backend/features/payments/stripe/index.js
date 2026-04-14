const express = require("express");
const { handleWebhook, completeDemoPayment, verifyCheckout } = require("./stripe.controller");

const router = express.Router();

// Stripe requires raw body for signature verification
router.post("/webhook", express.raw({ type: "application/json" }), handleWebhook);

// DEMO mode: Complete payment manually (called by frontend after user clicks "complete")
router.post("/demo/complete", completeDemoPayment);

// LIVE mode: Verify checkout session (called when customer redirected back from Stripe)
router.get("/verify-checkout", verifyCheckout);

module.exports = router;
