const Stripe = require("stripe");
const Payment = require("../../../models/Payment");

const DEMO_MODE = process.env.DEMO_MODE === "true" || !process.env.STRIPE_SECRET_KEY;
const stripe = !DEMO_MODE ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16"
}) : null;

/**
 * Create checkout session for LIVE mode
 * @returns { checkoutSessionId, url }
 */
async function createCheckoutSession(request, venueId) {
  if (DEMO_MODE) {
    console.log("🎪 DEMO: Mock checkout session");
    return {
      checkoutSessionId: `cs_demo_${Date.now()}`,
      url: `${process.env.CLIENT_URL || "http://localhost:3000"}/checkout/demo/${request._id}`
    };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `Stream Request: ${request.title || request.songTitle}`,
              description: `${request.artistName || request.artist}`
            },
            unit_amount: Math.round(request.price * 100)
          },
          quantity: 1
        }
      ],
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      metadata: {
        requestId: request._id.toString(),
        venueId: venueId?.toString() || "direct"
      }
    });

    // Create Payment record
    await Payment.create({
      requestId: request._id,
      venueId: venueId || null,
      stripeCheckoutSessionId: session.id,
      amount: request.price,  // Store in POUNDS for consistency (not cents!)
      currency: "gbp",
      status: "pending"
    });

    console.log(`✅ Checkout session created: ${session.id}`);
    console.log(`   Amount in DB: £${request.price}`);
    console.log(`   Amount to Stripe: ${Math.round(request.price * 100)} cents`);

    return {
      checkoutSessionId: session.id,
      url: session.url
    };
  } catch (err) {
    console.error("❌ Checkout session error:", err.message);
    throw err;
  }
}

/**
 * Create Checkout Session for DJ mode (manual capture, redirects to Stripe)
 */
async function createCheckoutSessionDJ(request, venueId) {
  if (DEMO_MODE) {
    console.log("🎪 DEMO: Mock DJ checkout session");
    return {
      checkoutSessionId: `cs_demo_dj_${Date.now()}`,
      url: `${process.env.CLIENT_URL || "http://localhost:3000"}/success?session_id=cs_demo_dj_${Date.now()}`
    };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `DJ Request: ${request.title || request.songTitle}`,
              description: `${request.artistName || request.artist} (Awaiting DJ approval)`
            },
            unit_amount: Math.round(request.price * 100)
          },
          quantity: 1
        }
      ],
      payment_intent_data: {
        capture_method: "manual",
        metadata: {
          requestId: request._id.toString(),
          venueId: venueId?.toString() || "direct",
          mode: "dj"
        }
      },
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/cancel`,
      metadata: {
        requestId: request._id.toString(),
        venueId: venueId?.toString() || "direct",
        mode: "dj"
      }
    });

    // Create Payment record
    await Payment.create({
      requestId: request._id,
      venueId: venueId || null,
      stripeCheckoutSessionId: session.id,
      amount: request.price,  // Store in POUNDS for consistency
      currency: "gbp",
      status: "pending"
    });

    console.log(`✅ DJ Checkout session created: ${session.id}`);
    console.log(`   Amount in DB: £${request.price}`);
    console.log(`   Amount to Stripe: ${Math.round(request.price * 100)} cents`);
    console.log(`   Capture Method: MANUAL (DJ approval required)`);

    return {
      checkoutSessionId: session.id,
      url: session.url
    };
  } catch (err) {
    console.error("❌ DJ Checkout session error:", err.message);
    throw err;
  }
}

/**
 * Create PaymentIntent for DJ mode (manual capture)
 */
async function createPaymentIntentDJ(request, venueId) {
  if (DEMO_MODE) {
    console.log("🎪 DEMO: Mock PaymentIntent");
    return {
      paymentIntentId: `pi_demo_${Date.now()}`,
      clientSecret: `pi_demo_${Date.now()}_secret_demo`
    };
  }

  try {
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(request.price * 100),
      currency: "gbp",
      capture_method: "manual",
      metadata: {
        requestId: request._id.toString(),
        venueId: venueId?.toString() || "direct",
        mode: "dj"
      }
    });

    // Create Payment record
    await Payment.create({
      requestId: request._id,
      venueId: venueId || null,
      stripePaymentIntentId: intent.id,
      amount: request.price,  // Store in POUNDS for consistency (not cents!)
      currency: "gbp",
      status: "pending"
    });

    console.log(`✅ PaymentIntent created: ${intent.id}`);
    console.log(`   Amount in DB: £${request.price}`);
    console.log(`   Amount to Stripe: ${Math.round(request.price * 100)} cents`);

    return {
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret
    };
  } catch (err) {
    console.error("❌ PaymentIntent creation error:", err.message);
    throw err;
  }
}

/**
 * Capture PaymentIntent (DJ accept)
 * @param {string} paymentIntentId - Stripe PaymentIntent ID
 * @param {string} checkoutSessionId - Optional: Checkout Session ID for DJ mode with sessions
 */
async function capturePayment(paymentIntentId, checkoutSessionId) {
  if (DEMO_MODE) {
    console.log("🎪 DEMO: Mock capture");
    return { success: true };
  }

  try {
    console.log(`💳 Capturing PaymentIntent: ${paymentIntentId}`);
    if (checkoutSessionId) {
      console.log(`   (from Checkout Session: ${checkoutSessionId})`);
    }
    
    const captured = await stripe.paymentIntents.capture(paymentIntentId, {
      idempotencyKey: `capture_${paymentIntentId}_${Date.now()}`
    });

    // Fetch payment record - try both PaymentIntent ID and Checkout Session ID
    let payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
    
    if (!payment && checkoutSessionId) {
      console.log(`   PaymentIntent lookup failed, trying Checkout Session lookup...`);
      payment = await Payment.findOne({ stripeCheckoutSessionId: checkoutSessionId });
    }
    
    if (!payment) {
      console.warn(`⚠️  Warning: Payment record not found for capture`);
      return { success: true, paymentIntent: captured };
    }
    
    const capturedAmount = payment.amount || 0;
    
    console.log(`   Updating Payment record: ${payment._id}`);
    console.log(`   Status: authorized → captured`);
    console.log(`   Amount: £${capturedAmount}`);

    // Update Payment record with status, timestamp, and captured amount
    const updatedPayment = await Payment.findByIdAndUpdate(
      payment._id,
      { 
        status: "captured",
        capturedAt: new Date(),
        capturedAmount: capturedAmount
      },
      { new: true }
    );

    console.log(`✅ PaymentIntent captured: ${paymentIntentId}, Amount: £${capturedAmount}`);
    console.log(`✅ Payment record updated: ${updatedPayment._id}`);
    return { success: true, paymentIntent: captured, payment: updatedPayment };
  } catch (err) {
    console.error("❌ Capture error:", err.message);
    throw err;
  }
}

/**
 * Cancel PaymentIntent (DJ reject)
 * @param {string} paymentIntentId - Stripe PaymentIntent ID
 * @param {string} checkoutSessionId - Optional: Checkout Session ID for DJ mode with sessions
 */
async function cancelPayment(paymentIntentId, checkoutSessionId) {
  if (DEMO_MODE) {
    console.log("🎪 DEMO: Mock cancel");
    return { success: true };
  }

  try {
    console.log(`❌ Cancelling PaymentIntent: ${paymentIntentId}`);
    if (checkoutSessionId) {
      console.log(`   (from Checkout Session: ${checkoutSessionId})`);
    }
    
    const cancelled = await stripe.paymentIntents.cancel(paymentIntentId, {
      idempotencyKey: `cancel_${paymentIntentId}_${Date.now()}`
    });

    // Update Payment record - try both PaymentIntent ID and Checkout Session ID
    let payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
    
    if (!payment && checkoutSessionId) {
      console.log(`   PaymentIntent lookup failed, trying Checkout Session lookup...`);
      payment = await Payment.findOne({ stripeCheckoutSessionId: checkoutSessionId });
    }
    
    if (!payment) {
      console.warn(`⚠️  Warning: Payment record not found for cancel`);
      return { success: true, paymentIntent: cancelled };
    }
    
    console.log(`   Updating Payment record: ${payment._id}`);
    console.log(`   Status: authorized → cancelled`);

    // Update Payment record - clear captured amount and transfers
    const updatedPayment = await Payment.findByIdAndUpdate(
      payment._id,
      { 
        status: "cancelled",
        capturedAmount: 0,
        transfers: [],
        cancelledAt: new Date()
      },
      { new: true }
    );

    console.log(`✅ PaymentIntent cancelled: ${paymentIntentId}`);
    console.log(`✅ Payment record updated: ${updatedPayment._id}`);
    return { success: true, paymentIntent: cancelled, payment: updatedPayment };
  } catch (err) {
    console.error("❌ Cancel error:", err.message);
    throw err;
  }
}

/**
 * Create split transfers (after payment captured)
 */
async function createSplitTransfers(paymentIntentId, amountCents, venueId, mode = "dj") {
  if (DEMO_MODE) {
    console.log("🎪 DEMO: Mock transfers");
    
    // Create mock transfer data for DEMO mode
    let mockTransfers = [];
    
    if (mode === "dj") {
      // DJ MODE: DJ 44.44%, Venue 33.33%, Platform remainder
      const djAmount = Math.floor(amountCents * 0.4444);
      const venueAmount = Math.floor(amountCents * 0.3333);
      
      mockTransfers = [
        { type: "dj", amount: djAmount / 100, transferId: `tr_demo_dj_${Date.now()}` },
        { type: "venue", amount: venueAmount / 100, transferId: `tr_demo_venue_${Date.now()}` }
      ];
      
      console.log(`✅ DEMO DJ splits: DJ £${(djAmount / 100).toFixed(2)}, Venue £${(venueAmount / 100).toFixed(2)}`);
    } else if (mode === "live") {
      // LIVE MODE: Venue 60%, Platform 40%
      const venueAmount = Math.floor(amountCents * 0.6);
      
      mockTransfers = [
        { type: "venue", amount: venueAmount / 100, transferId: `tr_demo_venue_${Date.now()}` }
      ];
      
      console.log(`✅ DEMO LIVE splits: Venue £${(venueAmount / 100).toFixed(2)}`);
    }
    
    // Update Payment record with mock transfer data
    // For LIVE mode, paymentIntentId is actually checkoutSessionId
    try {
      let query;
      if (mode === "live") {
        query = { stripeCheckoutSessionId: paymentIntentId };
      } else {
        query = { stripePaymentIntentId: paymentIntentId };
      }
      
      const result = await Payment.findOneAndUpdate(
        query,
        { 
          transfers: mockTransfers,
          transfersCreatedAt: new Date()
        },
        { new: true }
      );
      
      if (result) {
        console.log(`✅ Payment record updated with transfers`);
      } else {
        console.warn(`⚠️ Payment not found with query:`, query);
      }
    } catch (updateErr) {
      console.warn("⚠️ Failed to update Payment with transfers:", updateErr.message);
    }
    
    return { success: true, transfers: mockTransfers };
  }

  if (!stripe) {
    console.warn("⚠️ Stripe not configured, skipping transfers");
    return { success: false, transfers: [] };
  }

  try {
    const transfers = [];

    if (mode === "dj") {
      // DJ MODE: DJ 44.44%, Venue 33.33%, Platform remainder
      const djAmount = Math.floor(amountCents * 0.4444);
      const venueAmount = Math.floor(amountCents * 0.3333);
      const platformAmount = amountCents - djAmount - venueAmount;

      // DJ transfer
      if (process.env.STRIPE_DJ_ACCOUNT_ID) {
        const djTransfer = await stripe.transfers.create({
          amount: djAmount,
          currency: "gbp",
          destination: process.env.STRIPE_DJ_ACCOUNT_ID,
          metadata: {
            paymentIntentId,
            venueId: venueId?.toString(),
            type: "dj_split"
          }
        });
        transfers.push({ type: "dj", amount: djAmount / 100, transferId: djTransfer.id });
        console.log(`✅ DJ transfer: £${(djAmount / 100).toFixed(2)}`);
      }

      // Venue transfer
      if (process.env.STRIPE_VENUE_ACCOUNT_ID) {
        const venueTransfer = await stripe.transfers.create({
          amount: venueAmount,
          currency: "gbp",
          destination: process.env.STRIPE_VENUE_ACCOUNT_ID,
          metadata: {
            paymentIntentId,
            venueId: venueId?.toString(),
            type: "venue_split"
          }
        });
        transfers.push({ type: "venue", amount: venueAmount / 100, transferId: venueTransfer.id });
        console.log(`✅ Venue transfer: £${(venueAmount / 100).toFixed(2)}`);
      }

      console.log(`✅ DJ Mode splits complete. Platform keeps: £${(platformAmount / 100).toFixed(2)}`);
    } else if (mode === "live") {
      // LIVE MODE: Venue 60%, Platform 40%
      const venueAmount = Math.floor(amountCents * 0.6);
      const platformAmount = amountCents - venueAmount;

      if (process.env.STRIPE_VENUE_ACCOUNT_ID) {
        const venueTransfer = await stripe.transfers.create({
          amount: venueAmount,
          currency: "gbp",
          destination: process.env.STRIPE_VENUE_ACCOUNT_ID,
          metadata: {
            paymentIntentId,
            venueId: venueId?.toString(),
            type: "venue_split"
          }
        });
        transfers.push({ type: "venue", amount: venueAmount / 100, transferId: venueTransfer.id });
        console.log(`✅ Venue transfer: £${(venueAmount / 100).toFixed(2)}`);
      }

      console.log(`✅ Live Mode splits complete. Platform keeps: £${(platformAmount / 100).toFixed(2)}`);
    }

    // Update Payment record with transfer info
    // For LIVE mode, paymentIntentId is actually checkoutSessionId
    let query;
    if (mode === "live") {
      query = { stripeCheckoutSessionId: paymentIntentId };
    } else {
      query = { stripePaymentIntentId: paymentIntentId };
    }
    
    await Payment.findOneAndUpdate(
      query,
      { 
        transfers: transfers,
        transfersCreatedAt: new Date()
      }
    );

    return { success: true, transfers };
  } catch (err) {
    console.error("❌ Transfer error:", err.message);
    throw err;
  }
}

module.exports = {
  createCheckoutSession,
  createCheckoutSessionDJ,
  createPaymentIntentDJ,
  capturePayment,
  cancelPayment,
  createSplitTransfers,
  stripe,
  DEMO_MODE
};
