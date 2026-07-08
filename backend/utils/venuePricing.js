const DEFAULTS = {
  spotifyJukeboxPrice: 1.0,
  djNormalPrice: 2.0,
  djPriorityPrice: 4.99,
};

const NON_DJ_PRIORITY_PRICE = 2.99;
const QUEUE_JUMP_FEE = 1.0;

function resolveVenuePrices(venue) {
  return {
    spotifyJukeboxPrice:
      venue?.spotifyJukeboxPrice ?? DEFAULTS.spotifyJukeboxPrice,
    djNormalPrice: venue?.djNormalPrice ?? DEFAULTS.djNormalPrice,
    djPriorityPrice: venue?.djPriorityPrice ?? DEFAULTS.djPriorityPrice,
  };
}

function resolveSpotifyRequestPrice(venue, { queueJump = false } = {}) {
  const basePrice = resolveVenuePrices(venue).spotifyJukeboxPrice;
  if (queueJump) {
    return basePrice + QUEUE_JUMP_FEE;
  }
  return basePrice;
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

function toPence(gbp) {
  return Math.round(Number(gbp) * 100);
}

function validatePricingField(value, fieldName) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return `${fieldName} must be a number`;
  }
  if (num <= 0) {
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
  resolveVenuePrices,
  resolveSpotifyRequestPrice,
  resolveRequestPrice,
  toPence,
  validatePricingField,
};
