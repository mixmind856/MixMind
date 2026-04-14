const express = require("express");
const Stripe = require("stripe");
const Payment = require("../../models/Payment");
const Request = require("../../models/Request");

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * POST /api/payments/create-intent (Original endpoint - for backwards compatibility)
 * Creates a manual-capture PaymentIntent.
 * NOTE: Authorization happens ONLY after frontend confirmation.
 */
router.post("/create-intent", async (req, res) => {
  try {
    const { requestId } = req.body;

    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Prevent duplicate intents
    const existingPayment = await Payment.findOne({
      requestId: request._id,
      status: { $in: ["pending", "authorized"] }
    });

    if (existingPayment) {
      const intent = await stripe.paymentIntents.retrieve(
        existingPayment.stripePaymentIntentId
      );
      return res.json({ clientSecret: intent.client_secret });
    }

    // Create PaymentIntent (NOT authorized yet)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(request.price * 100),
      currency: "usd",
      capture_method: "manual",
      metadata: {
        requestId: request._id.toString()
      }
    });

    console.log(
      "PaymentIntent created :",
      paymentIntent
    );

    await Payment.create({
      requestId: request._id,
      stripePaymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: "pending"
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("Create intent error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
