const djPushService = require("../../services/djPushService");

function requireDjUserAccount(req, res) {
  if (req.dj?.isVenueBased || !req.dj?.djId) {
    res.status(403).json({
      error: "Push notifications require a DJ user account"
    });
    return null;
  }
  return req.dj.djId;
}

async function getPublicKey(req, res) {
  try {
    const publicKey = djPushService.getPublicKey();
    if (!publicKey) {
      return res.status(503).json({ error: "Push notifications are not configured" });
    }
    res.json({ publicKey });
  } catch (err) {
    console.error("Get VAPID public key error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function subscribe(req, res) {
  try {
    const djId = requireDjUserAccount(req, res);
    if (!djId) return;

    const { venueId, subscription, userAgent } = req.body;
    if (!venueId || !subscription) {
      return res.status(400).json({ error: "venueId and subscription are required" });
    }

    const result = await djPushService.upsertSubscription(
      djId,
      venueId,
      subscription,
      userAgent
    );

    res.status(201).json({
      message: "Push subscription saved",
      ...result
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error("Push subscribe error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function unsubscribe(req, res) {
  try {
    const djId = requireDjUserAccount(req, res);
    if (!djId) return;

    const { venueId, endpoint } = req.body;
    if (!venueId) {
      return res.status(400).json({ error: "venueId is required" });
    }

    const result = await djPushService.removeSubscription(djId, venueId, endpoint);
    res.json({ message: "Push subscription removed", ...result });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error("Push unsubscribe error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function setAvailability(req, res) {
  try {
    const djId = requireDjUserAccount(req, res);
    if (!djId) return;

    const { venueId, online } = req.body;
    if (!venueId || typeof online !== "boolean") {
      return res.status(400).json({ error: "venueId and online (boolean) are required" });
    }

    const result = await djPushService.setNotificationAvailability(djId, venueId, online);
    res.json({
      message: online ? "You are online for this venue" : "You are offline for this venue",
      ...result
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error("Push availability error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function getStatus(req, res) {
  try {
    const djId = requireDjUserAccount(req, res);
    if (!djId) return;

    const { venueId } = req.query;
    if (!venueId) {
      return res.status(400).json({ error: "venueId query parameter is required" });
    }

    const result = await djPushService.getNotificationStatus(djId, venueId);
    res.json(result);
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error("Push status error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = {
  getPublicKey,
  subscribe,
  unsubscribe,
  setAvailability,
  getStatus
};
