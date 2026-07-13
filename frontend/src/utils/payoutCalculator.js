/** Mirrors backend/utils/payoutCalculator.js for live Admin UI previews. */

function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export const DEFAULT_PAYOUT_CALCULATOR = {
  playlistMode: {
    stripeFee: 0.25,
    platformCost: 0.0,
    venueSharePct: 50,
    mixmindSharePct: 50,
    exampleCustomerPays: 1.99,
  },
  djNormal: {
    customerPrice: 2.0,
    mixmindShare: 0.5,
    stripeFee: 0.25,
  },
  djPriority: {
    customerPrice: 4.99,
    mixmindShare: 1.0,
    stripeFee: 0.25,
  },
  futureFields: {},
};

export function calculatePlaylistPayout(customerPays, config) {
  const pl = config?.playlistMode || DEFAULT_PAYOUT_CALCULATOR.playlistMode;
  const paid = roundMoney(customerPays);
  const stripeFee = roundMoney(pl.stripeFee);
  const platformCost = roundMoney(pl.platformCost);
  const remaining = roundMoney(Math.max(0, paid - stripeFee - platformCost));
  const venue = roundMoney((remaining * (Number(pl.venueSharePct) || 0)) / 100);
  const mixmind = roundMoney((remaining * (Number(pl.mixmindSharePct) || 0)) / 100);
  return {
    customerPays: paid,
    stripeFee,
    platformCost,
    remaining,
    venue,
    mixmind,
  };
}

export function calculateDjPayout(customerPrice, mixmindShare, stripeFee) {
  const price = roundMoney(customerPrice);
  const fee = roundMoney(stripeFee);
  const commission = roundMoney(mixmindShare);
  return {
    customerPrice: price,
    stripeFee: fee,
    mixmindShare: commission,
    venueReceives: roundMoney(Math.max(0, price - fee - commission)),
  };
}

export function formatGbp(amount) {
  return `£${Number(amount || 0).toFixed(2)}`;
}
