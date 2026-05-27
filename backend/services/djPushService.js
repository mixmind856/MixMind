const webpush = require("web-push");
const DJVenueAccess = require("../models/DJVenueAccess");
const DJPushSubscription = require("../models/DJPushSubscription");
const Venue = require("../models/Venue");

let vapidConfigured = false;

/** In-process idempotency: one push campaign per requestId */
const notifiedRequestIds = new Set();

function configureVapid() {
  if (vapidConfigured) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

function getPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

async function getApprovedActiveAccess(djId, venueId) {
  return DJVenueAccess.findOne({
    djId,
    venueId,
    status: "approved",
    currentlyActive: true
  });
}

async function upsertSubscription(djId, venueId, subscription, userAgent) {
  const access = await getApprovedActiveAccess(djId, venueId);
  if (!access) {
    const err = new Error("You don't have active approved access to this venue");
    err.statusCode = 403;
    throw err;
  }

  const endpoint = subscription.endpoint;
  const keys = subscription.keys;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    const err = new Error("Invalid push subscription");
    err.statusCode = 400;
    throw err;
  }

  await DJPushSubscription.findOneAndUpdate(
    { endpoint },
    {
      djId,
      venueId,
      endpoint,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
      userAgent: userAgent || null
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { saved: true, notificationOnline: access.notificationOnline };
}

async function removeSubscription(djId, venueId, endpoint) {
  const access = await getApprovedActiveAccess(djId, venueId);
  if (!access) {
    const err = new Error("You don't have active approved access to this venue");
    err.statusCode = 403;
    throw err;
  }

  const query = { djId, venueId };
  if (endpoint) {
    query.endpoint = endpoint;
  }

  await DJPushSubscription.deleteMany(query);

  return { removed: true };
}

async function setNotificationAvailability(djId, venueId, online) {
  const access = await getApprovedActiveAccess(djId, venueId);
  if (!access) {
    const err = new Error("You don't have active approved access to this venue");
    err.statusCode = 403;
    throw err;
  }

  access.notificationOnline = !!online;
  access.notificationOnlineAt = online ? new Date() : null;
  await access.save();

  return {
    notificationOnline: access.notificationOnline,
    notificationOnlineAt: access.notificationOnlineAt
  };
}

async function getNotificationStatus(djId, venueId) {
  const access = await getApprovedActiveAccess(djId, venueId);
  if (!access) {
    const err = new Error("You don't have active approved access to this venue");
    err.statusCode = 403;
    throw err;
  }

  const subscriptionCount = await DJPushSubscription.countDocuments({ djId, venueId });

  return {
    notificationOnline: !!access.notificationOnline,
    notificationOnlineAt: access.notificationOnlineAt,
    hasPushSubscription: subscriptionCount > 0
  };
}

async function sendPushToSubscription(subscriptionDoc, payload) {
  if (!configureVapid()) {
    return { ok: false, reason: "vapid_not_configured" };
  }

  const pushSubscription = {
    endpoint: subscriptionDoc.endpoint,
    keys: {
      p256dh: subscriptionDoc.keys.p256dh,
      auth: subscriptionDoc.keys.auth
    }
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    return { ok: true };
  } catch (err) {
    const statusCode = err?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await DJPushSubscription.deleteOne({ _id: subscriptionDoc._id }).catch(() => {});
    }
    return { ok: false, reason: err.message, statusCode };
  }
}

async function notifyDJsIfPendingAuthorized(requestDoc) {
  if (!requestDoc) return;

  const rid = String(requestDoc._id);
  if (
    requestDoc.status !== "pending_dj_approval" ||
    requestDoc.paymentStatus !== "authorized"
  ) {
    return;
  }

  if (notifiedRequestIds.has(rid)) {
    console.log(`[DJ Push] Duplicate skipped for request ${rid}`);
    return;
  }

  notifiedRequestIds.add(rid);

  return notifyDJsForNewRequest({
    venueId: requestDoc.venueId,
    songTitle: requestDoc.title || requestDoc.songTitle,
    artist: requestDoc.artist || requestDoc.artistName,
    requestId: requestDoc._id
  });
}

async function notifyDJsForNewRequest({ venueId, songTitle, artist, requestId }) {
  try {
    if (!venueId) return;

    if (!configureVapid()) {
      console.warn("[DJ Push] VAPID missing — not configured (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT)");
      return;
    }

    const venue = await Venue.findById(venueId).select("name");
    const venueName = venue?.name || "Venue";
    const title = songTitle || "New request";
    const artistName = artist || "Unknown artist";
    const body = `New song request at ${venueName}: ${title} by ${artistName}`;

    const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
    const dashboardUrl = `${clientUrl}/dj/dashboard/${venueId}`;

    const onlineAccess = await DJVenueAccess.find({
      venueId,
      status: "approved",
      currentlyActive: true,
      notificationOnline: true
    }).select("djId");

    if (!onlineAccess.length) {
      console.log(`[DJ Push] No online DJs for venue ${venueId} (request ${requestId || "n/a"})`);
      return;
    }

    const djIds = onlineAccess.map((a) => a.djId);
    const subscriptions = await DJPushSubscription.find({
      venueId,
      djId: { $in: djIds }
    });

    if (!subscriptions.length) {
      console.log(
        `[DJ Push] No subscriptions for venue ${venueId} (${onlineAccess.length} online DJ(s), request ${requestId || "n/a"})`
      );
      return;
    }

    const payload = {
      title: "New song request",
      body,
      url: dashboardUrl,
      venueId: String(venueId),
      requestId: requestId ? String(requestId) : null
    };

    const results = await Promise.all(
      subscriptions.map((sub) => sendPushToSubscription(sub, payload))
    );

    const successCount = results.filter((r) => r.ok).length;
    const failureCount = results.length - successCount;

    console.log(
      `[DJ Push] Push sent — request ${requestId || "n/a"} venue ${venueId}: ${successCount}/${subscriptions.length}`
    );

    if (failureCount > 0) {
      const failures = results.filter((r) => !r.ok);
      console.warn(
        `[DJ Push] ${failureCount} failure(s):`,
        failures.map((f) => f.reason || "unknown").join("; ")
      );
    }
  } catch (err) {
    console.warn("[DJ Push] notify failed (silent):", err.message);
  }
}

module.exports = {
  configureVapid,
  getPublicKey,
  upsertSubscription,
  removeSubscription,
  setNotificationAvailability,
  getNotificationStatus,
  notifyDJsForNewRequest,
  notifyDJsIfPendingAuthorized
};
