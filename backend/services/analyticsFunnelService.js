const mongoose = require("mongoose");
const AnalyticsEvent = require("../models/AnalyticsEvent");
const Venue = require("../models/Venue");
const Request = require("../models/Request");
const JukeboxRequest = require("../models/JukeboxRequest");

const TZ = "Europe/London";

const {
  summarizeMixMindRequests,
  summarizeJukeboxRequests,
  mixmindRequestAmount,
  isDjAcceptedSong,
  isJukeboxAcceptedSong,
} = require("./requestStatsService");

function londonYmd(d) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(d);
}

function startOfLondonDay(d = new Date()) {
  const ymd = londonYmd(d);
  let lo = d.getTime() - 48 * 3600000;
  let hi = d.getTime() + 48 * 3600000;
  while (hi - lo > 1000) {
    const mid = Math.floor((lo + hi) / 2);
    const my = londonYmd(new Date(mid));
    if (my < ymd) lo = mid;
    else hi = mid;
  }
  let t = lo;
  while (londonYmd(new Date(t)) !== ymd) t += 60000;
  while (t > 0 && londonYmd(new Date(t - 60000)) === ymd) t -= 60000;
  return new Date(t);
}

function startOfNextLondonDay(fromStart) {
  const cur = londonYmd(fromStart);
  let t = fromStart.getTime() + 60000;
  while (londonYmd(new Date(t)) === cur && t - fromStart.getTime() < 48 * 3600000) {
    t += 60000;
  }
  return new Date(t);
}

function startOfLondonYmd(ymdStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymdStr)) return null;
  const [Y, M, D] = ymdStr.split("-").map(Number);
  let anchor = Date.UTC(Y, M - 1, D, 12, 0, 0);
  for (let i = 0; i < 5; i++) {
    const d = new Date(anchor);
    if (londonYmd(d) === ymdStr) return startOfLondonDay(d);
    anchor += 86400000;
  }
  return null;
}

function startOfLondonWeekMonday(reference = new Date()) {
  let t = startOfLondonDay(reference);
  for (let i = 0; i < 10; i++) {
    const wd = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short" }).format(t);
    if (String(wd).startsWith("Mon")) return t;
    t = new Date(t.getTime() - 86400000);
  }
  return startOfLondonDay(reference);
}

function startOfNextLondonWeekMonday(weekMonday) {
  return startOfLondonWeekMonday(new Date(weekMonday.getTime() + 8 * 86400000));
}

function startOfLondonMonth(reference = new Date()) {
  const ymd = londonYmd(reference);
  const [y, m] = ymd.split("-");
  return startOfLondonYmd(`${y}-${m}-01`);
}

function startOfNextLondonMonth(fromMonthStart) {
  return startOfLondonMonth(new Date(fromMonthStart.getTime() + 35 * 86400000));
}

function startOfLondonYear(reference = new Date()) {
  const y = londonYmd(reference).split("-")[0];
  return startOfLondonYmd(`${y}-01-01`);
}

function startOfNextLondonYear(fromYearStart) {
  const y = parseInt(londonYmd(fromYearStart).split("-")[0], 10);
  return startOfLondonYmd(`${y + 1}-01-01`);
}

function formatLondonLong(d) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(d);
}

/**
 * Resolve [from, toExclusive) and label. Valid `from`+`to` ISO params take priority.
 */
function resolveAnalyticsWindow(query = {}) {
  if (query.from && query.to) {
    const from = new Date(query.from);
    const toExclusive = new Date(query.to);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(toExclusive.getTime()) && toExclusive > from) {
      return {
        from,
        toExclusive,
        appliedRange: {
          kind: "custom",
          label: `Showing: ${formatLondonLong(from)} – ${formatLondonLong(new Date(toExclusive.getTime() - 1))}`
        }
      };
    }
  }

  const now = new Date();
  const range = typeof query.range === "string" ? query.range.trim().toLowerCase() : "today";

  if (range === "custom") {
    const sd = typeof query.startDate === "string" ? query.startDate.trim() : "";
    const ed = typeof query.endDate === "string" ? query.endDate.trim() : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sd) || !/^\d{4}-\d{2}-\d{2}$/.test(ed)) {
      const err = new Error("Invalid or missing startDate / endDate (YYYY-MM-DD) for range=custom");
      err.statusCode = 400;
      throw err;
    }
    const from = startOfLondonYmd(sd);
    const endInclusive = startOfLondonYmd(ed);
    if (!from || !endInclusive) {
      const err = new Error("Invalid startDate or endDate for range=custom");
      err.statusCode = 400;
      throw err;
    }
    const toExclusive = startOfNextLondonDay(endInclusive);
    if (toExclusive <= from) {
      const err = new Error("endDate must be on or after startDate");
      err.statusCode = 400;
      throw err;
    }
    return {
      from,
      toExclusive,
      appliedRange: {
        kind: "custom",
        label: `Showing: ${formatLondonLong(from)} – ${formatLondonLong(endInclusive)}`
      }
    };
  }

  if (range === "day") {
    const dateStr = typeof query.date === "string" ? query.date.trim() : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const err = new Error("Invalid or missing date=YYYY-MM-DD for range=day");
      err.statusCode = 400;
      throw err;
    }
    const start = startOfLondonYmd(dateStr);
    if (!start) {
      const err = new Error("Invalid date for range=day");
      err.statusCode = 400;
      throw err;
    }
    const end = startOfNextLondonDay(start);
    return {
      from: start,
      toExclusive: end,
      appliedRange: {
        kind: "day",
        date: dateStr,
        label: `Showing: ${formatLondonLong(start)}`
      }
    };
  }

  if (range === "yesterday") {
    const todayStart = startOfLondonDay(now);
    const from = startOfLondonDay(new Date(todayStart.getTime() - 1));
    const toExclusive = todayStart;
    const endDay = new Date(toExclusive.getTime() - 1);
    return {
      from,
      toExclusive,
      appliedRange: {
        kind: "yesterday",
        label: `Showing: Yesterday (${formatLondonLong(from)} – ${formatLondonLong(endDay)})`
      }
    };
  }

  if (range === "week") {
    const from = startOfLondonWeekMonday(now);
    const toExclusive = startOfNextLondonWeekMonday(from);
    const endDay = new Date(toExclusive.getTime() - 1);
    return {
      from,
      toExclusive,
      appliedRange: {
        kind: "week",
        label: `Showing: This week (${formatLondonLong(from)} – ${formatLondonLong(endDay)})`
      }
    };
  }

  if (range === "month") {
    const from = startOfLondonMonth(now);
    const toExclusive = startOfNextLondonMonth(from);
    const endDay = new Date(toExclusive.getTime() - 1);
    return {
      from,
      toExclusive,
      appliedRange: {
        kind: "month",
        label: `Showing: This month (${formatLondonLong(from)} – ${formatLondonLong(endDay)})`
      }
    };
  }

  if (range === "year") {
    const from = startOfLondonYear(now);
    const toExclusive = startOfNextLondonYear(from);
    const endDay = new Date(toExclusive.getTime() - 1);
    return {
      from,
      toExclusive,
      appliedRange: {
        kind: "year",
        label: `Showing: This year (${formatLondonLong(from)} – ${formatLondonLong(endDay)})`
      }
    };
  }

  if (range === "last6months") {
    const todayStart = startOfLondonDay(now);
    let from = todayStart;
    for (let i = 0; i < 179; i++) {
      from = startOfLondonDay(new Date(from.getTime() - 1));
    }
    const toExclusive = startOfNextLondonDay(todayStart);
    const endDay = new Date(toExclusive.getTime() - 1);
    return {
      from,
      toExclusive,
      appliedRange: {
        kind: "last6months",
        label: `Showing: Last 6 months / 180 days (${formatLondonLong(from)} – ${formatLondonLong(endDay)})`
      }
    };
  }

  const from = startOfLondonDay(now);
  const toExclusive = startOfNextLondonDay(from);
  return {
    from,
    toExclusive,
    appliedRange: {
      kind: "today",
      label: "Showing: Today"
    }
  };
}

function hourLabelLondon(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    hour12: false
  }).formatToParts(date);
  const hourVal = parts.find((p) => p.type === "hour")?.value || "00";
  const hh = hourVal.length >= 2 ? hourVal : hourVal.padStart(2, "0");
  return `${hh}:00`;
}

function ensureSource(map, src) {
  const key = src && String(src).trim() ? String(src).trim() : "(none)";
  if (!map[key]) {
    map[key] = {
      visits: 0,
      selections: 0,
      analyticsCheckoutCompletions: 0,
      conversion: 0
    };
  }
  return map[key];
}

function ensureVenue(venueMap, id, name) {
  const k = String(id);
  if (!venueMap.has(k)) {
    venueMap.set(k, {
      venueId: k,
      venueName: name || "Unknown venue",
      venueTaggedQrScans: 0,
      venueSelections: 0,
      venuePageVisits: 0,
      songSearches: 0,
      requestsStarted: 0,
      checkoutsStarted: 0,
      analyticsCheckoutCompletions: 0,
      venueFunnelConversionPct: 0,
      visitToPaymentConversion: 0,
      hottestHour: null,
      sources: {},
      _pageVisitHours: {}
    });
  }
  const row = venueMap.get(k);
  if (name && row.venueName === "Unknown venue") row.venueName = name;
  return row;
}

function pct(num, den) {
  if (!den || den <= 0) return 0;
  return Math.round((num / den) * 10000) / 100;
}

function processEventsToFunnelData(events) {
  const totals = {
    qrScans: 0,
    venueSelections: 0,
    venuePageVisits: 0,
    songSearches: 0,
    requestsStarted: 0,
    checkoutsStarted: 0,
    analyticsCheckoutCompletions: 0,
    overallFunnelConversionPct: 0
  };

  const scanVisitHourCounts = {};
  const venueMap = new Map();
  const globalSources = {};

  for (const e of events) {
    const src = e.src || "";
    const vid = e.venueId ? String(e.venueId) : "";
    const created = e.createdAt ? new Date(e.createdAt) : new Date();

    switch (e.eventType) {
      case "qr_scan_landing": {
        totals.qrScans++;
        const hlQr = hourLabelLondon(created);
        scanVisitHourCounts[hlQr] = (scanVisitHourCounts[hlQr] || 0) + 1;
        ensureSource(globalSources, src).visits++;
        if (vid) {
          const vrow = ensureVenue(venueMap, vid, e.venueName);
          vrow.venueTaggedQrScans++;
        }
        break;
      }
      case "venue_selected":
        totals.venueSelections++;
        if (vid) {
          const vrow = ensureVenue(venueMap, vid, e.venueName);
          vrow.venueSelections++;
          ensureSource(vrow.sources, src).selections++;
        }
        ensureSource(globalSources, src).selections++;
        break;
      case "venue_page_visit": {
        totals.venuePageVisits++;
        const hlPv = hourLabelLondon(created);
        scanVisitHourCounts[hlPv] = (scanVisitHourCounts[hlPv] || 0) + 1;
        if (vid) {
          const vrow = ensureVenue(venueMap, vid, e.venueName);
          vrow.venuePageVisits++;
          ensureSource(vrow.sources, src).visits++;
          vrow._pageVisitHours[hlPv] = (vrow._pageVisitHours[hlPv] || 0) + 1;
        }
        break;
      }
      case "song_search":
        totals.songSearches++;
        if (vid) {
          const vrow = ensureVenue(venueMap, vid, e.venueName);
          vrow.songSearches++;
        }
        break;
      case "request_started":
        totals.requestsStarted++;
        if (vid) {
          const vrow = ensureVenue(venueMap, vid, e.venueName);
          vrow.requestsStarted++;
        }
        break;
      case "checkout_started":
        totals.checkoutsStarted++;
        if (vid) {
          const vrow = ensureVenue(venueMap, vid, e.venueName);
          vrow.checkoutsStarted++;
        }
        break;
      case "payment_completed":
        totals.analyticsCheckoutCompletions++;
        if (vid) {
          const vrow = ensureVenue(venueMap, vid, e.venueName);
          vrow.analyticsCheckoutCompletions++;
          ensureSource(vrow.sources, src).analyticsCheckoutCompletions++;
        }
        ensureSource(globalSources, src).analyticsCheckoutCompletions++;
        break;
      default:
        break;
    }
  }

  totals.overallFunnelConversionPct = pct(totals.analyticsCheckoutCompletions, totals.qrScans);
  totals.visitToPaymentConversionPct = pct(totals.analyticsCheckoutCompletions, totals.venuePageVisits);

  return { totals, venueMap, scanVisitHourCounts, globalSources };
}

function venueHourlyFromEvents(events, venueId) {
  const vid = String(venueId);
  const counts = {};
  for (const e of events) {
    if (!e.venueId || String(e.venueId) !== vid) continue;
    const created = e.createdAt ? new Date(e.createdAt) : new Date();
    const hl = hourLabelLondon(created);
    counts[hl] = (counts[hl] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour.localeCompare(b.hour));
}

async function aggregateGlobalDbStats(from, toExclusive) {
  const [reqDocs, jbDocs] = await Promise.all([
    Request.find({ createdAt: { $gte: from, $lt: toExclusive } })
      .select(
        "status paymentStatus paidAmount price djApprovedAt djRejectedAt"
      )
      .lean()
      .exec(),
    JukeboxRequest.find({ createdAt: { $gte: from, $lt: toExclusive } })
      .select("status paymentStatus amountPence")
      .lean()
      .exec()
  ]);
  const m = summarizeMixMindRequests(reqDocs);
  const j = summarizeJukeboxRequests(jbDocs);
  return {
    mixmindCapturedRevenue: Math.round(m.capturedRevenue * 100) / 100,
    jukeboxSucceededRevenue: Math.round(j.revenue * 100) / 100,
    totalTrueRevenue: Math.round((m.capturedRevenue + j.revenue) * 100) / 100,
    mixmindRequestCount: m.total,
    jukeboxRequestCount: j.total
  };
}

async function mergeVenuesFromDbActivity(venues, from, toExclusive) {
  const have = new Set(venues.map((v) => String(v.venueId)));
  const [reqIds, jbIds] = await Promise.all([
    Request.distinct("venueId", {
      createdAt: { $gte: from, $lt: toExclusive },
      venueId: { $ne: null, $exists: true }
    }),
    JukeboxRequest.distinct("venueId", {
      createdAt: { $gte: from, $lt: toExclusive }
    })
  ]);
  const extra = new Set();
  for (const id of [...reqIds, ...jbIds]) {
    const s = id ? String(id) : "";
    if (s && mongoose.Types.ObjectId.isValid(s) && !have.has(s)) extra.add(s);
  }
  if (extra.size === 0) return venues;

  const oids = [...extra].map((id) => new mongoose.Types.ObjectId(id));
  const vdocs = await Venue.find({ _id: { $in: oids } })
    .select("name isActive")
    .lean()
    .exec();
  const byId = {};
  for (const v of vdocs) {
    byId[String(v._id)] = v;
  }

  for (const sid of extra) {
    const vdoc = byId[sid];
    venues.push({
      venueId: sid,
      venueName: vdoc?.name || "Unknown venue",
      isActive: vdoc?.isActive !== undefined ? !!vdoc.isActive : true,
      venueTaggedQrScans: 0,
      venueSelections: 0,
      venuePageVisits: 0,
      songSearches: 0,
      requestsStarted: 0,
      checkoutsStarted: 0,
      analyticsCheckoutCompletions: 0,
      venueFunnelConversionPct: 0,
      visitToPaymentConversion: 0,
      hottestHour: null,
      sources: {},
      djAcceptedSongs: 0,
      jukeboxAcceptedSongs: 0,
    });
  }
  return venues;
}

async function attachVenueMeta(venues) {
  const oids = venues
    .map((v) => v.venueId)
    .filter((id) => id && mongoose.Types.ObjectId.isValid(String(id)))
    .map((id) => new mongoose.Types.ObjectId(id));
  if (oids.length === 0) return;
  const vdocs = await Venue.find({ _id: { $in: oids } })
    .select("name isActive")
    .lean()
    .exec();
  const byId = {};
  for (const v of vdocs) {
    byId[String(v._id)] = v;
  }
  for (const row of venues) {
    const doc = byId[String(row.venueId)];
    if (doc?.name) row.venueName = doc.name;
    if (doc && doc.isActive !== undefined) row.isActive = !!doc.isActive;
  }
}

async function enrichVenuesWithDbStats(venues, from, toExclusive) {
  const ids = venues.map((v) => v.venueId).filter(Boolean);
  if (ids.length === 0) return;

  const oidList = ids.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id));
  if (oidList.length === 0) return;

  const [reqDocs, jbDocs] = await Promise.all([
    Request.find({
      venueId: { $in: oidList },
      createdAt: { $gte: from, $lt: toExclusive }
    })
      .lean()
      .exec(),
    JukeboxRequest.find({
      venueId: { $in: oidList },
      createdAt: { $gte: from, $lt: toExclusive }
    })
      .lean()
      .exec()
  ]);

  const byVenueReq = {};
  for (const r of reqDocs) {
    const k = String(r.venueId);
    if (!byVenueReq[k]) byVenueReq[k] = [];
    byVenueReq[k].push(r);
  }
  const byVenueJb = {};
  for (const r of jbDocs) {
    const k = String(r.venueId);
    if (!byVenueJb[k]) byVenueJb[k] = [];
    byVenueJb[k].push(r);
  }

  for (const row of venues) {
    const k = row.venueId;
    const reqList = byVenueReq[k] || [];
    const jbList = byVenueJb[k] || [];
    const m = summarizeMixMindRequests(reqList);
    const j = summarizeJukeboxRequests(jbList);

    row.djAcceptedSongs = reqList.filter(isDjAcceptedSong).length;
    row.jukeboxAcceptedSongs = jbList.filter(isJukeboxAcceptedSong).length;

    row.mixmindTotalRequests = m.totalRequests;
    row.mixmindAcceptedCompleted = m.acceptedRequests;
    row.mixmindPending = m.pendingDjRequests;
    row.mixmindUnpaidAbandoned = m.unpaidAbandonedRequests;
    row.mixmindRejectedFailed = m.rejectedRequests;
    row.mixmindCapturedRevenue = m.earnedRevenue;
    row.mixmindPotentialRevenue = m.potentialRevenue;
    row.mixmindLostRevenue = m.lostRevenue;
    row.mixmindPendingRevenue = m.pendingRevenue;

    row.jukeboxTotalRequests = j.totalRequests;
    row.jukeboxQueuedSuccess = j.acceptedRequests;
    row.jukeboxPending = j.pendingDjRequests;
    row.jukeboxUnpaidAbandoned = j.unpaidAbandonedRequests;
    row.jukeboxRejected = j.rejectedRequests;
    row.jukeboxRevenue = j.earnedRevenue;
    row.jukeboxPotentialRevenue = j.potentialRevenue;
    row.jukeboxLostRevenue = j.lostRevenue;
    row.jukeboxPendingRevenue = j.pendingRevenue;

    const totalRev = row.mixmindCapturedRevenue + row.jukeboxRevenue;
    row.totalTrueRevenue = Math.round(totalRev * 100) / 100;
    row.dbRequestCount = (row.mixmindTotalRequests || 0) + (row.jukeboxTotalRequests || 0);
    row.dbAcceptedCount = (m.acceptedRequests || 0) + (j.acceptedRequests || 0);
    row.dbRejectedCount = (m.rejectedRequests || 0) + (j.rejectedRequests || 0);
    row.dbPendingDjCount = (m.pendingDjRequests || 0) + (j.pendingDjRequests || 0);
    row.dbUnpaidAbandonedCount =
      (m.unpaidAbandonedRequests || 0) + (j.unpaidAbandonedRequests || 0);
    row.dbPendingCount = row.dbPendingDjCount;
    row.visitToPaymentConversion = row.venueFunnelConversionPct;
  }
}

async function buildAnalyticsFunnel(query = {}) {
  const { from, toExclusive, appliedRange } = resolveAnalyticsWindow(query);

  const events = await AnalyticsEvent.find({
    createdAt: { $gte: from, $lt: toExclusive }
  })
    .lean()
    .exec();

  const { totals, venueMap, scanVisitHourCounts, globalSources } = processEventsToFunnelData(events);

  const hottestScanTimes = Object.entries(scanVisitHourCounts)
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => b.count - a.count);

  const venues = [];

  for (const [, row] of venueMap) {
    row.venueFunnelConversionPct = pct(row.analyticsCheckoutCompletions, row.venuePageVisits);
    row.visitToPaymentConversion = row.venueFunnelConversionPct;

    let maxH = null;
    let maxC = 0;
    for (const [h, c] of Object.entries(row._pageVisitHours)) {
      if (c > maxC) {
        maxC = c;
        maxH = h;
      }
    }
    row.hottestHour = maxH;

    for (const s of Object.values(row.sources)) {
      s.conversion = pct(s.analyticsCheckoutCompletions, s.visits);
    }

    delete row._pageVisitHours;
    venues.push(row);
  }

  await mergeVenuesFromDbActivity(venues, from, toExclusive);
  await attachVenueMeta(venues);

  venues.sort((a, b) => (b.venuePageVisits || 0) - (a.venuePageVisits || 0));

  for (const s of Object.values(globalSources)) {
    s.conversion = pct(s.analyticsCheckoutCompletions, s.visits);
  }

  await enrichVenuesWithDbStats(venues, from, toExclusive);

  const dbTotals = await aggregateGlobalDbStats(from, toExclusive);

  const analyticsTotals = {
    qrScans: totals.qrScans,
    venuePageVisits: totals.venuePageVisits,
    analyticsCheckoutCompletions: totals.analyticsCheckoutCompletions,
    overallFunnelConversionPct: totals.overallFunnelConversionPct,
    visitToPaymentConversionPct: totals.visitToPaymentConversionPct,
    venueSelections: totals.venueSelections,
    songSearches: totals.songSearches,
    checkoutsStarted: totals.checkoutsStarted,
    requestsStarted: totals.requestsStarted
  };

  const dateRange = {
    from: from.toISOString(),
    to: new Date(toExclusive.getTime() - 1).toISOString(),
    timezone: `${TZ} (London)`
  };

  return {
    appliedRange,
    dateRange,
    analyticsTotals,
    dbTotals,
    venues,
    hottestScanTimes,
    sources: globalSources
  };
}

function venueFunnelRowFromEvents(events, venueId, venueName) {
  const vid = String(venueId);
  const map = new Map();
  ensureVenue(map, vid, venueName);
  const vrow = map.get(vid);

  for (const e of events) {
    const evVid = e.venueId ? String(e.venueId) : "";
    if (evVid !== vid) continue;
    const src = e.src || "";
    const created = e.createdAt ? new Date(e.createdAt) : new Date();
    if (e.venueName && vrow.venueName === "Unknown venue") vrow.venueName = e.venueName;
    switch (e.eventType) {
      case "qr_scan_landing":
        vrow.venueTaggedQrScans++;
        break;
      case "venue_selected":
        vrow.venueSelections++;
        ensureSource(vrow.sources, src).selections++;
        break;
      case "venue_page_visit": {
        vrow.venuePageVisits++;
        ensureSource(vrow.sources, src).visits++;
        const hlPv = hourLabelLondon(created);
        vrow._pageVisitHours[hlPv] = (vrow._pageVisitHours[hlPv] || 0) + 1;
        break;
      }
      case "song_search":
        vrow.songSearches++;
        break;
      case "request_started":
        vrow.requestsStarted++;
        break;
      case "checkout_started":
        vrow.checkoutsStarted++;
        break;
      case "payment_completed":
        vrow.analyticsCheckoutCompletions++;
        ensureSource(vrow.sources, src).analyticsCheckoutCompletions++;
        break;
      default:
        break;
    }
  }

  let maxH = null;
  let maxC = 0;
  for (const [h, c] of Object.entries(vrow._pageVisitHours)) {
    if (c > maxC) {
      maxC = c;
      maxH = h;
    }
  }
  vrow.hottestHour = maxH;
  delete vrow._pageVisitHours;

  vrow.venueFunnelConversionPct = pct(vrow.analyticsCheckoutCompletions, vrow.venuePageVisits);
  vrow.visitToPaymentConversion = vrow.venueFunnelConversionPct;
  for (const s of Object.values(vrow.sources)) {
    s.conversion = pct(s.analyticsCheckoutCompletions, s.visits);
  }
  return vrow;
}

async function buildVenueAnalyticsDeepDive(venueId, query = {}) {
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

  const events = await AnalyticsEvent.find({
    createdAt: { $gte: from, $lt: toExclusive }
  })
    .lean()
    .exec();

  const oid = new mongoose.Types.ObjectId(venueId);

  const [reqDocs, jbDocs] = await Promise.all([
    Request.find({ venueId: oid, createdAt: { $gte: from, $lt: toExclusive } }).lean().exec(),
    JukeboxRequest.find({ venueId: oid, createdAt: { $gte: from, $lt: toExclusive } }).lean().exec()
  ]);

  const mixmind = summarizeMixMindRequests(reqDocs);
  const jukebox = summarizeJukeboxRequests(jbDocs);
  const djAcceptedSongs = reqDocs.filter(isDjAcceptedSong).length;
  const jukeboxAcceptedSongs = jbDocs.filter(isJukeboxAcceptedSong).length;

  const funnelVenue = venueFunnelRowFromEvents(events, venueId, venue.name);
  const hourlyActivity = venueHourlyFromEvents(events, venueId);

  const reqSorted = reqDocs.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const jbSorted = jbDocs.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const recentMixmind = reqSorted.slice(0, 10).map((r) => ({
    _id: r._id,
    title: r.title || r.songTitle,
    artist: r.artist || r.artistName,
    status: r.status,
    paymentStatus: r.paymentStatus,
    price: r.price,
    paidAmount: r.paidAmount,
    createdAt: r.createdAt
  }));

  const recentJukebox = jbSorted.slice(0, 10).map((r) => ({
    _id: r._id,
    trackName: r.trackName,
    artistName: r.artistName,
    status: r.status,
    paymentStatus: r.paymentStatus,
    amountPence: r.amountPence,
    createdAt: r.createdAt
  }));

  return {
    appliedRange,
    dateRange: {
      from: from.toISOString(),
      to: new Date(toExclusive.getTime() - 1).toISOString(),
      timezone: `${TZ} (London)`
    },
    venue: {
      id: String(venue._id),
      name: venue.name,
      isActive: venue.isActive !== undefined ? !!venue.isActive : true
    },
    funnel: funnelVenue,
    hourlyActivity,
    sources: funnelVenue.sources,
    djAcceptedSongs,
    jukeboxAcceptedSongs,
    mixmind: {
      ...mixmind,
      recent: recentMixmind
    },
    jukebox: {
      ...jukebox,
      recent: recentJukebox
    }
  };
}

module.exports = {
  buildAnalyticsFunnel,
  buildVenueAnalyticsDeepDive,
  resolveAnalyticsWindow,
  startOfLondonDay,
  startOfNextLondonDay,
  londonYmd,
  mixmindRequestAmount
};
