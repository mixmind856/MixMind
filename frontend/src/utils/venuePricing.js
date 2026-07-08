const DEFAULTS = {
  spotifyJukeboxPrice: 1.0,
  djNormalPrice: 2.0,
  djPriorityPrice: 4.99,
};

export const QUEUE_JUMP_FEE = 1.0;

export function resolveVenuePrices(venue) {
  return {
    spotifyJukeboxPrice:
      venue?.spotifyJukeboxPrice ?? DEFAULTS.spotifyJukeboxPrice,
    djNormalPrice: venue?.djNormalPrice ?? DEFAULTS.djNormalPrice,
    djPriorityPrice: venue?.djPriorityPrice ?? DEFAULTS.djPriorityPrice,
  };
}

export function resolveSpotifyRequestPrice(venue, { queueJump = false } = {}) {
  const basePrice = resolveVenuePrices(venue).spotifyJukeboxPrice;
  if (queueJump) {
    return basePrice + QUEUE_JUMP_FEE;
  }
  return basePrice;
}

export function formatGbp(amount) {
  return `£${Number(amount).toFixed(2)}`;
}

export function getNormalRequestPrice(venue) {
  const prices = resolveVenuePrices(venue);
  return venue?.djMode ? prices.djNormalPrice : prices.spotifyJukeboxPrice;
}
