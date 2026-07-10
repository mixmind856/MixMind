const fs = require("fs");
const path = require("path");

const PRICING_FILE = path.join(__dirname, "../data/platformPricing.json");

const FALLBACK = {
  standardRequest: 1.0,
  queueJump: 1.99,
  playNext: 4.99,
};

function readGlobalPricing() {
  try {
    const raw = fs.readFileSync(PRICING_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      standardRequest: Number(parsed.standardRequest ?? FALLBACK.standardRequest),
      queueJump: Number(parsed.queueJump ?? FALLBACK.queueJump),
      playNext: Number(parsed.playNext ?? FALLBACK.playNext),
    };
  } catch {
    return { ...FALLBACK };
  }
}

function writeGlobalPricing({ standardRequest, queueJump, playNext }) {
  const next = {
    standardRequest: Number(standardRequest),
    queueJump: Number(queueJump),
    playNext: Number(playNext),
  };
  fs.writeFileSync(PRICING_FILE, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

module.exports = {
  readGlobalPricing,
  writeGlobalPricing,
  FALLBACK,
};
