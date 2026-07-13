const { readPayoutCalculatorConfig } = require("./payoutCalculatorStore");

/**
 * Single source of truth for MixMind payout maths.
 * All PDFs, balances, and reports must call these helpers.
 */

function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function getConfig(configOverride) {
  return configOverride || readPayoutCalculatorConfig();
}

function calculatePlaylistPayout(customerPays, configOverride) {
  const config = getConfig(configOverride);
  const pl = config.playlistMode;
  const paid = roundMoney(customerPays);
  const stripeFee = roundMoney(pl.stripeFee);
  const platformCost = roundMoney(pl.platformCost);
  const remaining = roundMoney(Math.max(0, paid - stripeFee - platformCost));
  const venueSharePct = Number(pl.venueSharePct) || 0;
  const mixmindSharePct = Number(pl.mixmindSharePct) || 0;
  const venue = roundMoney((remaining * venueSharePct) / 100);
  const mixmind = roundMoney((remaining * mixmindSharePct) / 100);

  return {
    mode: "playlist",
    customerPays: paid,
    stripeFee,
    platformCost,
    remaining,
    venueSharePct,
    mixmindSharePct,
    venue,
    mixmind,
  };
}

function calculateDjPayout(customerPrice, mixmindShare, stripeFee) {
  const price = roundMoney(customerPrice);
  const fee = roundMoney(stripeFee);
  const commission = roundMoney(mixmindShare);
  const venueReceives = roundMoney(Math.max(0, price - fee - commission));

  return {
    mode: "dj",
    customerPrice: price,
    stripeFee: fee,
    mixmindShare: commission,
    venueReceives,
  };
}

function calculateDjNormalPayout(configOverride) {
  const config = getConfig(configOverride);
  const dn = config.djNormal;
  return {
    ...calculateDjPayout(dn.customerPrice, dn.mixmindShare, dn.stripeFee),
    variant: "normal",
  };
}

function calculateDjPriorityPayout(configOverride) {
  const config = getConfig(configOverride);
  const dp = config.djPriority;
  return {
    ...calculateDjPayout(dp.customerPrice, dp.mixmindShare, dp.stripeFee),
    variant: "priority",
  };
}

function calculateDjPayoutForAmount(amountGbp, { isPriority = false } = {}, configOverride) {
  const config = getConfig(configOverride);
  const settings = isPriority ? config.djPriority : config.djNormal;
  return calculateDjPayout(amountGbp, settings.mixmindShare, settings.stripeFee);
}

/**
 * Period aggregation for statements / balances.
 * Uses earned revenue totals + successful paid request counts.
 */
function calculatePeriodFinancials(
  {
    playlistEarned = 0,
    djEarned = 0,
    playlistPaidSuccessCount = 0,
    djPaidSuccessCount = 0,
    djPriorityPaidSuccessCount = 0,
  } = {},
  configOverride
) {
  const config = getConfig(configOverride);
  const playlistEarnedR = roundMoney(playlistEarned);
  const djEarnedR = roundMoney(djEarned);
  const grossRevenue = roundMoney(playlistEarnedR + djEarnedR);

  const playlistPaid = Math.max(0, Number(playlistPaidSuccessCount) || 0);
  const djNormalPaid = Math.max(0, Number(djPaidSuccessCount) || 0);
  const djPriorityPaid = Math.max(0, Number(djPriorityPaidSuccessCount) || 0);

  const playlistStripeFees = roundMoney(playlistPaid * config.playlistMode.stripeFee);
  const playlistPlatformCost = roundMoney(playlistPaid * config.playlistMode.platformCost);
  const playlistRemaining = roundMoney(
    Math.max(0, playlistEarnedR - playlistStripeFees - playlistPlatformCost)
  );
  const playlistVenue = roundMoney(
    (playlistRemaining * config.playlistMode.venueSharePct) / 100
  );
  const playlistMixmind = roundMoney(
    (playlistRemaining * config.playlistMode.mixmindSharePct) / 100
  );

  const djNormalStripe = roundMoney(djNormalPaid * config.djNormal.stripeFee);
  const djPriorityStripe = roundMoney(djPriorityPaid * config.djPriority.stripeFee);
  const djStripeFees = roundMoney(djNormalStripe + djPriorityStripe);

  const djNormalMixmind = roundMoney(djNormalPaid * config.djNormal.mixmindShare);
  const djPriorityMixmind = roundMoney(djPriorityPaid * config.djPriority.mixmindShare);
  const djMixmind = roundMoney(djNormalMixmind + djPriorityMixmind);

  const djVenue = roundMoney(Math.max(0, djEarnedR - djStripeFees - djMixmind));

  const stripeFees = roundMoney(playlistStripeFees + djStripeFees);
  const mixmindCommission = roundMoney(playlistMixmind + djMixmind);
  const netVenuePayout = roundMoney(playlistVenue + djVenue);

  return {
    grossRevenue,
    stripeFees,
    platformCost: playlistPlatformCost,
    mixmindCommission,
    netVenuePayout,
    totalPayable: netVenuePayout,
    breakdown: {
      playlist: {
        earned: playlistEarnedR,
        stripeFees: playlistStripeFees,
        platformCost: playlistPlatformCost,
        remaining: playlistRemaining,
        venue: playlistVenue,
        mixmind: playlistMixmind,
      },
      dj: {
        earned: djEarnedR,
        stripeFees: djStripeFees,
        mixmind: djMixmind,
        venue: djVenue,
      },
    },
  };
}

/** Split ratios for Stripe transfer helpers (live / playlist). */
function getPlaylistSplitRatios(configOverride) {
  const config = getConfig(configOverride);
  const venue = (Number(config.playlistMode.venueSharePct) || 0) / 100;
  const mixmind = (Number(config.playlistMode.mixmindSharePct) || 0) / 100;
  return { venueShare: venue, platformShare: mixmind };
}

/**
 * Absolute £ splits for a DJ capture amount (GBP), using calculator fees/shares.
 * Remainder after venue + MixMind is treated as DJ operator share when positive.
 */
function getDjSplitAmountsGbp(amountGbp, { isPriority = false } = {}, configOverride) {
  const config = getConfig(configOverride);
  const settings = isPriority ? config.djPriority : config.djNormal;
  const amount = roundMoney(amountGbp);
  const stripeFee = roundMoney(settings.stripeFee);
  const mixmindShare = roundMoney(settings.mixmindShare);
  const venue = roundMoney(Math.max(0, amount - stripeFee - mixmindShare));
  const remainderForDj = roundMoney(Math.max(0, amount - venue - mixmindShare - stripeFee));
  // If formula exhausts amount into fee+share+venue, DJ operator gets 0 from calculator.
  // Preserve a residual "dj" pool only when amount exceeds venue+mixmind+fee.
  return {
    venue,
    platform: mixmindShare,
    dj: remainderForDj,
    stripeFee,
  };
}

/** Convert GBP DJ split to integer pence for Stripe transfers from amountCents. */
function getDjSplitAmountsCents(amountCents, { isPriority = false } = {}, configOverride) {
  const amountGbp = (Number(amountCents) || 0) / 100;
  const gbp = getDjSplitAmountsGbp(amountGbp, { isPriority }, configOverride);
  const venueAmount = Math.floor(gbp.venue * 100);
  const platformAmount = Math.floor(gbp.platform * 100);
  // Stripe fee stays with Stripe — not transferred. DJ gets remaining after venue+platform.
  const djAmount = Math.max(0, amountCents - venueAmount - platformAmount);
  return { venueAmount, platformAmount, djAmount };
}

function getLiveSplitAmountsCents(amountCents, configOverride) {
  const { venueShare } = getPlaylistSplitRatios(configOverride);
  const venueAmount = Math.floor(amountCents * venueShare);
  const platformAmount = amountCents - venueAmount;
  return { venueAmount, platformAmount };
}

function buildCalculatorPreview(configOverride) {
  const config = getConfig(configOverride);
  return {
    config,
    playlistExample: calculatePlaylistPayout(
      config.playlistMode.exampleCustomerPays,
      config
    ),
    djNormal: calculateDjNormalPayout(config),
    djPriority: calculateDjPriorityPayout(config),
  };
}

module.exports = {
  calculatePlaylistPayout,
  calculateDjPayout,
  calculateDjNormalPayout,
  calculateDjPriorityPayout,
  calculateDjPayoutForAmount,
  calculatePeriodFinancials,
  getPlaylistSplitRatios,
  getDjSplitAmountsGbp,
  getDjSplitAmountsCents,
  getLiveSplitAmountsCents,
  buildCalculatorPreview,
};
