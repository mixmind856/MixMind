const { buildMoneyVenue } = require("./adminMoneyService");
const { buildVenueAnalyticsDeepDive, resolveAnalyticsWindow } = require("./analyticsFunnelService");
const {
  fetchRequestDocs,
  aggregateRequestTypeBreakdown,
  classifyMixMindRequest,
  classifyJukeboxRequest,
} = require("./requestStatsService");
const { calculatePeriodFinancials } = require("../utils/payoutCalculator");
const { readPayoutCalculatorConfig } = require("../utils/payoutCalculatorStore");

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

function countPaidSuccesses(reqDocs = [], jbDocs = []) {
  let playlistPaidSuccessCount = 0;
  let djPaidSuccessCount = 0;
  let djPriorityPaidSuccessCount = 0;

  for (const r of jbDocs) {
    const c = classifyJukeboxRequest(r);
    if (c.earnedRevenue > 0) playlistPaidSuccessCount += 1;
  }

  for (const r of reqDocs) {
    const c = classifyMixMindRequest(r);
    if (c.earnedRevenue <= 0) continue;
    const isPriority = r.priorityRequest === true || r.priorityType === "play_next";
    if (isPriority) djPriorityPaidSuccessCount += 1;
    else djPaidSuccessCount += 1;
  }

  return {
    playlistPaidSuccessCount,
    djPaidSuccessCount,
    djPriorityPaidSuccessCount,
  };
}

/**
 * Period financials via shared Payout Calculator (SSOT).
 */
function computePayoutFinancials(moneyTotals, paidCounts, configOverride) {
  return calculatePeriodFinancials(
    {
      playlistEarned: moneyTotals.jukebox?.earnedRevenue || 0,
      djEarned: moneyTotals.mixmind?.earnedRevenue || 0,
      playlistPaidSuccessCount: paidCounts.playlistPaidSuccessCount || 0,
      djPaidSuccessCount: paidCounts.djPaidSuccessCount || 0,
      djPriorityPaidSuccessCount: paidCounts.djPriorityPaidSuccessCount || 0,
    },
    configOverride || readPayoutCalculatorConfig()
  );
}

async function buildVenuePayoutInvoiceData(venueId, query = {}) {
  const [money, analytics] = await Promise.all([
    buildMoneyVenue(venueId, query),
    buildVenueAnalyticsDeepDive(venueId, query),
  ]);

  const { from, toExclusive } = resolveAnalyticsWindow(query);

  const { reqDocs, jbDocs } = await fetchRequestDocs({ venueId, from, toExclusive });
  const requestTypes = aggregateRequestTypeBreakdown(reqDocs, jbDocs);
  const paidCounts = countPaidSuccesses(reqDocs, jbDocs);

  const financials = computePayoutFinancials(money.totals, paidCounts);
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
  countPaidSuccesses,
  computePayoutFinancials,
};
