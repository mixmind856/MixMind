const Stripe = require("stripe");
const Payment = require("../../models/Payment");
const Request = require("../../models/Request");

// 🔧 DEMO MODE - Set to false when you have real Stripe keys
const DEMO_MODE = process.env.DEMO_MODE !== "false";

const stripe = !DEMO_MODE ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

/* -------------------- CREATE PAYMENT INTENT FOR VENUE REQUEST -------------------- */
async function createVenuePaymentIntent(req, res) {
  try {
    const { requestId, venueId } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: "requestId is required" });
    }

    const request = await Request.findById(requestId);
    if (!request) return res.status(404).json({ error: "Request not found" });

    // Verify venue ownership if venueId is provided
    if (venueId && request.venueId && request.venueId.toString() !== venueId) {
      return res.status(403).json({ error: "Unauthorized - Venue mismatch" });
    }

    // Check if request already has a payment in progress
    if (request.paymentStatus === "authorized" || request.paymentStatus === "captured") {
      return res.status(400).json({ error: "Payment already processed for this request" });
    }

    if (DEMO_MODE) {
      // 🎪 DEMO MODE - Create mock payment intent
      console.log("🎪 DEMO MODE - Creating mock payment intent for request:", requestId);
      
      const mockPaymentIntentId = `pi_demo_${Date.now()}`;
      const mockClientSecret = `${mockPaymentIntentId}_secret_demo_${Math.random().toString(36).substr(2, 9)}`;

      // Update request with demo payment intent ID
      await Request.findByIdAndUpdate(requestId, {
        paymentIntentId: mockPaymentIntentId,
        paymentStatus: "pending"
      });

      // Create demo payment record
      await Payment.create({
        requestId: request._id,
        venueId: request.venueId || null,
        stripePaymentIntentId: mockPaymentIntentId,
        amount: Math.round(request.price * 100),
        currency: "usd",
        status: "pending"
      });

      console.log("✅ Demo payment intent created:", mockPaymentIntentId);

      return res.json({
        clientSecret: mockClientSecret,
        paymentIntentId: mockPaymentIntentId,
        demo: true
      });
    }

    // 💳 REAL STRIPE MODE
    if (!stripe) {
      return res.status(500).json({ error: "Stripe not configured. Set DEMO_MODE=false and STRIPE_SECRET_KEY in .env" });
    }

    // Check if payment intent already exists for this request
    if (request.paymentIntentId) {
      try {
        const intent = await stripe.paymentIntents.retrieve(request.paymentIntentId);
        if (intent.status === "requires_payment_method" || intent.status === "requires_confirmation") {
          return res.json({ clientSecret: intent.client_secret });
        }
      } catch (err) {
        console.log("Could not retrieve existing intent:", err.message);
      }
    }

    // Create new PaymentIntent (manual capture - charges only after admin approval)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(request.price * 100),
      currency: "usd",
      capture_method: "manual",
      metadata: {
        requestId: request._id.toString(),
        venueId: request.venueId?.toString() || "direct"
      }
    });

    console.log("✅ PaymentIntent created for venue request:", paymentIntent.id);

    // Update request with payment intent ID
    await Request.findByIdAndUpdate(requestId, {
      paymentIntentId: paymentIntent.id,
      paymentStatus: "pending"
    });

    // Create payment record for tracking
    await Payment.create({
      requestId: request._id,
      venueId: request.venueId || null,
      stripePaymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: "pending"
    });

    res.json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (err) {
    console.error("Create PaymentIntent error:", err);
    res.status(500).json({ error: "Failed to create payment intent" });
  }
}

/* -------------------- CREATE PAYMENT INTENT (Original - for backwards compatibility) -------------------- */
async function createPaymentIntent(req, res) {
  try {
    const { requestId } = req.body;

    const request = await Request.findById(requestId);
    if (!request) return res.status(404).json({ error: "Request not found" });

    // Prevent duplicate intents
    const existingPayment = await Payment.findOne({
      requestId: request._id,
      status: { $in: ["pending", "authorized"] }
    });

    if (existingPayment) {
      const intent = await stripe.paymentIntents.retrieve(existingPayment.stripePaymentIntentId);
      return res.json({ clientSecret: intent.client_secret });
    }

    // Create PaymentIntent (manual capture)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(request.price * 100),
      currency: "usd",
      capture_method: "manual",
      metadata: { requestId: request._id.toString() }
    });

    console.log("PaymentIntent created:", paymentIntent);

    await Payment.create({
      requestId: request._id,
      stripePaymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: "pending"
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("Create PaymentIntent error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

/* -------------------- GET PAYMENT STATUS -------------------- */
async function getPaymentStatus(req, res) {
  try {
    const { requestId } = req.params;

    const request = await Request.findById(requestId);
    if (!request) return res.status(404).json({ error: "Request not found" });

    const payment = await Payment.findOne({ requestId });

    res.json({
      paymentStatus: request.paymentStatus,
      paidAmount: request.paidAmount,
      paidAt: request.paidAt,
      stripePaymentIntentId: payment?.stripePaymentIntentId || null
    });
  } catch (err) {
    console.error("Get payment status error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = { createPaymentIntent, createVenuePaymentIntent, getPaymentStatus };
