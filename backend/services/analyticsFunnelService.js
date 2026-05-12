const mongoose = require("mongoose");
const AnalyticsEvent = require("../models/AnalyticsEvent");
const Venue = require("../models/Venue");
const Request = require("../models/Request");
const JukeboxRequest = require("../models/JukeboxRequest");

const TZ = "Europe/London";

const MIXMIND_REVENUE_STATUSES = ["queued", "paid", "approved", "processing", "completed"];
const MIXMIND_PENDING_STATUSES = ["created", "authorized", "pending_dj_approval", "analyzing"];
const MIXMIND_REJECTED_STATUSES = ["rejected", "failed"];

const JUKEBOX_PENDING = ["pending_payment", "paid_pending_genre", "genre_approved"];
const JUKEBOX_REJECTED = ["genre_rejected", "failed"];
const JUKEBOX_SUCCESS = ["queued"];

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

/** Start of calendar day YYYY-MM-DD in Europe/London */
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

/** Monday 00:00 Europe/London for the week containing `reference` */
function startOfLondonWeekMonday(reference = new Date()) {
  let t = startOfLondonDay(reference);
  for (let i = 0; i < 10; i++) {
    const wd = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short" }).format(t);
    if (String(wd).startsWith("Mon")) return t;
    t = new Date(t.getTime() - 86400000);
  }
  return startOfLondonDay(reference);
}

/** Next Monday 00:00 after `weekMonday` (start of following week) */
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
 * Resolve [from, toExclusive) and label. `from`+`to` in query take priority when both valid.
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

  /* today (default) */
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
      paymentsCompleted: 0,
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
      qrLandingVisits: 0,
      venueSelections: 0,
      venuePageVisits: 0,
      songSearches: 0,
      requestsStarted: 0,
      checkoutsStarted: 0,
      paymentsCompleted: 0,
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
    qrLandingVisits: 0,
    venueSelections: 0,
    venuePageVisits: 0,
    songSearches: 0,
    requestsStarted: 0,
    checkoutsStarted: 0,
    paymentsCompleted: 0,
    overallConversionRate: 0
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
        totals.qrLandingVisits++;
        const hlQr = hourLabelLondon(created);
        scanVisitHourCounts[hlQr] = (scanVisitHourCounts[hlQr] || 0) + 1;
        ensureSource(globalSources, src).visits++;
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
        totals.paymentsCompleted++;
        if (vid) {
          const vrow = ensureVenue(venueMap, vid, e.venueName);
          vrow.paymentsCompleted++;
          ensureSource(vrow.sources, src).paymentsCompleted++;
        }
        ensureSource(globalSources, src).paymentsCompleted++;
        break;
      default:
        break;
    }
  }

  totals.overallConversionRate = pct(totals.paymentsCompleted, totals.qrLandingVisits);

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

function mixmindRequestAmount(r) {
  const n = Number(r.paidAmount);
  if (Number.isFinite(n) && n > 0) return n;
  return Number(r.price) || 0;
}

function summarizeMixMindRequests(requests) {
  let total = 0;
  let acceptedCompleted = 0;
  let pending = 0;
  let rejectedFailed = 0;
  let capturedRevenue = 0;

  for (const r of requests) {
    total++;
    const st = r.status;
    const ps = r.paymentStatus;

    if (MIXMIND_REJECTED_STATUSES.includes(st)) {
      rejectedFailed++;
      continue;
    }
    if (MIXMIND_PENDING_STATUSES.includes(st)) {
      pending++;
      continue;
    }
    if (MIXMIND_REVENUE_STATUSES.includes(st)) {
      acceptedCompleted++;
      if (ps === "captured") {
        capturedRevenue += mixmindRequestAmount(r);
      }
    }
  }

  return { total, acceptedCompleted, pending, rejectedFailed, capturedRevenue };
}

function summarizeJukeboxRequests(rows) {
  let total = 0;
  let queuedSuccess = 0;
  let pending = 0;
  let rejected = 0;
  let revenue = 0;

  for (const r of rows) {
    total++;
    const st = r.status;
    const ps = r.paymentStatus;

    if (JUKEBOX_REJECTED.includes(st)) {
      rejected++;
      continue;
    }
    if (JUKEBOX_PENDING.includes(st)) {
      pending++;
      continue;
    }
    if (JUKEBOX_SUCCESS.includes(st)) {
      queuedSuccess++;
      if (ps === "succeeded") {
        revenue += (Number(r.amountPence) || 0) / 100;
      }
    }
  }

  return { total, queuedSuccess, pending, rejected, revenue };
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
    const m = summarizeMixMindRequests(byVenueReq[k] || []);
    const j = summarizeJukeboxRequests(byVenueJb[k] || []);

    row.mixmindTotalRequests = m.total;
    row.mixmindAcceptedCompleted = m.acceptedCompleted;
    row.mixmindPending = m.pending;
    row.mixmindRejectedFailed = m.rejectedFailed;
    row.mixmindCapturedRevenue = Math.round(m.capturedRevenue * 100) / 100;

    row.jukeboxTotalRequests = j.total;
    row.jukeboxQueuedSuccess = j.queuedSuccess;
    row.jukeboxPending = j.pending;
    row.jukeboxRejected = j.rejected;
    row.jukeboxRevenue = Math.round(j.revenue * 100) / 100;

    const totalRev = row.mixmindCapturedRevenue + row.jukeboxRevenue;
    row.totalTrueRevenue = Math.round(totalRev * 100) / 100;
    row.cardConversionPercent = row.visitToPaymentConversion;
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

  const venueIds = Array.from(venueMap.keys());
  const venuesFromDb = await Venue.find({ _id: { $in: venueIds } })
    .select("name")
    .lean()
    .exec();
  const nameById = {};
  for (const v of venuesFromDb) {
    nameById[String(v._id)] = v.name;
  }

  const venues = [];

  for (const [, row] of venueMap) {
    const dbName = nameById[row.venueId];
    if (dbName) row.venueName = dbName;

    row.visitToPaymentConversion = pct(row.paymentsCompleted, row.venuePageVisits);

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
      s.conversion = pct(s.paymentsCompleted, s.visits);
    }

    delete row._pageVisitHours;
    venues.push(row);
  }

  venues.sort((a, b) => b.venuePageVisits - a.venuePageVisits);

  for (const s of Object.values(globalSources)) {
    s.conversion = pct(s.paymentsCompleted, s.visits);
  }

  await enrichVenuesWithDbStats(venues, from, toExclusive);

  const dateRange = {
    from: from.toISOString(),
    to: new Date(toExclusive.getTime() - 1).toISOString(),
    timezone: `${TZ} (London)`
  };

  return {
    appliedRange,
    dateRange,
    totals,
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
        vrow.paymentsCompleted++;
        ensureSource(vrow.sources, src).paymentsCompleted++;
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

  vrow.visitToPaymentConversion = pct(vrow.paymentsCompleted, vrow.venuePageVisits);
  for (const s of Object.values(vrow.sources)) {
    s.conversion = pct(s.paymentsCompleted, s.visits);
  }
  return vrow;
}

async function buildVenueAnalyticsDeepDive(venueId, query = {}) {
  if (!mongoose.Types.ObjectId.isValid(venueId)) {
    const err = new Error("Invalid venue id");
    err.statusCode = 400;
    throw err;
  }

  const venue = await Venue.findById(venueId).select("name").lean().exec();
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
      name: venue.name
    },
    funnel: funnelVenue,
    hourlyActivity,
    sources: funnelVenue.sources,
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
  startOfLondonDay,
  startOfNextLondonDay,
  londonYmd
};
