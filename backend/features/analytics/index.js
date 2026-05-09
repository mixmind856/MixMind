const express = require("express");
const { postAnalyticsEvent } = require("./analytics.controller");

const router = express.Router();
router.post("/event", postAnalyticsEvent);

module.exports = router;
