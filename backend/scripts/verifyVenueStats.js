/**
 * Verify unified stats for a venue — read-only audit.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Request = require("../models/Request");
const { buildVenueRequestStats, aggregateRequestStats } = require("../services/requestStatsService");
const { buildMoneyVenue } = require("../services/adminMoneyService");

const VENUE_ID = process.argv[2] || "69ea6744cabcbb89ba52084e";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const oid = new mongoose.Types.ObjectId(VENUE_ID);

  const reqDocs = await Request.find({ venueId: oid }).lean();
  const raw = aggregateRequestStats(reqDocs, []);

  const shared = await buildVenueRequestStats(VENUE_ID);

  const moneyAllTime = await buildMoneyVenue(VENUE_ID, {
    range: "custom",
    startDate: "2020-01-01",
    endDate: "2030-12-31",
  });

  const pick = (s) => ({
    totalRequests: s.totalRequests,
    acceptedRequests: s.acceptedRequests,
    rejectedRequests: s.rejectedRequests,
    pendingDjRequests: s.pendingDjRequests,
    unpaidAbandonedRequests: s.unpaidAbandonedRequests,
    potentialRevenue: s.potentialRevenue,
    earnedRevenue: s.earnedRevenue,
    lostRevenue: s.lostRevenue,
    pendingRevenue: s.pendingRevenue,
  });

  const report = {
    venueId: VENUE_ID,
    rawDbViaAggregate: pick(raw.totals),
    sharedServiceVenueEndpoint: pick(shared),
    adminMoneyAllTime: pick(moneyAllTime.totals),
    venueDashboardWouldShow: pick(shared),
  };

  console.log(JSON.stringify(report, null, 2));

  const a = JSON.stringify(pick(raw.totals));
  const b = JSON.stringify(pick(shared));
  const c = JSON.stringify(pick(moneyAllTime.totals));
  console.log("\nMATCH:", a === b && b === c ? "YES — all identical" : "NO — mismatch detected");

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
