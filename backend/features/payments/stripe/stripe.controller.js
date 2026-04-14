const Stripe = require("stripe");
const Payment = require("../../../models/Payment");
const Request = require("../../../models/Request");
const Venue = require("../../../models/Venue");
const { createSplitTransfers } = require("./stripe.service");
const { pushToStack } = require("../../../services/stackService");

const DEMO_MODE = process.env.DEMO_MODE === "true" || !process.env.STRIPE_SECRET_KEY;
const stripe = !DEMO_MODE ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16"
}) : null;

async function handleWebhook(req, res) {
  // In demo mode, skip webhook signature validation
  if (DEMO_MODE) {
    console.log("🎪 Demo mode: Skipping Stripe webhook validation");
    return res.json({ received: true });
  }

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Stripe signature error:", err.message);
    return res.status(400).send("Invalid signature");
  }

  try {
    const obj = event.data.object;

    /* ========== CHECKOUT SESSION COMPLETED (LIVE MODE) ========== */
    if (event.type === "checkout.session.completed") {
      const requestId = obj.metadata?.requestId;
      const venueId = obj.metadata?.venueId;
      
      if (!requestId) return res.json({ received: true });

      console.log(`\n💳 [WEBHOOK] Checkout Session Completed: ${obj.id}`);

      // Prevent duplicate processing
      const existingPayment = await Payment.findOne({ stripeCheckoutSessionId: obj.id });
      if (existingPayment && (existingPayment.status === "paid" || existingPayment.status === "captured" || existingPayment.status === "authorized")) {
        console.log("⏭️ Payment already processed, skipping");
        return res.json({ received: true });
      }

      // Determine if this is DJ mode or LIVE mode FIRST
      const Venue = require("../../models/Venue");
      const venue = venueId ? await Venue.findById(venueId) : null;
      const isDJMode = venue?.djMode;
      
      console.log(`📍 Mode: ${isDJMode ? "DJ MODE 🎧" : "LIVE MODE 🎵"}`);

      // In DJ mode: Mark as "authorized" (funds held, NOT captured)
      // In LIVE mode: Mark as "captured" (funds charged immediately)
      const paymentStatus = isDJMode ? "authorized" : "captured";
      
      // Update Payment record
      const payment = await Payment.findOneAndUpdate(
        { stripeCheckoutSessionId: obj.id },
        { 
          status: paymentStatus,
          ...(isDJMode ? { authorizedAt: new Date() } : { paidAt: new Date(), capturedAmount: obj.amount_total / 100 }),
          amount: obj.amount_total / 100,
          lastStripeEventId: event.id,
          testMode: obj.livemode === false,  // True if test mode
          cardBrand: obj.payment_details?.card?.brand || null,
          cardLast4: obj.payment_details?.card?.last4 || null,
          customerId: obj.customer || null
        },
        { new: true }
      );
      
      // Update Request
      const requestUpdateData = { 
        checkoutSessionId: obj.id
      };
      
      // Only mark as captured in LIVE mode; DJ mode stays "pending_dj_approval"
      if (!isDJMode) {
        requestUpdateData.paymentStatus = "captured";
        requestUpdateData.paidAmount = obj.amount_total / 100;
        requestUpdateData.paidAt = new Date();
      } else {
        requestUpdateData.paymentStatus = "authorized";
      }
      
      const request = await Request.findByIdAndUpdate(requestId, requestUpdateData, { new: true });

      console.log(`✅ Checkout completed for request: ${requestId}`);
      console.log(`   Payment Status: ${paymentStatus.toUpperCase()}`);
      if (payment.testMode) console.log(`   🎪 TEST MODE payment`);
      if (payment.cardLast4) console.log(`   💳 Card: ${payment.cardBrand?.toUpperCase() || "Unknown"} •••• ${payment.cardLast4}`);

      // Only process transfers in LIVE mode
      // DJ mode transfers will be processed when DJ approves the request
      if (!isDJMode) {
        try {
          console.log(`💳 Processing LIVE mode splits...`);
          await createSplitTransfers(obj.id, obj.amount_total, venueId, "live");
          console.log(`✅ LIVE mode transfers completed`);
        } catch (transferErr) {
          console.warn("⚠️ Transfer failed but payment marked as paid:", transferErr.message);
        }
      } else {
        console.log(`⏳ DJ MODE: Waiting for DJ approval to capture payment and process transfers...`);
      }

      res.json({ received: true });
    }

    /* ========== PAYMENT INTENT AMOUNT CAPTURABLE (DJ MODE - AUTHORIZED) ========== */
    else if (event.type === "payment_intent.amount_capturable_updated") {
      const requestId = obj.metadata?.requestId;
      const venueId = obj.metadata?.venueId;
      
      if (!requestId) return res.json({ received: true });

      console.log(`\n💳 [WEBHOOK] Payment Authorized: ${obj.id}`);

      // Update Payment record
      await Payment.findOneAndUpdate(
        { stripePaymentIntentId: obj.id },
        { 
          status: "authorized", 
          authorizedAt: new Date(),
          amount: obj.amount / 100,
          lastStripeEventId: event.id, 
          rawWebhook: obj,
          testMode: obj.livemode === false,
          cardBrand: obj.charges?.data?.[0]?.payment_method_details?.card?.brand || null,
          cardLast4: obj.charges?.data?.[0]?.payment_method_details?.card?.last4 || null
        },
        { new: true }
      );
      
      // Update Request
      await Request.findByIdAndUpdate(requestId, { 
        paymentStatus: "authorized",
        paymentIntentId: obj.id
      });

      console.log(`✅ Payment authorized: ${requestId}`);
    }

    /* ========== PAYMENT INTENT SUCCEEDED (DJ MODE - CAPTURED) ========== */
    else if (event.type === "payment_intent.succeeded") {
      const requestId = obj.metadata?.requestId;
      const venueId = obj.metadata?.venueId;
      const mode = obj.metadata?.mode;
      
      if (!requestId) return res.json({ received: true });

      console.log(`\n💰 [WEBHOOK] Payment Succeeded: ${obj.id}`);

      // Prevent duplicate processing
      const existingPayment = await Payment.findOne({ stripePaymentIntentId: obj.id });
      if (existingPayment && existingPayment.status === "transferred") {
        console.log("⏭️ Transfers already processed, skipping");
        return res.json({ received: true });
      }

      // Update Payment record
      await Payment.findOneAndUpdate(
        { stripePaymentIntentId: obj.id },
        { 
          status: "captured", 
          capturedAt: new Date(),
          capturedAmount: obj.amount / 100,
          lastStripeEventId: event.id, 
          rawWebhook: obj,
          testMode: obj.livemode === false,
          cardBrand: obj.charges?.data?.[0]?.payment_method_details?.card?.brand || null,
          cardLast4: obj.charges?.data?.[0]?.payment_method_details?.card?.last4 || null,
          customerId: obj.customer || null
        },
        { new: true }
      );
      
      // Update Request
      const request = await Request.findByIdAndUpdate(requestId, { 
        paymentStatus: "captured",
        paidAmount: obj.amount / 100,
        paidAt: new Date(),
        paymentIntentId: obj.id
      }, { new: true });

      console.log(`✅ Payment captured: ${requestId}`);

      // Perform split transfers for DJ mode (DJ 44.44%, Venue 33.33%, Platform remainder)
      if (mode === "dj") {
        try {
          console.log(`💳 Processing DJ mode splits...`);
          await createSplitTransfers(obj.id, obj.amount, venueId, "dj");
          
          // Mark as transferred to prevent duplicates
          await Payment.findOneAndUpdate(
            { stripePaymentIntentId: obj.id },
            { status: "transferred" }
          );
          
          console.log(`✅ DJ mode transfers completed`);
        } catch (transferErr) {
          console.warn("⚠️ Transfer failed but payment marked as captured:", transferErr.message);
        }
      }

      res.json({ received: true });
    }

    /* ========== PAYMENT FAILED OR CANCELED ========== */
    else if (
      event.type === "payment_intent.payment_failed" ||
      event.type === "payment_intent.canceled"
    ) {
      const requestId = obj.metadata?.requestId;

      console.log(`\n🚫 [WEBHOOK] Payment ${event.type}: ${obj.id}`);

      // Update Payment record
      await Payment.findOneAndUpdate(
        { stripePaymentIntentId: obj.id },
        { 
          status: "failed", 
          failedAt: new Date(),
          lastStripeEventId: event.id, 
          rawWebhook: obj,
          testMode: obj.livemode === false,
          cardBrand: obj.charges?.data?.[0]?.payment_method_details?.card?.brand || null,
          cardLast4: obj.charges?.data?.[0]?.payment_method_details?.card?.last4 || null,
          declineCode: obj.charges?.data?.[0]?.failure_code || null,
          errorMessage: obj.last_payment_error?.message || null
        },
        { new: true }
      );
      
      if (requestId) {
        await Request.findByIdAndUpdate(requestId, { 
          paymentStatus: "failed",
          paymentIntentId: obj.id
        });
      }

      console.log(`❌ Payment failed/released: ${requestId}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error(`❌ Webhook error: ${err.message}`);
    res.status(500).send("Webhook error");
  }
}

/* ========== DEMO PAYMENT COMPLETION (Frontend triggered) ========== */
async function completeDemoPayment(req, res) {
  try {
    // Only available in DEMO_MODE
    if (!DEMO_MODE) {
      return res.status(400).json({ error: "This endpoint is only available in DEMO_MODE" });
    }

    const { requestId, checkoutSessionId, paymentIntentId } = req.body;

    if (!requestId && !checkoutSessionId && !paymentIntentId) {
      return res.status(400).json({ error: "requestId or checkoutSessionId or paymentIntentId required" });
    }

    console.log(`\n🎪 [DEMO] Completing payment...`);

    // Find Payment record
    let payment;
    if (requestId) {
      payment = await Payment.findOne({ requestId });
      console.log(`   By Request ID: ${requestId}`);
    } else if (checkoutSessionId) {
      payment = await Payment.findOne({ stripeCheckoutSessionId: checkoutSessionId });
      console.log(`   By Checkout: ${checkoutSessionId}`);
    } else if (paymentIntentId) {
      payment = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
      console.log(`   By Intent: ${paymentIntentId}`);
    }

    if (!payment) {
      return res.status(404).json({ error: "Payment record not found" });
    }

    const requestDoc = await Request.findById(payment.requestId);
    if (!requestDoc) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Determine if LIVE or DJ mode
    const isLiveMode = !!payment.stripeCheckoutSessionId;
    const modeType = isLiveMode ? "live" : "dj";

    console.log(`   Mode: ${modeType.toUpperCase()}`);

    // Update Payment status to "paid"
    await Payment.findByIdAndUpdate(payment._id, {
      status: "paid",
      paidAt: new Date(),
      capturedAmount: payment.amount
    });

    // Update Request payment status to "captured"
    const updatedRequest = await Request.findByIdAndUpdate(requestDoc._id, {
      paymentStatus: "captured",
      paidAmount: payment.amount,
      paidAt: new Date()
    }, { new: true });

    console.log(`✅ Payment marked as paid`);

    // Create split transfers (ONLY for LIVE mode, DJ mode waits for DJ approval)
    if (isLiveMode) {
      try {
        const amountCents = Math.round(payment.amount * 100);
        await createSplitTransfers(
          payment.stripePaymentIntentId || payment.stripeCheckoutSessionId,
          amountCents,
          payment.venueId,
          modeType
        );
        console.log(`✅ Split transfers created (LIVE mode)`);
      } catch (transferErr) {
        console.warn("⚠️ Transfer creation failed:", transferErr.message);
      }
    } else {
      console.log(`⏳ DJ mode: Transfers will be created when DJ approves`);
    }

    // ===== RE-QUEUE REQUEST FOR PROCESSING =====
    // After payment is confirmed, push request back to LIFO stack for processing
    if (isLiveMode && requestDoc.venueId) {
      try {
        console.log(`🔄 Re-queuing request to LIFO stack for processing...`);
        
        const stackData = {
          _id: requestDoc._id.toString(),
          title: requestDoc.title || requestDoc.songTitle,
          artist: requestDoc.artist || requestDoc.artistName,
          price: requestDoc.price,
          userId: requestDoc.userId,
          userName: requestDoc.userName,
          createdAt: requestDoc.createdAt,
          requestedAt: new Date(),
          checkoutSessionId: requestDoc.checkoutSessionId || null,
          paymentStatus: "captured"  // Mark as captured so worker processes it
        };
        
        await pushToStack(requestDoc.venueId.toString(), stackData);
        console.log(`✅ Request re-queued to LIFO stack`);
      } catch (queueErr) {
        console.warn("⚠️ Failed to re-queue request:", queueErr.message);
      }
    }

    res.json({
      success: true,
      message: "Demo payment completed",
      paymentId: payment._id,
      requestId: requestDoc._id,
      amount: payment.amount,
      mode: modeType
    });
  } catch (err) {
    console.error("Complete demo payment error:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
}

/**
 * Verify Stripe Checkout Session
 * Called when customer is redirected back from Stripe checkout
 * Verifies payment and completes the request
 */
async function verifyCheckout(req, res) {
  try {
    const { sessionId } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({ error: "sessionId query parameter required" });
    }

    console.log(`\n🔐 VERIFY CHECKOUT REQUEST - Session: ${sessionId}`);

    const { verifyCheckoutSession } = require("./stripe.verification");
    const result = await verifyCheckoutSession(sessionId);

    if (!result.success) {
      console.warn(`⚠️  Verification failed:`, result.message);
      return res.status(400).json(result);
    }

    console.log(`✅ VERIFICATION SUCCESSFUL - Returning to frontend`);
    res.json({
      success: true,
      requestId: result.requestId,
      venueId: result.venueId,
      status: result.status,
      amount: result.amount,
      message: result.message
    });

  } catch (err) {
    console.error("Verify checkout error:", err);
    res.status(500).json({ error: "Internal server error", details: err.message });
  }
}

module.exports = { handleWebhook, completeDemoPayment, verifyCheckout };
