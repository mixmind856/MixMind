/**
 * Coupon Service
 * Handles coupon generation, validation, and redemption
 */

const Coupon = require("../models/Coupon");
const emailService = require("./emailService");

/**
 * Generate and send coupon after Stripe payment capture
 * ONLY called when user pays with their own money (Stripe), NOT when using coupon code
 * @param {Object} payment - Payment record
 * @param {Object} user - User who made payment
 * @param {Object} request - Song request that was paid for
 * @returns {Promise<Object>} - Generated coupon
 */
async function generateAndSendCoupon(payment, user, request) {
  try {
    console.log(`\n💳 COUPON GENERATION START`);
    console.log(`   Payment ID: ${payment?._id || "undefined"}`);
    console.log(`   User Email: ${user?.email || "undefined"}`);
    console.log(`   User ID: ${user?._id || "undefined"}`);
    console.log(`   Amount Paid: £${payment?.amount || "undefined"}`);
    console.log(`   Payment Status: ${payment?.status || "undefined"}`);

    // Validate inputs
    if (!payment) {
      console.error(`❌ Payment object is null/undefined`);
      return null;
    }
    if (!user || !user.email) {
      console.error(`❌ User object is null/undefined or missing email`);
      return null;
    }
    if (!request) {
      console.error(`❌ Request object is null/undefined`);
      return null;
    }

    // Only generate coupon if payment is actually captured (not cancelled or failed)
    if (payment.status !== "captured" && payment.status !== "paid") {
      console.log(`   ⚠️  Skipping coupon - Payment status: ${payment.status}`);
      return null;
    }

    console.log(`   ✅ Payment validation passed`);

    // Generate discount: 1 FREE SONG for every payment (£3)
    const discount = 3;
    console.log(`   💰 Discount: £${discount} (1 FREE SONG 🎵)`);

    // Generate unique coupon code using timestamp + random
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const couponCode = `MM${timestamp}${random}`;
    
    console.log(`   🎟️  Generated coupon code: ${couponCode}`);

    // Set expiry: 30 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create coupon document
    console.log(`   📝 Creating coupon in database...`);
    const coupon = new Coupon({
      code: couponCode,
      discount,
      description: `£${discount} off - Thank you for your payment!`,
      generatedFor: user._id,
      email: user.email,
      expiresAt,
      sourcePayment: payment._id,
      sourceRequest: request._id,
      sentAt: new Date()
    });

    await coupon.save();
    console.log(`   ✅ Coupon saved to database: ${couponCode}`);

    // Send email with coupon code
    console.log(`\n   📧 SENDING EMAIL...`);
    console.log(`      To: ${user.email}`);
    console.log(`      Code: ${couponCode}`);
    
    try {
      // Critical check: Email credentials
      if (!process.env.GMAIL_USER) {
        console.error(`      ❌ GMAIL_USER not set`);
        return coupon;
      }
      if (!process.env.GMAIL_PASSWORD) {
        console.error(`      ❌ GMAIL_PASSWORD not set`);
        return coupon;
      }

      console.log(`      ✅ Email credentials present`);
      console.log(`         GMAIL_USER: ${process.env.GMAIL_USER}`);

      const emailResult = await emailService.sendCouponCode(
        user.email,
        user.name || "Valued Customer",
        couponCode,
        discount,
        expiresAt
      );
      
      console.log(`      📧 Email result:`, JSON.stringify(emailResult));
      
      if (emailResult && emailResult.success) {
        console.log(`      ✅ EMAIL SENT SUCCESSFULLY!`);
      } else {
        console.error(`      ❌ Email failed:`, emailResult?.error || "No error details");
      }
    } catch (emailErr) {
      console.error(`      ❌ EMAIL EXCEPTION:`, emailErr.message);
      console.error(`         Stack:`, emailErr.stack);
    }

    console.log(`✅ Coupon generation complete - Code: ${couponCode}\n`);
    return coupon;
    
  } catch (err) {
    console.error("❌ Generate Coupon Error:", err.message);
    console.error("   Stack:", err.stack);
    return null;
  }
}

/**
 * Validate and apply coupon to price
 * @param {string} couponCode - Coupon code to validate
 * @param {string} userId - User ID trying to redeem
 * @param {number} originalPrice - Original price before discount
 * @returns {Promise<Object>} - { isValid, discount, finalPrice, couponId }
 */
async function validateAndApplyCoupon(couponCode, userId, originalPrice) {
  try {
    console.log(`\n🎟️  COUPON VALIDATION`);
    console.log(`   Code: ${couponCode}`);
    console.log(`   Original Price: £${originalPrice}`);

    // Find coupon
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
    if (!coupon) {
      console.log(`   ❌ Coupon not found`);
      return {
        isValid: false,
        error: "Coupon code not found",
        discount: 0,
        finalPrice: originalPrice
      };
    }

    // Check if already used
    if (coupon.isUsed) {
      console.log(`   ❌ Coupon already used on:`, coupon.usedAt);
      return {
        isValid: false,
        error: "This coupon has already been used",
        discount: 0,
        finalPrice: originalPrice
      };
    }

    // Check if expired
    if (coupon.isExpired || new Date() > coupon.expiresAt) {
      console.log(`   ❌ Coupon expired on:`, coupon.expiresAt);
      return {
        isValid: false,
        error: "This coupon has expired",
        discount: 0,
        finalPrice: originalPrice
      };
    }

    // Calculate final price
    const discount = coupon.discount;
    const finalPrice = Math.max(0, originalPrice - discount); // Cannot be negative

    console.log(`   ✅ Coupon valid`);
    console.log(`   Discount: £${discount}`);
    console.log(`   Final Price: £${finalPrice}`);

    return {
      isValid: true,
      couponId: coupon._id,
      discount,
      finalPrice,
      couponCode: couponCode.toUpperCase()
    };
  } catch (err) {
    console.error("❌ Validate Coupon Error:", err.message);
    return {
      isValid: false,
      error: "Error validating coupon",
      discount: 0,
      finalPrice: originalPrice
    };
  }
}

/**
 * Redeem coupon on a request
 * @param {string} couponCode - Coupon code
 * @param {string} userId - User redeeming
 * @param {string} requestId - Request being made
 * @returns {Promise<Object>} - Redeemed coupon
 */
async function redeemCoupon(couponCode, userId, requestId) {
  try {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
    if (!coupon) {
      throw new Error("Coupon not found");
    }

    if (!coupon.isValid()) {
      throw new Error("Coupon is no longer valid");
    }

    // Redeem it
    await coupon.redeem(userId, requestId);
    
    console.log(`✅ Coupon redeemed: ${couponCode} on request ${requestId}`);
    return coupon;
  } catch (err) {
    console.error("❌ Redeem Coupon Error:", err.message);
    throw err;
  }
}

/**
 * Get user's coupons (both used and unused)
 */
async function getUserCoupons(userId) {
  try {
    const coupons = await Coupon.find({ generatedFor: userId })
      .sort({ createdAt: -1 });
    return coupons;
  } catch (err) {
    console.error("Get User Coupons Error:", err.message);
    throw err;
  }
}

module.exports = {
  generateAndSendCoupon,
  validateAndApplyCoupon,
  redeemCoupon,
  getUserCoupons
};
