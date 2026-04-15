const Stripe = require("stripe");
const Payment = require("../../../models/Payment");
const Request = require("../../../models/Request");
const Venue = require("../../../models/Venue");
const User = require("../../../models/User");
const couponService = require("../../../services/couponService");
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

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🔔 STRIPE WEBHOOK RECEIVED`);
  console.log(`   Signature present: ${sig ? "✅" : "❌"}`);
  console.log(`${'═'.repeat(70)}`);

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log(`✅ Webhook signature verified`);
    console.log(`   Event type: ${event.type}`);
    console.log(`   Event ID: ${event.id}`);
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
      
      console.log(`\n═══════════════════════════════════════════════════════`);
      console.log(`💳 [WEBHOOK] Checkout Session Completed: ${obj.id}`);
      console.log(`   Request ID: ${requestId}`);
      console.log(`   Venue ID: ${venueId}`);
      console.log(`═══════════════════════════════════════════════════════`);

      if (!requestId) {
        console.log("⚠️ No requestId in metadata, skipping webhook");
        return res.json({ received: true });
      }

      // Prevent duplicate processing
      const existingPayment = await Payment.findOne({ stripeCheckoutSessionId: obj.id });
      if (existingPayment && (existingPayment.status === "paid" || existingPayment.status === "captured" || existingPayment.status === "authorized")) {
        console.log("⏭️ Payment already processed, skipping");
        return res.json({ received: true });
      }

      // Fetch request first  
      const request = await Request.findById(requestId);
      if (!request) {
        console.error(`❌ Request not found: ${requestId}`);
        return res.json({ received: true });
      }
      console.log(`✅ Request found: ${request.songTitle || request.title}`);

      // Determine if this is DJ mode or LIVE mode
      const venue = venueId && venueId !== "direct" ? await Venue.findById(venueId) : null;
      const isDJMode = venue?.djMode === true;
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
          testMode: obj.livemode === false,
          cardBrand: obj.payment_details?.card?.brand || null,
          cardLast4: obj.payment_details?.card?.last4 || null,
          customerId: obj.customer || null
        },
        { new: true }
      );
      
      if (!payment) {
        console.error(`❌ Payment record not found or failed to update`);
        return res.json({ received: true });
      }
      console.log(`✅ Payment updated - Status: ${paymentStatus}`);
      
      // Update Request
      const requestUpdateData = { 
        checkoutSessionId: obj.id
      };
      
      if (!isDJMode) {
        requestUpdateData.paymentStatus = "captured";
        requestUpdateData.paidAmount = obj.amount_total / 100;
        requestUpdateData.paidAt = new Date();
      } else {
        requestUpdateData.paymentStatus = "authorized";
      }
      
      await Request.findByIdAndUpdate(requestId, requestUpdateData, { new: true });
      console.log(`✅ Request updated`);

      // Only process transfers in LIVE mode
      if (!isDJMode) {
        try {
          console.log(`💳 Processing LIVE mode splits...`);
          await createSplitTransfers(obj.id, obj.amount_total, venueId, "live");
          console.log(`✅ LIVE mode transfers completed`);
        } catch (transferErr) {
          console.warn("⚠️ Transfer failed but payment marked as paid:", transferErr.message);
        }

        // ===== GENERATE & SEND COUPON TO USER (LIVE MODE) =====
        console.log(`\n🎁 COUPON GENERATION CHECK - LIVE MODE`);
        
        // Only generate coupon if they DIDN'T use a coupon as discount
        if (request.appliedCoupon) {
          console.log(`⚠️  Request already has applied coupon, skipping reward coupon generation`);
          console.log(`   Applied Coupon: ${request.appliedCoupon}`);
          console.log(`   Discount Amount: £${request.couponDiscountAmount || 0}`);
        } else {
          console.log(`✅ No coupon was used - Eligible for reward coupon`);
          try {
            // Fetch request with populated user
            console.log(`   Fetching request with userId population...`);
            const requestWithUser = await Request.findById(requestId).populate("userId");
            
            if (!requestWithUser) {
              console.error(`❌ Request not found when fetching for coupon`);
              return res.json({ received: true });
            }

            if (!requestWithUser.userId) {
              console.error(`❌ Request has no userId populated`);
              console.log(`   Request data:`, {
                _id: requestWithUser._id,
                title: requestWithUser.title,
                userId: requestWithUser.userId,
                userName: requestWithUser.userName,
                email: requestWithUser.email
              });
              return res.json({ received: true });
            }

            const user = requestWithUser.userId;
            console.log(`✅ User found: ${user.email}`);
            console.log(`   Payment Status: ${payment.status}`);
            console.log(`   Payment Amount: £${payment.amount}`);
            
            // Generate coupon
            console.log(`   Calling generateAndSendCoupon...`);
            const couponResult = await couponService.generateAndSendCoupon(payment, user, requestWithUser);
            
            if (couponResult) {
              console.log(`✅ Coupon successfully generated - Code: ${couponResult.code}`);
            } else {
              console.warn(`⚠️ Coupon generation returned null`);
            }
          } catch (couponErr) {
            console.error(`❌ Coupon generation exception: ${couponErr.message}`);
            console.error(`   Stack:`, couponErr.stack);
          }
        }
      } else {
        console.log(`⏳ DJ MODE: Waiting for DJ approval to capture payment and process transfers...`);
      }

      console.log(`═══════════════════════════════════════════════════════\n`);
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

    // ===== GENERATE & SEND COUPON =====
    console.log(`\n🎁 Generating coupon...`);
    try {
      const requestWithUser = await Request.findById(payment.requestId).populate("userId");
      if (requestWithUser && requestWithUser.userId) {
        const user = requestWithUser.userId;
        console.log(`   User: ${user.email}`);
        console.log(`   Payment Status: ${payment.status}`);
        console.log(`   Amount: £${payment.amount}`);
        
        await couponService.generateAndSendCoupon(payment, user, requestWithUser);
        console.log(`✅ Coupon sent to ${user.email}`);
      } else {
        console.log(`⚠️ Could not fetch user for coupon generation`);
      }
    } catch (couponErr) {
      console.error(`⚠️ Coupon generation failed:`, couponErr.message);
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
