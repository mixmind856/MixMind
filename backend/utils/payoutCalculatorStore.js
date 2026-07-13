const fs = require("fs");
const path = require("path");

const CALC_FILE = path.join(__dirname, "../data/payoutCalculator.json");

const FALLBACK = {
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

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeConfig(raw = {}) {
  const pl = raw.playlistMode || {};
  const dn = raw.djNormal || {};
  const dp = raw.djPriority || {};
  return {
    playlistMode: {
      stripeFee: num(pl.stripeFee, FALLBACK.playlistMode.stripeFee),
      platformCost: num(pl.platformCost, FALLBACK.playlistMode.platformCost),
      venueSharePct: num(pl.venueSharePct, FALLBACK.playlistMode.venueSharePct),
      mixmindSharePct: num(pl.mixmindSharePct, FALLBACK.playlistMode.mixmindSharePct),
      exampleCustomerPays: num(
        pl.exampleCustomerPays,
        FALLBACK.playlistMode.exampleCustomerPays
      ),
    },
    djNormal: {
      customerPrice: num(dn.customerPrice, FALLBACK.djNormal.customerPrice),
      mixmindShare: num(dn.mixmindShare, FALLBACK.djNormal.mixmindShare),
      stripeFee: num(dn.stripeFee, FALLBACK.djNormal.stripeFee),
    },
    djPriority: {
      customerPrice: num(dp.customerPrice, FALLBACK.djPriority.customerPrice),
      mixmindShare: num(dp.mixmindShare, FALLBACK.djPriority.mixmindShare),
      stripeFee: num(dp.stripeFee, FALLBACK.djPriority.stripeFee),
    },
    // Extensible bag for VAT, promoter share, etc. without schema redesign
    futureFields:
      raw.futureFields && typeof raw.futureFields === "object"
        ? raw.futureFields
        : {},
  };
}

function readPayoutCalculatorConfig() {
  try {
    const raw = fs.readFileSync(CALC_FILE, "utf8");
    return normalizeConfig(JSON.parse(raw));
  } catch {
    return normalizeConfig(FALLBACK);
  }
}

function writePayoutCalculatorConfig(input) {
  const next = normalizeConfig(input);
  fs.writeFileSync(CALC_FILE, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

module.exports = {
  FALLBACK,
  readPayoutCalculatorConfig,
  writePayoutCalculatorConfig,
  normalizeConfig,
};
