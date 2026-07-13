const DEFAULTS = {
  spotifyJukeboxPrice: 1.0,
  djNormalPrice: 2.0,
  djPriorityPrice: 4.99,
};

/** Fallback Queue Jump Fee when global setting is missing. */
export const QUEUE_JUMP_FEE = 0.99;

function usesGlobalPricing(venue) {
  return venue?.useGlobalPricing !== false;
}

function getGlobalPricing(venue) {
  return venue?.globalPricing ?? null;
}

/**
 * queueJump in globalPricing is an ADDITIONAL FEE, not a final price.
 * Final total = standardRequest + queueJumpFee.
 */
export function resolveVenuePrices(venue) {
  const global = getGlobalPricing(venue);
  const useGlobal = usesGlobalPricing(venue);
  const djNormalPrice = venue?.djNormalPrice ?? DEFAULTS.djNormalPrice;
  const djPriorityPrice = venue?.djPriorityPrice ?? DEFAULTS.djPriorityPrice;

  let spotifyJukeboxPrice;
  if (useGlobal && global) {
    spotifyJukeboxPrice = global.standardRequest ?? DEFAULTS.spotifyJukeboxPrice;
  } else if (useGlobal) {
    spotifyJukeboxPrice = DEFAULTS.spotifyJukeboxPrice;
  } else {
    spotifyJukeboxPrice = venue?.spotifyJukeboxPrice ?? DEFAULTS.spotifyJukeboxPrice;
  }

  const queueJumpFee =
    global?.queueJump != null ? Number(global.queueJump) : QUEUE_JUMP_FEE;
  const queueJumpPrice = spotifyJukeboxPrice + queueJumpFee;

  const playNextPrice =
    useGlobal && global
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
