const { readGlobalPricing } = require("./globalPricingStore");

const DEFAULTS = {
  spotifyJukeboxPrice: 1.0,
  djNormalPrice: 2.0,
  djPriorityPrice: 4.99,
};

const NON_DJ_PRIORITY_PRICE = 2.99;
/** Fallback Queue Jump Fee when global setting is missing. */
const QUEUE_JUMP_FEE = 0.99;

function usesGlobalPricing(venue) {
  return venue?.useGlobalPricing !== false;
}

function getGlobalPricing(venue) {
  return venue?.globalPricing ?? readGlobalPricing();
}

/**
 * queueJump in global pricing is an ADDITIONAL FEE, not a final price.
 * Final Queue Jump total = standardRequest + queueJumpFee.
 */
function resolveVenuePrices(venue) {
  const global = getGlobalPricing(venue);
  const useGlobal = usesGlobalPricing(venue);
  const djNormalPrice = venue?.djNormalPrice ?? DEFAULTS.djNormalPrice;
  const djPriorityPrice = venue?.djPriorityPrice ?? DEFAULTS.djPriorityPrice;

  const spotifyJukeboxPrice = useGlobal
    ? global.standardRequest ?? DEFAULTS.spotifyJukeboxPrice
    : venue?.spotifyJukeboxPrice ?? DEFAULTS.spotifyJukeboxPrice;

  const queueJumpFee = global.queueJump ?? QUEUE_JUMP_FEE;
  const queueJumpPrice = spotifyJukeboxPrice + queueJumpFee;
  const playNextPrice = useGlobal
    ? global.playNext ?? DEFAULTS.djPriorityPrice
    : djPriorityPrice;

  return {
    spotifyJukeboxPrice,
    queueJumpFee,
    queueJumpPrice,
    playNextPrice,
    djNormalPrice,
    djPriorityPrice,
  };
}

function resolveSpotifyRequestPrice(venue, { queueJump = false } = {}) {
  const prices = resolveVenuePrices(venue);
  return queueJump ? prices.queueJumpPrice : prices.spotifyJukeboxPrice;
}

function resolveRequestPrice(venue, { djMode, isPriority }) {
  const prices = resolveVenuePrices(venue);
  if (djMode) {
    return isPriority ? prices.djPriorityPrice : prices.djNormalPrice;
  }
  if (isPriority) {
    return NON_DJ_PRIORITY_PRICE;
  }
  return prices.spotifyJukeboxPrice;
}

function attachGlobalPricingToVenue(venue) {
  const obj = venue?.toObject ? venue.toObject() : { ...venue };
  return {
    ...obj,
    globalPricing: readGlobalPricing(),
  };
}

function toPence(gbp) {
  return Math.round(Number(gbp) * 100);
}

function validatePricingField(value, fieldName) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return `${fieldName} must be a number`;
  }
  if (fieldName === "standardRequest" || fieldName === "queueJump") {
    if (num < 0) {
      return `${fieldName} must be at least 0`;
    }
  } else if (num <= 0) {
    return `${fieldName} must be greater than 0`;
  }
  if (num > 100) {
    return `${fieldName} must be at most 100`;
  }
  return null;
}

module.exports = {
  DEFAULTS,
  NON_DJ_PRIORITY_PRICE,
  QUEUE_JUMP_FEE,
  usesGlobalPricing,
  getGlobalPricing,
  resolveVenuePrices,
  resolveSpotifyRequestPrice,
  resolveRequestPrice,
  attachGlobalPricingToVenue,
  toPence,
  validatePricingField,
};
