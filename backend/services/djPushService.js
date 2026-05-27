const webpush = require("web-push");
const DJVenueAccess = require("../models/DJVenueAccess");
const DJPushSubscription = require("../models/DJPushSubscription");
const Venue = require("../models/Venue");

let vapidConfigured = false;

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
    return;
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
  } catch (err) {
    const statusCode = err?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await DJPushSubscription.deleteOne({ _id: subscriptionDoc._id }).catch(() => {});
    }
  }
}

async function notifyDJsForNewRequest({ venueId, songTitle, artist, requestId }) {
  try {
    if (!venueId) return;
    if (!configureVapid()) return;

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

    if (!onlineAccess.length) return;

    const djIds = onlineAccess.map((a) => a.djId);
    const subscriptions = await DJPushSubscription.find({
      venueId,
      djId: { $in: djIds }
    });

    const payload = {
      title: "New song request",
      body,
      url: dashboardUrl,
      venueId: String(venueId),
      requestId: requestId ? String(requestId) : null
    };

    await Promise.allSettled(
      subscriptions.map((sub) => sendPushToSubscription(sub, payload))
    );
  } catch (err) {
    console.warn("DJ push notify failed (silent):", err.message);
  }
}

module.exports = {
  configureVapid,
  getPublicKey,
  upsertSubscription,
  removeSubscription,
  setNotificationAvailability,
  getNotificationStatus,
  notifyDJsForNewRequest
};
