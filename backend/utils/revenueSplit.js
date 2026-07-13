/**
 * Shared revenue split ratios — derived from the Payout Calculator (SSOT).
 * Prefer requiring payoutCalculator helpers directly for new code.
 */
const {
  getPlaylistSplitRatios,
  getDjSplitAmountsCents,
  getLiveSplitAmountsCents,
} = require("./payoutCalculator");

function getDjVenueShare() {
  // Legacy ratio helper — DJ venue share is now absolute via calculator.
  // Approximate from configured DJ Normal defaults for callers still expecting a ratio.
  const { getDjSplitAmountsGbp, calculateDjNormalPayout } = require("./payoutCalculator");
  const preview = calculateDjNormalPayout();
  if (!preview.customerPrice) return 0.3333;
  return preview.venueReceives / preview.customerPrice;
}

function getLiveVenueShare() {
  return getPlaylistSplitRatios().venueShare;
}

function getLivePlatformShare() {
  return getPlaylistSplitRatios().platformShare;
}

module.exports = {
  // Dynamic getters (preferred)
  getDjVenueShare,
  getLiveVenueShare,
  getLivePlatformShare,
  getDjSplitAmountsCents,
  getLiveSplitAmountsCents,
  getPlaylistSplitRatios,
  // Legacy constant names kept as getters for gradual migration
  get DJ_VENUE_SHARE() {
    return getDjVenueShare();
  },
  get LIVE_VENUE_SHARE() {
    return getLiveVenueShare();
  },
  get LIVE_PLATFORM_SHARE() {
    return getLivePlatformShare();
  },
  DJ_DJ_SHARE: 0, // DJ operator residual now comes from calculator remainder
};
