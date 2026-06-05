const mongoose = require("mongoose");
const Request = require("../models/Request");
const JukeboxRequest = require("../models/JukeboxRequest");

/**
 * TEMPORARY dashboard filter — excludes legacy requests before this date.
 * Applied to admin, venue, and money dashboard stats only (not DB documents).
 * Remove when May-10-era data review is complete.
 */
const TEMP_DASHBOARD_STATS_MIN_CREATED_AT = new Date("2026-05-20T00:00:00.000Z");
const TEMP_DASHBOARD_STATS_FILTER_ENABLED = true;

const MIXMIND_PAID_PAYMENT_STATUSES = ["authorized", "captured", "cancelled"];

function getDashboardStatsDateFilter({ from = null, toExclusive = null } = {}) {
  if (!TEMP_DASHBOARD_STATS_FILTER_ENABLED) {
    if (from && toExclusive) {
      return { createdAt: { $gte: from, $lt: toExclusive } };
    }
    return {};
  }

  const min = TEMP_DASHBOARD_STATS_MIN_CREATED_AT;
  const gte = from ? new Date(Math.max(from.getTime(), min.getTime())) : min;

  if (toExclusive) {
    return { createdAt: { $gte: gte, $lt: toExclusive } };
  }
  return { createdAt: { $gte: gte } };
}

function mixmindHadPayment(paymentStatus) {
  return MIXMIND_PAID_PAYMENT_STATUSES.includes(paymentStatus);
}

const JUKEBOX_REJECTED_STATUSES = ["genre_rejected", "failed"];
const JUKEBOX_CANCELED_PAYMENT = ["canceled", "cancelled"];
const JUKEBOX_PENDING_STATUSES = ["paid_pending_genre", "genre_approved"];
const JUKEBOX_PAID_PAYMENT_STATUSES = [
  "succeeded",
  "requires_capture",
  "canceled",
  "cancelled",
];

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

function emptyStats() {
  return {
    totalRequests: 0,
    acceptedRequests: 0,
    rejectedRequests: 0,
    pendingDjRequests: 0,
    unpaidAbandonedRequests: 0,
    potentialRevenue: 0,
    earnedRevenue: 0,
    lostRevenue: 0,
    pendingRevenue: 0,
  };
}

function classifyMixMindRequest(r) {
  const ps = r.paymentStatus || "unpaid";
  const hasDjApproved = !!r.djApprovedAt;
  const hasDjRejected = !!r.djRejectedAt;
  const hadPayment = mixmindHadPayment(ps);
  const rejectedAfterPayment = hasDjRejected && hadPayment;

  // Outcome: DJ decision is source of truth (never status / captured / queued)
  let bucket;
  if (hasDjRejected) {
    bucket = "rejected";
  } else if (hasDjApproved) {
    bucket = "accepted";
  } else if (ps === "authorized") {
    bucket = "pending_dj";
  } else {
    bucket = "unpaid_abandoned";
  }

  const amount = mixmindRequestAmount(r);
  let potentialRevenue = 0;
  let earnedRevenue = 0;
  let lostRevenue = 0;
  let pendingRevenue = 0;

  // Revenue: separate from outcome
  if (hadPayment || rejectedAfterPayment) {
    potentialRevenue = amount;
  }

  if (ps === "cancelled" || rejectedAfterPayment) {
    lostRevenue = amount;
  } else if (ps === "captured") {
    earnedRevenue = amount;
  }

  if (ps === "authorized" && !hasDjApproved && !hasDjRejected) {
    pendingRevenue = amount;
  }

  return {
    bucket,
    potentialRevenue: roundMoney(potentialRevenue),
    earnedRevenue: roundMoney(earnedRevenue),
    lostRevenue: roundMoney(lostRevenue),
    pendingRevenue: roundMoney(pendingRevenue),
    amount,
  };
}

function classifyJukeboxRequest(r) {
  const st = r.status;
  const ps = r.paymentStatus || "";

  let bucket;
  if (
    JUKEBOX_REJECTED_STATUSES.includes(st) ||
    JUKEBOX_CANCELED_PAYMENT.includes(ps)
  ) {
    bucket = "rejected";
  } else if (st === "queued" && ps === "succeeded") {
    bucket = "accepted";
  } else if (JUKEBOX_PENDING_STATUSES.includes(st)) {
    bucket = "pending_dj";
  } else if (st === "pending_payment" && ps !== "succeeded") {
    bucket = "unpaid_abandoned";
  } else {
    bucket = "unpaid_abandoned";
  }

  const amount = jukeboxRequestAmount(r);
  let potentialRevenue = 0;
  let earnedRevenue = 0;
  let lostRevenue = 0;
  let pendingRevenue = 0;

  if (JUKEBOX_PAID_PAYMENT_STATUSES.includes(ps)) {
    potentialRevenue = amount;
    if (st === "queued" && ps === "succeeded") {
      earnedRevenue = amount;
    } else if (bucket === "rejected") {
      lostRevenue = amount;
    } else if (JUKEBOX_PENDING_STATUSES.includes(st)) {
      pendingRevenue = amount;
    }
  }

  return {
    bucket,
    potentialRevenue: roundMoney(potentialRevenue),
    earnedRevenue: roundMoney(earnedRevenue),
    lostRevenue: roundMoney(lostRevenue),
    pendingRevenue: roundMoney(pendingRevenue),
    amount,
  };
}

function statsFromMixMindClassification(c) {
  const stats = emptyStats();
  stats.totalRequests = 1;
  if (c.bucket === "accepted") stats.acceptedRequests = 1;
  if (c.bucket === "rejected") stats.rejectedRequests = 1;
  if (c.bucket === "pending_dj") stats.pendingDjRequests = 1;
  if (c.bucket === "unpaid_abandoned") stats.unpaidAbandonedRequests = 1;
  stats.potentialRevenue = c.potentialRevenue;
  stats.earnedRevenue = c.earnedRevenue;
  stats.lostRevenue = c.lostRevenue;
  stats.pendingRevenue = c.pendingRevenue;
  return stats;
}

function statsFromJukeboxClassification(c) {
  return statsFromMixMindClassification(c);
}

function addStats(target, source) {
  target.potentialRevenue = roundMoney(
    target.potentialRevenue + source.potentialRevenue
  );
  target.earnedRevenue = roundMoney(target.earnedRevenue + source.earnedRevenue);
  target.lostRevenue = roundMoney(target.lostRevenue + source.lostRevenue);
  target.pendingRevenue = roundMoney(
    target.pendingRevenue + source.pendingRevenue
  );
  target.totalRequests += source.totalRequests;
  target.acceptedRequests += source.acceptedRequests;
  target.rejectedRequests += source.rejectedRequests;
  target.pendingDjRequests += source.pendingDjRequests;
  target.unpaidAbandonedRequests += source.unpaidAbandonedRequests;
}

function finalizeStats(stats) {
  stats.acceptanceRatePct = pct(stats.acceptedRequests, stats.totalRequests);
  stats.revenueCaptureRatePct = pct(stats.earnedRevenue, stats.potentialRevenue);
  return stats;
}

function aggregateRequestStats(reqDocs = [], jbDocs = []) {
  const totals = emptyStats();
  const mixmind = emptyStats();
  const jukebox = emptyStats();

  for (const r of reqDocs) {
    const one = statsFromMixMindClassification(classifyMixMindRequest(r));
    addStats(mixmind, one);
    addStats(totals, one);
  }

  for (const r of jbDocs) {
    const one = statsFromJukeboxClassification(classifyJukeboxRequest(r));
    addStats(jukebox, one);
    addStats(totals, one);
  }

  return {
    totals: finalizeStats(totals),
    mixmind: finalizeStats(mixmind),
    jukebox: finalizeStats(jukebox),
  };
}

function summarizeMixMindRequests(requests) {
  const { mixmind } = aggregateRequestStats(requests, []);
  return {
    ...mixmind,
    total: mixmind.totalRequests,
    acceptedCompleted: mixmind.acceptedRequests,
    rejectedFailed: mixmind.rejectedRequests,
    pending: mixmind.pendingDjRequests,
    pendingDj: mixmind.pendingDjRequests,
    unpaidAbandoned: mixmind.unpaidAbandonedRequests,
    capturedRevenue: mixmind.earnedRevenue,
  };
}

function summarizeJukeboxRequests(rows) {
  const { jukebox } = aggregateRequestStats([], rows);
  return {
    ...jukebox,
    total: jukebox.totalRequests,
    queuedSuccess: jukebox.acceptedRequests,
    rejected: jukebox.rejectedRequests,
    pending: jukebox.pendingDjRequests,
    pendingDj: jukebox.pendingDjRequests,
    unpaidAbandoned: jukebox.unpaidAbandonedRequests,
    revenue: jukebox.earnedRevenue,
  };
}

async function fetchRequestDocs({ venueId = null, from = null, toExclusive = null } = {}) {
  const reqQuery = { venueId: { $ne: null, $exists: true } };
  const jbQuery = {};

  const dateFilter = getDashboardStatsDateFilter({ from, toExclusive });
  Object.assign(reqQuery, dateFilter);
  Object.assign(jbQuery, dateFilter);

  if (venueId) {
    if (!mongoose.Types.ObjectId.isValid(venueId)) {
      const err = new Error("Invalid venue id");
      err.statusCode = 400;
      throw err;
    }
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

async function buildVenueRequestStats(venueId, { from = null, toExclusive = null } = {}) {
  const { reqDocs, jbDocs } = await fetchRequestDocs({
    venueId,
    from,
    toExclusive,
  });
  const aggregated = aggregateRequestStats(reqDocs, jbDocs);
  return {
    ...aggregated.totals,
    mixmind: aggregated.mixmind,
    jukebox: aggregated.jukebox,
  };
}

function getMixMindRequestStatsFields(classification) {
  const stats = statsFromMixMindClassification(classification);
  return {
    ...stats,
    bucket: classification.bucket,
  };
}

function getJukeboxRequestStatsFields(classification) {
  const stats = statsFromJukeboxClassification(classification);
  return {
    ...stats,
    bucket: classification.bucket,
  };
}

module.exports = {
  TEMP_DASHBOARD_STATS_MIN_CREATED_AT,
  TEMP_DASHBOARD_STATS_FILTER_ENABLED,
  getDashboardStatsDateFilter,
  emptyStats,
  roundMoney,
  pct,
  mixmindRequestAmount,
  jukeboxRequestAmount,
  classifyMixMindRequest,
  classifyJukeboxRequest,
  statsFromMixMindClassification,
  statsFromJukeboxClassification,
  addStats,
  finalizeStats,
  aggregateRequestStats,
  summarizeMixMindRequests,
  summarizeJukeboxRequests,
  fetchRequestDocs,
  buildVenueRequestStats,
  getMixMindRequestStatsFields,
  getJukeboxRequestStatsFields,
};
