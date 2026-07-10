const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const { buildMoneyVenue } = require("./adminMoneyService");
const { buildVenueAnalyticsDeepDive, resolveAnalyticsWindow } = require("./analyticsFunnelService");
const { roundMoney, fetchRequestDocs, aggregateRequestTypeBreakdown } = require("./requestStatsService");
const { LIVE_VENUE_SHARE, LIVE_PLATFORM_SHARE } = require("../utils/revenueSplit");

function formatLondonDate(d = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d instanceof Date ? d : new Date(d));
}

function formatPeriodLabel(appliedRange, dateRange) {
  if (appliedRange?.label) return appliedRange.label;
  if (dateRange?.from && dateRange?.to) {
    const from = formatLondonDate(dateRange.from);
    const to = formatLondonDate(dateRange.to);
    return `${from} – ${to}`;
  }
  return "Selected period";
}

function buildStatementReference(venueName, from) {
  const period = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    month: "long",
    year: "numeric",
  }).format(from instanceof Date ? from : new Date(from));
  return `${period} — ${venueName || "Venue"}`;
}

function buildTopRequestedSongs(reportRows, limit = 3) {
  const counts = new Map();
  for (const row of reportRows || []) {
    const title = (row.songTitle || "").trim();
    const artist = (row.artist || "").trim();
    if (!title) continue;
    const key = `${title.toLowerCase()}|||${artist.toLowerCase()}`;
    const prev = counts.get(key) || { title, artist, count: 0 };
    prev.count += 1;
    counts.set(key, prev);
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function buildPerformanceRating(totalRequests) {
  const n = Number(totalRequests) || 0;
  if (n > 40) return { stars: "★★★★★", label: "Excellent Month" };
  if (n >= 20) return { stars: "★★★★", label: "Good Month" };
  if (n >= 10) return { stars: "★★★", label: "Growing" };
  return { stars: "★★", label: "Early Stage" };
}

async function sumVenuePaymentTransfers(venueId, from, toExclusive) {
  if (!mongoose.Types.ObjectId.isValid(venueId)) {
    return { venue: 0, platform: 0, dj: 0 };
  }

  const payments = await Payment.find({
    venueId: new mongoose.Types.ObjectId(venueId),
    transfersCreatedAt: { $gte: from, $lt: toExclusive },
    transfers: { $exists: true, $not: { $size: 0 } },
  })
    .select("transfers")
    .lean()
    .exec();

  const sums = { venue: 0, platform: 0, dj: 0 };
  for (const payment of payments) {
    for (const transfer of payment.transfers || []) {
      const key = transfer.type;
      if (key && Object.prototype.hasOwnProperty.call(sums, key)) {
        sums[key] += Number(transfer.amount) || 0;
      }
    }
  }

  return {
    venue: roundMoney(sums.venue),
    platform: roundMoney(sums.platform),
    dj: roundMoney(sums.dj),
  };
}

function computePayoutFinancials(moneyTotals, transferSums) {
  const grossRevenue = roundMoney(moneyTotals.earnedRevenue);
  const jukeboxEarned = roundMoney(moneyTotals.jukebox?.earnedRevenue || 0);

  const venueFromTransfers = roundMoney(transferSums.venue || 0);
  const platformFromTransfers = roundMoney(transferSums.platform || 0);
  const djFromTransfers = roundMoney(transferSums.dj || 0);

  const venueFromPlaylist = roundMoney(jukeboxEarned * LIVE_VENUE_SHARE);
  const platformFromPlaylist = roundMoney(jukeboxEarned * LIVE_PLATFORM_SHARE);

  const netVenuePayout = roundMoney(venueFromTransfers + venueFromPlaylist);
  const mixmindCommission = roundMoney(platformFromTransfers + platformFromPlaylist);

  const stripeFees = roundMoney(
    Math.max(0, grossRevenue - netVenuePayout - mixmindCommission - djFromTransfers)
  );

  return {
    grossRevenue,
    stripeFees,
    mixmindCommission,
    netVenuePayout,
    totalPayable: netVenuePayout,
  };
}

async function buildVenuePayoutInvoiceData(venueId, query = {}) {
  const [money, analytics] = await Promise.all([
    buildMoneyVenue(venueId, query),
    buildVenueAnalyticsDeepDive(venueId, query),
  ]);

  const { from, toExclusive } = resolveAnalyticsWindow(query);

  const { reqDocs, jbDocs } = await fetchRequestDocs({ venueId, from, toExclusive });
  const requestTypes = aggregateRequestTypeBreakdown(reqDocs, jbDocs);

  const transferSums = await sumVenuePaymentTransfers(venueId, from, toExclusive);
  const financials = computePayoutFinancials(money.totals, transferSums);
  const funnel = analytics.funnel || {};

  const conversionRate =
    funnel.venueFunnelConversionPct ??
    funnel.visitToPaymentConversion ??
    money.totals.revenueCaptureRatePct ??
    0;

  const totalRequests = money.totals.totalRequests ?? 0;

  return {
    statementReference: buildStatementReference(money.venue.name, from),
    issueDate: formatLondonDate(new Date()),
    payoutPeriod: formatPeriodLabel(money.appliedRange, money.dateRange),
    venue: {
      name: money.venue.name,
    },
    performance: {
      qrCodeScans: funnel.venueTaggedQrScans ?? 0,
      totalRequests,
      conversionRatePct: conversionRate,
      acceptedRequests: money.totals.acceptedRequests ?? 0,
      rejectedRequests: money.totals.rejectedRequests ?? 0,
      pendingRequests:
        (money.totals.pendingDjRequests ?? 0) +
        (money.totals.unpaidAbandonedRequests ?? 0),
      rating: buildPerformanceRating(totalRequests),
    },
    musicRequests: {
      djRequests: money.totals.mixmind?.totalRequests ?? 0,
      playlistModeRequests: money.totals.jukebox?.totalRequests ?? 0,
      requestTypes,
    },
    topRequestedSongs: buildTopRequestedSongs(money.reportRows, 3),
    financials,
    meta: {
      appliedRange: money.appliedRange,
      dateRange: money.dateRange,
    },
  };
}

module.exports = {
  buildVenuePayoutInvoiceData,
  buildStatementReference,
  buildTopRequestedSongs,
  buildPerformanceRating,
  sumVenuePaymentTransfers,
  computePayoutFinancials,
};
