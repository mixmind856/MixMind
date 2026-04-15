const express = require("express");
const { validateCoupon } = require("./coupons.controller");

const router = express.Router();

/* -------------------- COUPON ROUTES -------------------- */

// Validate coupon code (frontend calls this before creating request)
router.post("/validate", validateCoupon);

module.exports = router;
