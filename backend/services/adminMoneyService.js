const mongoose = require("mongoose");
const Venue = require("../models/Venue");
const { resolveAnalyticsWindow } = require("./analyticsFunnelService");
const {
  emptyStats,
  addStats,
  finalizeStats,
  classifyMixMindRequest,
  classifyJukeboxRequest,
  statsFromMixMindClassification,
  statsFromJukeboxClassification,
  fetchRequestDocs,
  mixmindRequestAmount,
  jukeboxRequestAmount,
} = require("./requestStatsService");

const TZ = "Europe/London";

function londonYmdFromDate(d) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d instanceof Date ? d : new Date(d));
}

function processMixMindRequest(r, venueName) {
  const classification = classifyMixMindRequest(r);
  const stats = statsFromMixMindClassification(classification);
  const createdAt = r.createdAt ? new Date(r.createdAt) : new Date();
  const revenue = {
    potentialRevenue: classification.potentialRevenue,
    earnedRevenue: classification.earnedRevenue,
    lostRevenue: classification.lostRevenue,
    pendingRevenue: classification.pendingRevenue,
  };

  return {
    stats,
    recent: {
      id: String(r._id),
      mode: "MixMind",
      songTitle: r.title || r.songTitle || "",
      artist: r.artist || r.artistName || "",
      requesterName: r.userName || "",
      status: r.status,
      paymentStatus: r.paymentStatus,
      bucket: classification.bucket,
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
      bucket: classification.bucket,
      ...revenue,
      createdAt: createdAt.toISOString(),
    },
  };
}

function processJukeboxRequest(r, venueName) {
  const classification = classifyJukeboxRequest(r);
  const stats = statsFromJukeboxClassification(classification);
  const createdAt = r.createdAt ? new Date(r.createdAt) : new Date();
  const revenue = {
    potentialRevenue: classification.potentialRevenue,
    earnedRevenue: classification.earnedRevenue,
    lostRevenue: classification.lostRevenue,
    pendingRevenue: classification.pendingRevenue,
  };

  return {
    stats,
    recent: {
      id: String(r._id),
      mode: "Jukebox",
      songTitle: r.trackName || "",
      artist: r.artistName || "",
      requesterName: r.requesterName || "",
      status: r.status,
      paymentStatus: r.paymentStatus,
      bucket: classification.bucket,
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
      bucket: classification.bucket,
      ...revenue,
      createdAt: createdAt.toISOString(),
    },
  };
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
  const { reqDocs, jbDocs } = await fetchRequestDocs({ from, toExclusive });

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
  const { reqDocs, jbDocs } = await fetchRequestDocs({
    venueId,
    from,
    toExclusive,
  });

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
