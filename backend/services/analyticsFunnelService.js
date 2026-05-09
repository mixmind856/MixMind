const AnalyticsEvent = require("../models/AnalyticsEvent");
const Venue = require("../models/Venue");

const TZ = "Europe/London";

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

async function buildAnalyticsFunnel(query = {}) {
  let from;
  let toExclusive;

  if (query.from && query.to) {
    from = new Date(query.from);
    toExclusive = new Date(query.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(toExclusive.getTime())) {
      const now = new Date();
      from = startOfLondonDay(now);
      toExclusive = startOfNextLondonDay(from);
    }
  } else {
    const now = new Date();
    from = startOfLondonDay(now);
    toExclusive = startOfNextLondonDay(from);
  }

  const events = await AnalyticsEvent.find({
    createdAt: { $gte: from, $lt: toExclusive }
  })
    .lean()
    .exec();

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

  const dateRange = {
    from: from.toISOString(),
    to: new Date(toExclusive.getTime() - 1).toISOString(),
    timezone: `${TZ} (London)`
  };

  return {
    dateRange,
    totals,
    venues,
    hottestScanTimes,
    sources: globalSources
  };
}

module.exports = {
  buildAnalyticsFunnel,
  startOfLondonDay,
  startOfNextLondonDay,
  londonYmd
};
