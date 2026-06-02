const mongoose = require("mongoose");
const Venue = require("../models/Venue");
const Request = require("../models/Request");
const JukeboxRequest = require("../models/JukeboxRequest");
const { resolveAnalyticsWindow } = require("./analyticsFunnelService");

const TZ = "Europe/London";

const MIXMIND_ACCEPTED_STATUSES = ["queued", "paid", "approved", "processing", "completed"];
const JUKEBOX_CANCELED_PAYMENT = ["canceled", "cancelled"];

function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function pct(num, den) {
  if (!den || den <= 0) return 0;
  return Math.round((num / den) * 10000) / 100;
}

function mixmindRequestAmount(r) {
  const paid = Number(r.paidAmount);
  if (Number.isFinite(paid) && paid > 0) return paid;
  return Number(r.price) || 0;
}

function jukeboxRequestAmount(r) {
  return (Number(r.amountPence) || 0) / 100;
}

function londonYmdFromDate(d) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d instanceof Date ? d : new Date(d));
}

function isMixMindLost(r) {
  const st = r.status;
  const ps = r.paymentStatus;
  return st === "rejected" || st === "failed" || ps === "cancelled";
}

function isMixMindEarned(r) {
  return r.paymentStatus === "captured";
}

function isMixMindPendingRevenue(r) {
  return r.paymentStatus === "authorized" || r.status === "pending_dj_approval";
}

function isJukeboxLost(r) {
  const st = r.status;
  const ps = r.paymentStatus;
  return (
    st === "genre_rejected" ||
    st === "failed" ||
    JUKEBOX_CANCELED_PAYMENT.includes(ps)
  );
}

function isJukeboxEarned(r) {
  return r.status === "queued" && r.paymentStatus === "succeeded";
}

function isJukeboxPendingRevenue(r) {
  return ["pending_payment", "paid_pending_genre", "genre_approved"].includes(r.status);
}

function classifyMixMindRevenue(r) {
  const amount = mixmindRequestAmount(r);
  const potential = amount > 0 ? amount : 0;
  let earned = 0;
  let lost = 0;
  let pending = 0;

  if (potential > 0) {
    if (isMixMindLost(r)) {
      lost = potential;
    } else if (isMixMindEarned(r)) {
      earned = potential;
    } else if (isMixMindPendingRevenue(r)) {
      pending = potential;
    }
  }

  return {
    potentialRevenue: roundMoney(potential),
    earnedRevenue: roundMoney(earned),
    lostRevenue: roundMoney(lost),
    pendingRevenue: roundMoney(pending),
  };
}

function classifyJukeboxRevenue(r) {
  const amount = jukeboxRequestAmount(r);
  const potential = amount > 0 ? amount : 0;
  let earned = 0;
  let lost = 0;
  let pending = 0;

  if (potential > 0) {
    if (isJukeboxLost(r)) {
      lost = potential;
    } else if (isJukeboxEarned(r)) {
      earned = potential;
    } else if (isJukeboxPendingRevenue(r)) {
      pending = potential;
    }
  }

  return {
    potentialRevenue: roundMoney(potential),
    earnedRevenue: roundMoney(earned),
    lostRevenue: roundMoney(lost),
    pendingRevenue: roundMoney(pending),
  };
}

function mixmindRequestCountBucket(r) {
  if (isMixMindLost(r)) return "rejected";
  if (MIXMIND_ACCEPTED_STATUSES.includes(r.status)) return "accepted";
  return "pending";
}

function jukeboxRequestCountBucket(r) {
  if (isJukeboxLost(r)) return "rejected";
  if (r.status === "queued" && r.paymentStatus === "succeeded") return "accepted";
  return "pending";
}

function emptyStats() {
  return {
    potentialRevenue: 0,
    earnedRevenue: 0,
    lostRevenue: 0,
    pendingRevenue: 0,
    totalRequests: 0,
    acceptedRequests: 0,
    rejectedRequests: 0,
    pendingRequests: 0,
  };
}

function addStats(target, source) {
  target.potentialRevenue = roundMoney(target.potentialRevenue + source.potentialRevenue);
  target.earnedRevenue = roundMoney(target.earnedRevenue + source.earnedRevenue);
  target.lostRevenue = roundMoney(target.lostRevenue + source.lostRevenue);
  target.pendingRevenue = roundMoney(target.pendingRevenue + source.pendingRevenue);
  target.totalRequests += source.totalRequests;
  target.acceptedRequests += source.acceptedRequests;
  target.rejectedRequests += source.rejectedRequests;
  target.pendingRequests += source.pendingRequests;
}

function finalizeStats(stats) {
  stats.acceptanceRatePct = pct(stats.acceptedRequests, stats.totalRequests);
  stats.revenueCaptureRatePct = pct(stats.earnedRevenue, stats.potentialRevenue);
  return stats;
}

function processMixMindRequest(r, venueName) {
  const revenue = classifyMixMindRevenue(r);
  const bucket = mixmindRequestCountBucket(r);
  const createdAt = r.createdAt ? new Date(r.createdAt) : new Date();

  return {
    stats: {
      ...revenue,
      totalRequests: 1,
      acceptedRequests: bucket === "accepted" ? 1 : 0,
      rejectedRequests: bucket === "rejected" ? 1 : 0,
      pendingRequests: bucket === "pending" ? 1 : 0,
    },
    recent: {
      id: String(r._id),
      mode: "MixMind",
      songTitle: r.title || r.songTitle || "",
      artist: r.artist || r.artistName || "",
      requesterName: r.userName || "",
      status: r.status,
      paymentStatus: r.paymentStatus,
      ...revenue,
      createdAt: createdAt.toISOString(),
    },
    reportRow: {
      date: londonYmdFromDate(createdAt),
      venue: venueName,
      mode: "MixMind",
      songTitle: r.title || r.songTitle || "",
      artist: r.artist || r.artistName || "",
      requesterName: r.userName || "",
      status: r.status,
      paymentStatus: r.paymentStatus,
      ...revenue,
      createdAt: createdAt.toISOString(),
    },
  };
}

function processJukeboxRequest(r, venueName) {
  const revenue = classifyJukeboxRevenue(r);
  const bucket = jukeboxRequestCountBucket(r);
  const createdAt = r.createdAt ? new Date(r.createdAt) : new Date();

  return {
    stats: {
      ...revenue,
      totalRequests: 1,
      acceptedRequests: bucket === "accepted" ? 1 : 0,
      rejectedRequests: bucket === "rejected" ? 1 : 0,
      pendingRequests: bucket === "pending" ? 1 : 0,
    },
    recent: {
      id: String(r._id),
      mode: "Jukebox",
      songTitle: r.trackName || "",
      artist: r.artistName || "",
      requesterName: r.requesterName || "",
      status: r.status,
      paymentStatus: r.paymentStatus,
      ...revenue,
      createdAt: createdAt.toISOString(),
    },
    reportRow: {
      date: londonYmdFromDate(createdAt),
      venue: venueName,
      mode: "Jukebox",
      songTitle: r.trackName || "",
      artist: r.artistName || "",
      requesterName: r.requesterName || "",
      status: r.status,
      paymentStatus: r.paymentStatus,
      ...revenue,
      createdAt: createdAt.toISOString(),
    },
  };
}

async function fetchRequestsInWindow(from, toExclusive, venueId = null) {
  const dateFilter = { createdAt: { $gte: from, $lt: toExclusive } };
  const reqQuery = { ...dateFilter, venueId: { $ne: null, $exists: true } };
  const jbQuery = { ...dateFilter };

  if (venueId) {
    const oid = new mongoose.Types.ObjectId(venueId);
    reqQuery.venueId = oid;
    jbQuery.venueId = oid;
  }

  const [reqDocs, jbDocs] = await Promise.all([
    Request.find(reqQuery).lean().exec(),
    JukeboxRequest.find(jbQuery).lean().exec(),
  ]);

  return { reqDocs, jbDocs };
}

async function loadVenueNames(venueIds) {
  const oids = [...venueIds]
    .filter((id) => id && mongoose.Types.ObjectId.isValid(String(id)))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (oids.length === 0) return new Map();

  const docs = await Venue.find({ _id: { $in: oids } })
    .select("name isActive")
    .lean()
    .exec();

  const map = new Map();
  for (const v of docs) {
    map.set(String(v._id), {
      name: v.name || "Unknown venue",
      isActive: v.isActive !== undefined ? !!v.isActive : true,
    });
  }
  return map;
}

function aggregateFromDocs(reqDocs, jbDocs, venueMetaById) {
  const totals = emptyStats();
  const mixmind = emptyStats();
  const jukebox = emptyStats();
  const byVenue = new Map();
  const recentRequests = [];
  const reportRows = [];

  const ensureVenue = (vid) => {
    const key = String(vid);
    if (!byVenue.has(key)) {
      const meta = venueMetaById.get(key) || {};
      byVenue.set(key, {
        venueId: key,
        venueName: meta.name || "Unknown venue",
        isActive: meta.isActive !== undefined ? meta.isActive : true,
        ...emptyStats(),
      });
    }
    return byVenue.get(key);
  };

  for (const r of reqDocs) {
    if (!r.venueId) continue;
    const vid = String(r.venueId);
    const meta = venueMetaById.get(vid) || {};
    const venueName = meta.name || "Unknown venue";
    const processed = processMixMindRequest(r, venueName);
    addStats(totals, processed.stats);
    addStats(mixmind, processed.stats);
    addStats(ensureVenue(vid), processed.stats);
    recentRequests.push(processed.recent);
    reportRows.push(processed.reportRow);
  }

  for (const r of jbDocs) {
    const vid = String(r.venueId);
    const meta = venueMetaById.get(vid) || {};
    const venueName = meta.name || "Unknown venue";
    const processed = processJukeboxRequest(r, venueName);
    addStats(totals, processed.stats);
    addStats(jukebox, processed.stats);
    addStats(ensureVenue(vid), processed.stats);
    recentRequests.push(processed.recent);
    reportRows.push(processed.reportRow);
  }

  recentRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  reportRows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const venues = [...byVenue.values()]
    .map((v) => finalizeStats(v))
    .sort((a, b) => b.earnedRevenue - a.earnedRevenue);

  return {
    totals: finalizeStats(totals),
    mixmind: finalizeStats(mixmind),
    jukebox: finalizeStats(jukebox),
    venues,
    recentRequests,
    reportRows,
  };
}

function buildDateRangeResponse(from, toExclusive) {
  return {
    from: from.toISOString(),
    to: new Date(toExclusive.getTime() - 1).toISOString(),
    timezone: `${TZ} (London)`,
  };
}

async function buildMoneyVenues(query = {}) {
  const { from, toExclusive, appliedRange } = resolveAnalyticsWindow(query);
  const { reqDocs, jbDocs } = await fetchRequestsInWindow(from, toExclusive);

  const venueIds = new Set();
  for (const r of reqDocs) {
    if (r.venueId) venueIds.add(String(r.venueId));
  }
  for (const r of jbDocs) {
    if (r.venueId) venueIds.add(String(r.venueId));
  }

  const venueMetaById = await loadVenueNames(venueIds);
  const aggregated = aggregateFromDocs(reqDocs, jbDocs, venueMetaById);

  return {
    appliedRange,
    dateRange: buildDateRangeResponse(from, toExclusive),
    totals: {
      ...aggregated.totals,
      mixmind: aggregated.mixmind,
      jukebox: aggregated.jukebox,
    },
    venues: aggregated.venues,
  };
}

async function buildMoneyVenue(venueId, query = {}) {
  if (!mongoose.Types.ObjectId.isValid(venueId)) {
    const err = new Error("Invalid venue id");
    err.statusCode = 400;
    throw err;
  }

  const venue = await Venue.findById(venueId).select("name isActive").lean().exec();
  if (!venue) {
    const err = new Error("Venue not found");
    err.statusCode = 404;
    throw err;
  }

  const { from, toExclusive, appliedRange } = resolveAnalyticsWindow(query);
  const { reqDocs, jbDocs } = await fetchRequestsInWindow(from, toExclusive, venueId);

  const venueMetaById = new Map([
    [
      String(venue._id),
      {
        name: venue.name || "Unknown venue",
        isActive: venue.isActive !== undefined ? !!venue.isActive : true,
      },
    ],
  ]);

  const aggregated = aggregateFromDocs(reqDocs, jbDocs, venueMetaById);

  return {
    venue: {
      id: String(venue._id),
      name: venue.name || "Unknown venue",
      isActive: venue.isActive !== undefined ? !!venue.isActive : true,
    },
    appliedRange,
    dateRange: buildDateRangeResponse(from, toExclusive),
    totals: {
      ...aggregated.totals,
      mixmind: aggregated.mixmind,
      jukebox: aggregated.jukebox,
    },
    recentRequests: aggregated.recentRequests.slice(0, 50),
    reportRows: aggregated.reportRows,
  };
}

module.exports = {
  buildMoneyVenues,
  buildMoneyVenue,
  mixmindRequestAmount,
  jukeboxRequestAmount,
};
