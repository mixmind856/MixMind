const JukeboxRequest = require("../models/JukeboxRequest");
const spotifyService = require("./spotifyJukebox.service");
const stripeService = require("./stripeJukebox.service");

function compareQueueOrder(a, b) {
  if (a.queueJump !== b.queueJump) {
    return a.queueJump ? -1 : 1;
  }
  return new Date(a.createdAt) - new Date(b.createdAt);
}

async function addAndCaptureRequest(req) {
  await spotifyService.addToQueue(req.venueId, req.spotifyUri);
  await stripeService.capturePayment(req.stripePaymentIntentId);
  req.status = "queued";
  req.paymentStatus = "succeeded";
  req.processedAt = new Date();
  await req.save();
}

async function processVenueQueue(venueId) {
  const pending = await JukeboxRequest.find({
    venueId,
    status: "genre_approved",
    paymentStatus: "requires_capture",
  });

  if (!pending.length) return;

  pending.sort(compareQueueOrder);

  for (const req of pending) {
    await addAndCaptureRequest(req);
  }
}

async function enqueueAfterGenreApproval(jukeboxReq) {
  await processVenueQueue(jukeboxReq.venueId);
}

function getLondonDateString() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(
    new Date()
  );
}

function getDailyQueueJumpSeed(venueId) {
  const input = `${String(venueId)}:${getLondonDateString()}`;
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return (hash % 2) + 1;
}

function getStartOfLondonDay() {
  const londonDate = getLondonDateString();
  const [year, month, day] = londonDate.split("-").map(Number);
  const noonUtc = Date.UTC(year, month - 1, day, 12, 0, 0);

  for (let h = 0; h <= 24; h += 1) {
    const ts = noonUtc - h * 3600000;
    const d = new Date(ts);
    const dateInLondon = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/London",
    }).format(d);
    const hourInLondon = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London",
        hour: "2-digit",
        hour12: false,
      }).format(d)
    );
    if (dateInLondon === londonDate && hourInLondon === 0) {
      return new Date(ts);
    }
  }

  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
}

async function getQueueJumpSocialProof(venueId) {
  const startOfDay = getStartOfLondonDay();
  const todayCount = await JukeboxRequest.countDocuments({
    venueId,
    queueJump: true,
    paymentStatus: "succeeded",
    createdAt: { $gte: startOfDay },
  });
  const seed = getDailyQueueJumpSeed(venueId);

  return {
    todayCount,
    seed,
    displayCount: todayCount + seed,
  };
}

module.exports = {
  compareQueueOrder,
  processVenueQueue,
  enqueueAfterGenreApproval,
  getQueueJumpSocialProof,
  getDailyQueueJumpSeed,
};
