const couponService = require("../../services/couponService");

/**
 * Validate coupon code and return discount
 * Frontend calls this to show discount before creating request
 */
async function validateCoupon(req, res) {
  try {
    const { couponCode, originalPrice } = req.body;

    if (!couponCode || !originalPrice) {
      return res.status(400).json({
        error: "Coupon code and original price are required"
      });
    }

    const result = await couponService.validateAndApplyCoupon(
      couponCode,
      null, // userId not needed for validation-only
      originalPrice
    );

    if (!result.isValid) {
      return res.status(400).json({
        error: result.error || "Invalid coupon"
      });
    }

    res.json({
      isValid: true,
      couponCode: result.couponCode,
      discount: result.discount,
      finalPrice: result.finalPrice
    });
  } catch (err) {
    console.error("Validate Coupon Error:", err.message);
    res.status(500).json({
      error: "Failed to validate coupon"
    });
  }
}

module.exports = {
  validateCoupon
};
