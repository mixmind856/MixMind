/**
 * Compare 331 Club stats: all-time vs temporary dashboard filter (createdAt >= 2026-05-20).
 * Read-only — does not modify Request documents.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Request = require("../models/Request");
const JukeboxRequest = require("../models/JukeboxRequest");
const {
  aggregateRequestStats,
  TEMP_DASHBOARD_STATS_MIN_CREATED_AT,
  TEMP_DASHBOARD_STATS_FILTER_ENABLED,
} = require("../services/requestStatsService");
const { buildVenueRequestStats } = require("../services/requestStatsService");

const VENUE_ID = "69ea6744cabcbb89ba52084e";

function pick(stats) {
  return {
    accepted: stats.acceptedRequests,
    rejected: stats.rejectedRequests,
    pending: stats.pendingDjRequests,
    abandoned: stats.unpaidAbandonedRequests,
    earnedRevenue: stats.earnedRevenue,
    lostRevenue: stats.lostRevenue,
    total: stats.totalRequests,
  };
}

async function allTimeUnfiltered(venueId) {
  const oid = new mongoose.Types.ObjectId(venueId);
  const [reqDocs, jbDocs] = await Promise.all([
    Request.find({ venueId: oid }).lean().exec(),
    JukeboxRequest.find({ venueId: oid }).lean().exec(),
  ]);
  return aggregateRequestStats(reqDocs, jbDocs).totals;
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const current = pick(await allTimeUnfiltered(VENUE_ID));
  // Venue dashboard + money/all-time share fetchRequestDocs (no upper date bound).
  const filteredAllTime = pick(await buildVenueRequestStats(VENUE_ID));

  const excluded = await Request.find({
    venueId: new mongoose.Types.ObjectId(VENUE_ID),
    createdAt: { $lt: TEMP_DASHBOARD_STATS_MIN_CREATED_AT },
  })
    .select("title songTitle createdAt djApprovedAt djRejectedAt paymentStatus price")
    .sort({ createdAt: 1 })
    .lean();

  console.log(
    JSON.stringify(
      {
        venueId: VENUE_ID,
        filterEnabled: TEMP_DASHBOARD_STATS_FILTER_ENABLED,
        filterMinCreatedAt: TEMP_DASHBOARD_STATS_MIN_CREATED_AT.toISOString(),
        currentTotalsAllTimeUnfiltered: current,
        filteredTotalsAllTime: {
          venueDashboard: filteredAllTime,
          moneyDashboardAllTime: filteredAllTime,
          adminVenueDetailAllTime: filteredAllTime,
          note:
            "Venue + money + admin venue stats all use requestStatsService.fetchRequestDocs; all-time filtered counts match.",
        },
        excludedRequestCount: excluded.length,
        excludedRequests: excluded.map((r) => ({
          title: r.title || r.songTitle,
          createdAt: r.createdAt,
          djApprovedAt: r.djApprovedAt || null,
          djRejectedAt: r.djRejectedAt || null,
          paymentStatus: r.paymentStatus,
          price: r.price,
        })),
        delta: {
          accepted: current.accepted - filteredAllTime.accepted,
          rejected: current.rejected - filteredAllTime.rejected,
          pending: current.pending - filteredAllTime.pending,
          abandoned: current.abandoned - filteredAllTime.abandoned,
          earnedRevenue: Number((current.earnedRevenue - filteredAllTime.earnedRevenue).toFixed(2)),
          lostRevenue: Number((current.lostRevenue - filteredAllTime.lostRevenue).toFixed(2)),
          total: current.total - filteredAllTime.total,
        },
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
