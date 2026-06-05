const DEFAULTS = {
  spotifyJukeboxPrice: 1.0,
  djNormalPrice: 2.0,
  djPriorityPrice: 4.99,
};

export function resolveVenuePrices(venue) {
  return {
    spotifyJukeboxPrice:
      venue?.spotifyJukeboxPrice ?? DEFAULTS.spotifyJukeboxPrice,
    djNormalPrice: venue?.djNormalPrice ?? DEFAULTS.djNormalPrice,
    djPriorityPrice: venue?.djPriorityPrice ?? DEFAULTS.djPriorityPrice,
  };
}

export function formatGbp(amount) {
  return `£${Number(amount).toFixed(2)}`;
}

export function getNormalRequestPrice(venue) {
  const prices = resolveVenuePrices(venue);
  return venue?.djMode ? prices.djNormalPrice : prices.spotifyJukeboxPrice;
}
