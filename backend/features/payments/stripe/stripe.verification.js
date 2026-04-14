/**
 * Stripe Session Verification
 * Handles verification of completed checkout sessions and marks payments as complete
 */

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Request = require("../../../models/Request");
const Payment = require("../../../models/Payment");
const { createSplitTransfers } = require("./stripe.service");
const { pushToStack } = require("../../../services/stackService");

/**
 * Verify a Stripe checkout session and complete the payment
 * This is called when user is redirected back from Stripe checkout
 */
async function verifyCheckoutSession(checkoutSessionId) {
  try {
    console.log(`\n🔍 VERIFYING STRIPE CHECKOUT SESSION: ${checkoutSessionId}`);

    // Fetch the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
    
    console.log(`   Session Status: ${session.payment_status}`);
    console.log(`   Session State: ${session.status}`);
    console.log(`   Customer Email: ${session.customer_details?.email}`);

    // Find the request by checkout session ID
    const request = await Request.findOne({ checkoutSessionId: checkoutSessionId });
    if (!request) {
      console.error(`❌ No request found for session: ${checkoutSessionId}`);
      return {
        success: false,
        message: "Request not found"
      };
    }

    console.log(`✅ Found request: ${request._id}`);

    // Check if this is DJ mode (manual capture) or LIVE mode (immediate capture)
    const Venue = require("../../../models/Venue");
    const venue = request.venueId ? await Venue.findById(request.venueId) : null;
    const isDJMode = venue?.djMode;
    
    console.log(`📍 Mode: ${isDJMode ? "DJ MODE 🎧 (manual capture)" : "LIVE MODE 🎵 (immediate capture)"}`);
    console.log(`   Request.venueId: ${request.venueId || "UNDEFINED"}`);
    console.log(`   Request.venueId type: ${typeof request.venueId}`);
    console.log(`   Request.venueId string: ${request.venueId?.toString() || "null/undefined"}`);
    console.log(`   Venue found: ${venue ? venue.name : "NOT FOUND"}`);

    // For DJ mode with manual capture, check PaymentIntent status
    let isPaymentReady = false;
    
    if (isDJMode && session.payment_intent) {
      console.log(`   Checking PaymentIntent for DJ mode: ${session.payment_intent}`);
      const intent = await stripe.paymentIntents.retrieve(session.payment_intent);
      console.log(`   PaymentIntent Status: ${intent.status}`);
      
      // Payment is ready if it's in "requires_capture" state (authorized, waiting for capture)
      if (intent.status === "requires_capture") {
        console.log(`✅ Payment AUTHORIZED (funds held, waiting for DJ approval)`);
        isPaymentReady = true;
      } else {
        console.warn(`⚠️  PaymentIntent status is "${intent.status}", expected "requires_capture" for DJ mode`);
        return {
          success: false,
          status: intent.status,
          message: "Payment not yet authorized"
        };
      }
    } else if (!isDJMode) {
      // For LIVE mode, payment must be fully paid
      if (session.payment_status === "paid") {
        console.log(`✅ Payment PAID (funds captured immediately)`);
        isPaymentReady = true;
      } else if (session.status === "open") {
        // Session is still open (checkout not completed)
        console.warn(`⚠️  Session still open (checkout not completed) - status: "${session.payment_status}"`);
        console.warn(`   User may still be on the Stripe checkout page or abandoned checkout`);
        return {
          success: false,
          status: session.payment_status,
          sessionState: session.status,
          message: "Checkout not yet completed - waiting for user to complete payment"
        };
      } else if (session.status === "expired") {
        console.error(`❌ Session EXPIRED - Checkout link has expired`);
        return {
          success: false,
          status: session.payment_status,
          sessionState: session.status,
          message: "Checkout session expired - user needs to create a new payment"
        };
      } else {
        console.warn(`⚠️  Session payment status is "${session.payment_status}", not "paid"`);
        console.warn(`   Session state: ${session.status}`);
        return {
          success: false,
          status: session.payment_status,
          sessionState: session.status,
          message: "Payment not completed"
        };
      }
    }

    if (!isPaymentReady) {
      console.warn(`⚠️  Verification failed: Payment not ready`);
      return {
        success: false,
        message: "Payment not ready for verification"
      };
    }

    // Update payment status
    const payment = await Payment.findOne({ stripeCheckoutSessionId: checkoutSessionId });
    if (!payment) {
      console.warn(`⚠️  No payment record found for session: ${checkoutSessionId}`);
      return {
        success: false,
        message: "Payment record not found"
      };
    }

    console.log(`✅ Found payment: ${payment._id}`);
    console.log(`   Type: ${payment.constructor.name}`);
    console.log(`   Current status: ${payment.status}`);
    console.log(`   Current capturedAmount: £${payment.capturedAmount}`);
    console.log(`   Amount: £${payment.amount}`);
    console.log(`   DB Version: ${payment.__v}`);

    // Idempotency check: If already processed, still ensure Request is updated
    if ((isDJMode && payment.status === "authorized") || (!isDJMode && payment.status === "captured")) {
      console.log(`ℹ️  Payment already verified on ${payment.paidAt || payment.authorizedAt}`);
      
      // IMPORTANT: Even if payment is already verified, ensure Request is also updated
      // This handles cases where verification was called but Request wasn't updated yet
      const expectedRequestStatus = isDJMode ? "authorized" : "captured";
      if (request.paymentStatus !== expectedRequestStatus) {
        console.log(`   ⚠️  Request paymentStatus mismatch: ${request.paymentStatus} vs ${expectedRequestStatus}`);
        console.log(`   Updating Request to match Payment status...`);
        
        const requestUpdateData = isDJMode
          ? { paymentStatus: "authorized", checkoutSessionId: checkoutSessionId }
          : { paymentStatus: "captured", paidAmount: payment.amount, paidAt: new Date(), checkoutSessionId: checkoutSessionId };
        
        await Request.findByIdAndUpdate(request._id, requestUpdateData, { new: true });
        console.log(`   ✅ Request updated to match Payment status`);
      }
      
      console.log(`\n📍 IDEMPOTENCY CHECK RESPONSE:`);
      console.log(`   Request has venueId: ${!!request.venueId}`);
      console.log(`   VenueId value: ${request.venueId || "null/undefined"}`);
      console.log(`   VenueId instanceof ObjectId: ${request.venueId ? request.venueId instanceof require('mongoose').Types.ObjectId : false}`);
      
      return {
        success: true,
        requestId: request._id.toString(),
        venueId: request.venueId ? request.venueId.toString() : null,
        status: payment.status,
        amount: payment.amount,
        message: "Payment already verified",
        isDJMode: isDJMode
      };
    }

    // Get customer card details from session
    const cardBrand = session.payment_method_details?.card?.wallet === null 
      ? session.payment_method_details?.card?.brand 
      : "wallet";
    const cardLast4 = session.payment_method_details?.card?.last4;

    console.log(`💳 Card: ${cardBrand} ***${cardLast4}`);

    // Update payment record based on mode
    console.log(`\n📝 UPDATING PAYMENT RECORD`);
    console.log(`   Payment._id: ${payment._id.toString()}`);
    console.log(`   Mode: ${isDJMode ? "DJ (authorized)" : "LIVE (captured)"}`);
    
    const updateData = isDJMode 
      ? {
          status: "authorized",
          authorizedAt: new Date(),
          cardBrand: cardBrand || "unknown",
          cardLast4: cardLast4 || "****"
        }
      : {
          status: "captured",
          paidAt: new Date(),
          capturedAmount: payment.amount,
          cardBrand: cardBrand || "unknown",
          cardLast4: cardLast4 || "****"
        };
    
    let updatedPayment;
    try {
      console.log(`   Executing: Payment.findByIdAndUpdate(...)`);
      const fullUpdateData = {
        ...updateData,
        testMode: session.livemode === false
      };
      updatedPayment = await Payment.findByIdAndUpdate(
        payment._id, 
        fullUpdateData,
        { new: true, runValidators: false }
      );
      console.log(`   findByIdAndUpdate returned:`, updatedPayment ? "DOCUMENT" : "NULL");
    } catch (updateErr) {
      console.error(`❌ Error during findByIdAndUpdate:`, updateErr.message);
      throw updateErr;
    }

    if (!updatedPayment) {
      console.error(`❌ CRITICAL: Payment.findByIdAndUpdate returned NULL`);
      console.error(`   This means the Payment with ID ${payment._id} was not found during update`);
      
      // Try fallback: direct update with updateOne
      console.log(`\n🔄 Trying fallback: Payment.updateOne()`);
      try {
        const updateResult = await Payment.updateOne(
          { _id: payment._id },
          {
            ...updateData,
            testMode: session.livemode === false
          }
        );
        console.log(`   updateOne result:`, updateResult);
        console.log(`   Matched: ${updateResult.matchedCount}, Modified: ${updateResult.modifiedCount}`);
        
        if (updateResult.modifiedCount === 0) {
          console.error(`❌ updateOne also failed to modify document`);
          throw new Error("Both findByIdAndUpdate and updateOne failed to update Payment");
        }
      } catch (fallbackErr) {
        console.error(`❌ Fallback updateOne also failed:`, fallbackErr.message);
        throw fallbackErr;
      }
    }

    console.log(`✅ Payment updated successfully`);
    if (updatedPayment) {
      console.log(`   Status: ${updatedPayment.status}`);
      console.log(`   Authorized/Captured: £${updatedPayment.capturedAmount || updatedPayment.amount}`);
      console.log(`   Updated at: ${updatedPayment.updatedAt}`);
    }

    // Update request status based on mode
    console.log(`\n📝 UPDATING REQUEST RECORD`);
    console.log(`   Request._id: ${request._id.toString()}`);
    
    const requestUpdateData = isDJMode
      ? {
          paymentStatus: "authorized",
          checkoutSessionId: checkoutSessionId
        }
      : {
          paymentStatus: "captured",
          paidAmount: payment.amount,  // Already in pounds
          paidAt: new Date(),
          checkoutSessionId: checkoutSessionId
        };
    
    console.log(`   Setting paymentStatus: "${isDJMode ? "authorized" : "captured"}"`);
    if (!isDJMode) {
      console.log(`   Setting paidAmount: £${payment.amount} (POUNDS, not cents)`);
    }
    
    let updatedRequest;
    try {
      updatedRequest = await Request.findByIdAndUpdate(
        request._id, 
        requestUpdateData, 
        { new: true, runValidators: false }
      );
      console.log(`   findByIdAndUpdate returned:`, updatedRequest ? "DOCUMENT" : "NULL");
    } catch (updateErr) {
      console.error(`❌ Error during Request findByIdAndUpdate:`, updateErr.message);
      throw updateErr;
    }

    if (!updatedRequest) {
      console.error(`❌ CRITICAL: Request.findByIdAndUpdate returned NULL`);
      
      // Try fallback
      console.log(`🔄 Trying fallback: Request.updateOne()`);
      try {
        const updateResult = await Request.updateOne(
          { _id: request._id },
          requestUpdateData
        );
        console.log(`   updateOne result: matched=${updateResult.matchedCount}, modified=${updateResult.modifiedCount}`);
        
        if (updateResult.modifiedCount === 0) {
          throw new Error("Request updateOne failed to modify document");
        }
      } catch (fallbackErr) {
        console.error(`❌ Fallback also failed:`, fallbackErr.message);
        throw fallbackErr;
      }
    }

    console.log(`✅ Request updated successfully`);
    if (updatedRequest) {
      console.log(`   paymentStatus: ${updatedRequest.paymentStatus}`);
      if (!isDJMode) {
        console.log(`   paidAmount: £${updatedRequest.paidAmount}`);
        console.log(`   paidAt: ${updatedRequest.paidAt}`);
      }
      console.log(`   Updated at: ${updatedRequest.updatedAt}`);
    }

    // Only process transfers for LIVE mode
    // DJ mode transfers will be processed when DJ approves the request
    if (!isDJMode) {
      console.log(`\n💳 PROCESSING LIVE MODE TRANSFERS`);
      try {
        const amountCents = session.amount_total;  // Already in cents
        await createSplitTransfers(checkoutSessionId, amountCents, request.venueId, "live");
        console.log(`✅ LIVE mode transfers completed`);
      } catch (transferErr) {
        console.warn("⚠️ Transfer failed but payment marked as paid:", transferErr.message);
      }
    } else {
      console.log(`⏳ DJ MODE: Transfers will be processed when DJ approves the request`);
    }

    // Verify the updates actually persisted (defensive check)
    console.log(`\n🔍 VERIFICATION CHECK - Re-fetching from DB to confirm persistence...`);
    // Verify the updates actually persisted (defensive check)
    const verifyPayment = await Payment.findById(payment._id);
    const verifyRequest = await Request.findById(request._id);
    
    const expectedPaymentStatus = isDJMode ? "authorized" : "captured";
    const expectedRequestStatus = isDJMode ? "authorized" : "captured";
    
    if (!verifyPayment || verifyPayment.status !== expectedPaymentStatus) {
      console.error(`❌ CRITICAL: Payment update did NOT persist!`);
      console.error(`   Expected status: ${expectedPaymentStatus}`);
      console.error(`   Actual status in DB: ${verifyPayment?.status || 'NOT FOUND'}`);
    } else {
      console.log(`✅ Payment persistence confirmed: status = "${verifyPayment.status}"`);
    }
    
    if (!verifyRequest || verifyRequest.paymentStatus !== expectedRequestStatus) {
      console.error(`❌ CRITICAL: Request update did NOT persist!`);
      console.error(`   Expected paymentStatus: ${expectedRequestStatus}`);
      console.error(`   Actual paymentStatus in DB: ${verifyRequest?.paymentStatus || 'NOT FOUND'}`);
    } else {
      console.log(`✅ Request persistence confirmed: paymentStatus = "${verifyRequest.paymentStatus}"`);
    }

    console.log(`\n✅ PAYMENT ${isDJMode ? "AUTHORIZATION" : "COMPLETION"} VERIFIED`);
    console.log(`   Request: ${request._id}`);
    console.log(`   VenueId: ${request.venueId || "NOT SET"}`);
    console.log(`   VenueId type: ${typeof request.venueId}`);
    console.log(`   Amount: £${payment.amount}`);
    console.log(`   Status: ${expectedPaymentStatus}`);
    if (isDJMode) {
      console.log(`   ⏳ Awaiting DJ approval to capture payment`);
    } else {
      console.log(`   ✅ Payment captured and transfers processing`);
    }

    console.log(`\n📍 MAIN SUCCESS RESPONSE:`);
    console.log(`   Request has venueId: ${!!request.venueId}`);
    console.log(`   VenueId value: ${request.venueId || "null/undefined"}`);
    console.log(`   VenueId instanceof ObjectId: ${request.venueId ? request.venueId instanceof require('mongoose').Types.ObjectId : false}`);

    return {
      success: true,
      requestId: request._id.toString(),
      venueId: request.venueId ? request.venueId.toString() : null,
      status: expectedPaymentStatus,
      isDJMode: isDJMode,
      amount: payment.amount,
      message: isDJMode 
        ? "Payment authorized. Awaiting DJ approval to capture." 
        : "Payment verified and completed"
    };

  } catch (err) {
    console.error(`❌ Verification Error:`, err.message);
    return {
      success: false,
      message: err.message
    };
  }
}

module.exports = {
  verifyCheckoutSession
};
