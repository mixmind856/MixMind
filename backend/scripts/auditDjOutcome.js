/**
 * DJ-outcome-only audit — read-only.
 * Outcome from djApprovedAt / djRejectedAt only; payment for pending vs abandoned.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Request = require("../models/Request");

const VENUE_ID = process.argv[2] || "69ea6744cabcbb89ba52084e";
const PAID_PAYMENT_STATUSES = ["authorized", "captured", "cancelled"];

function mixmindAmount(r) {
  const paid = Number(r.paidAmount);
  if (Number.isFinite(paid) && paid > 0) return paid;
  return Number(r.price) || 0;
}

function classifyDjOutcome(r) {
  const hasApproved = !!r.djApprovedAt;
  const hasRejected = !!r.djRejectedAt;
  const ps = r.paymentStatus || "unpaid";
  const paymentExists = PAID_PAYMENT_STATUSES.includes(ps);

  if (hasApproved) return "accepted";
  if (hasRejected) return "rejected";
  if (paymentExists) return "pending_dj";
  return "abandoned";
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI not set");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);

  const oid = new mongoose.Types.ObjectId(VENUE_ID);
  const docs = await Request.find({ venueId: oid }).lean().sort({ createdAt: 1 });

  const counts = {
    accepted: 0,
    rejected: 0,
    pending_dj: 0,
    abandoned: 0,
    total: docs.length,
  };

  const byOutcome = { accepted: [], rejected: [], pending_dj: [], abandoned: [] };

  for (const r of docs) {
    const outcome = classifyDjOutcome(r);
    counts[outcome]++;
    byOutcome[outcome].push({
      id: String(r._id),
      title: r.title || r.songTitle,
      status: r.status,
      paymentStatus: r.paymentStatus,
      djApprovedAt: r.djApprovedAt || null,
      djRejectedAt: r.djRejectedAt || null,
      price: r.price,
      paidAmount: r.paidAmount,
    });
  }

  console.log("\n=== 331 Club DJ-outcome audit ===");
  console.log(`venueId: ${VENUE_ID}`);
  console.log(`total MixMind requests: ${counts.total}\n`);

  console.log("--- Outcome counts (DJ fields only) ---");
  console.log(`Accepted (djApprovedAt):     ${counts.accepted}`);
  console.log(`Rejected (djRejectedAt):     ${counts.rejected}`);
  console.log(`Pending DJ (paid, no DJ ts): ${counts.pending_dj}`);
  console.log(`Abandoned (never authorized): ${counts.abandoned}`);

  console.log("\n--- Raw DJ timestamp counts ---");
  console.log(`djApprovedAt exists: ${docs.filter((r) => r.djApprovedAt).length}`);
  console.log(`djRejectedAt exists: ${docs.filter((r) => r.djRejectedAt).length}`);
  console.log(
    `neither timestamp:     ${docs.filter((r) => !r.djApprovedAt && !r.djRejectedAt).length}`
  );

  console.log("\n--- paymentStatus breakdown (neither DJ timestamp) ---");
  const neither = docs.filter((r) => !r.djApprovedAt && !r.djRejectedAt);
  const payBreak = {};
  for (const r of neither) {
    const k = r.paymentStatus || "null";
    payBreak[k] = (payBreak[k] || 0) + 1;
  }
  console.log(JSON.stringify(payBreak, null, 2));

  console.log("\n--- status breakdown (all requests) ---");
  const statusBreak = {};
  for (const r of docs) {
    statusBreak[r.status] = (statusBreak[r.status] || 0) + 1;
  }
  console.log(JSON.stringify(statusBreak, null, 2));

  console.log("\n--- Pending DJ requests ---");
  byOutcome.pending_dj.forEach((r) => console.log(JSON.stringify(r)));

  console.log("\n--- Abandoned requests ---");
  byOutcome.abandoned.forEach((r) => console.log(JSON.stringify(r)));

  console.log("\n--- Revenue snapshot (separate from outcome; paymentStatus-based) ---");
  let potential = 0;
  let earned = 0;
  let lost = 0;
  let pendingRev = 0;
  for (const r of docs) {
    const ps = r.paymentStatus || "unpaid";
    const amt = mixmindAmount(r);
    if (!PAID_PAYMENT_STATUSES.includes(ps)) continue;
    potential += amt;
    if (ps === "captured") earned += amt;
    else if (ps === "cancelled") lost += amt;
    else if (ps === "authorized") pendingRev += amt;
  }
  console.log(
    JSON.stringify(
      {
        potentialRevenue: Math.round(potential * 100) / 100,
        earnedRevenue: Math.round(earned * 100) / 100,
        lostRevenue: Math.round(lost * 100) / 100,
        pendingRevenue: Math.round(pendingRev * 100) / 100,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
