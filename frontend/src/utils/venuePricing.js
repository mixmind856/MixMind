const DEFAULTS = {
  spotifyJukeboxPrice: 1.0,
  djNormalPrice: 2.0,
  djPriorityPrice: 4.99,
};

export const QUEUE_JUMP_FEE = 0.99;

function usesGlobalPricing(venue) {
  return venue?.useGlobalPricing !== false;
}

function getGlobalPricing(venue) {
  return venue?.globalPricing ?? null;
}

export function resolveVenuePrices(venue) {
  const global = getGlobalPricing(venue);
  const useGlobal = usesGlobalPricing(venue);
  const djNormalPrice = venue?.djNormalPrice ?? DEFAULTS.djNormalPrice;
  const djPriorityPrice = venue?.djPriorityPrice ?? DEFAULTS.djPriorityPrice;

  let spotifyJukeboxPrice;
  let queueJumpPrice;
  let playNextPrice;

  if (useGlobal && global) {
    spotifyJukeboxPrice = global.standardRequest ?? DEFAULTS.spotifyJukeboxPrice;
    queueJumpPrice = global.queueJump ?? spotifyJukeboxPrice + QUEUE_JUMP_FEE;
    playNextPrice = global.playNext ?? DEFAULTS.djPriorityPrice;
  } else if (useGlobal) {
    spotifyJukeboxPrice = DEFAULTS.spotifyJukeboxPrice;
    queueJumpPrice = DEFAULTS.spotifyJukeboxPrice + QUEUE_JUMP_FEE;
    playNextPrice = DEFAULTS.djPriorityPrice;
  } else {
    spotifyJukeboxPrice = venue?.spotifyJukeboxPrice ?? DEFAULTS.spotifyJukeboxPrice;
    queueJumpPrice = spotifyJukeboxPrice + QUEUE_JUMP_FEE;
    playNextPrice = djPriorityPrice;
  }

  return {
    spotifyJukeboxPrice,
    queueJumpPrice,
    playNextPrice,
    djNormalPrice,
    djPriorityPrice,
  };
}

export function resolveSpotifyRequestPrice(venue, { queueJump = false } = {}) {
  const prices = resolveVenuePrices(venue);
  return queueJump ? prices.queueJumpPrice : prices.spotifyJukeboxPrice;
}

export function formatGbp(amount) {
  return `£${Number(amount).toFixed(2)}`;
}

export function getNormalRequestPrice(venue) {
  const prices = resolveVenuePrices(venue);
  return venue?.djMode ? prices.djNormalPrice : prices.spotifyJukeboxPrice;
}
