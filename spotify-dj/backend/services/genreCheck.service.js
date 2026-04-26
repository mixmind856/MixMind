const { getTrackTags, getArtistTags } = require('./lastfm.service');
const genreMap = require('../data/genreMap.json');

/**
 * Build a flat lookup: alias tag → canonical genre name
 * e.g. "hip hop" → "hip-hop", "drum and bass" → "electronic"
 */
const aliasToCanonical = {};
for (const [canonical, aliases] of Object.entries(genreMap)) {
  if (canonical === '_description') continue;
  for (const alias of aliases) {
    aliasToCanonical[alias.toLowerCase()] = canonical;
  }
}

/**
 * Normalise a raw tag to a canonical genre (or null if unknown).
 */
function normalise(tag) {
  const lower = tag.toLowerCase().trim();
  if (aliasToCanonical[lower]) return aliasToCanonical[lower];
  // direct canonical match
  if (genreMap[lower]) return lower;
  return null;
}

/**
 * Resolve detected genres for a track.
 * Tries track-level tags first; falls back to artist-level tags.
 * Returns an array of canonical genre strings (deduplicated).
 */
async function detectGenres(artistName, trackName) {
  let rawTags = await getTrackTags(artistName, trackName);

  if (rawTags.length === 0) {
    rawTags = await getArtistTags(artistName);
  }

  const canonical = rawTags
    .map(normalise)
    .filter(Boolean);

  return [...new Set(canonical)];
}

/**
 * Check whether the detected genres of a track overlap with
 * the venue's allowed genres.
 *
 * @param {string[]} detectedGenres  – canonical genres from Last.fm
 * @param {string[]} allowedGenres   – venue's configured genres (stored as canonical)
 * @returns {{ match: boolean, matched: string[], detected: string[] }}
 */
function checkGenreMatch(detectedGenres, allowedGenres) {
  const allowedSet = new Set(allowedGenres.map((g) => g.toLowerCase().trim()));
  const matched = detectedGenres.filter((g) => allowedSet.has(g));
  return {
    match: matched.length > 0,
    matched,
    detected: detectedGenres,
  };
}

/**
 * Full pipeline: detect genres then check against venue's allowed list.
 */
async function evaluateTrack(artistName, trackName, venueAllowedGenres) {
  const detected = await detectGenres(artistName, trackName);
  const result = checkGenreMatch(detected, venueAllowedGenres);
  return { ...result, detected };
}

module.exports = { detectGenres, checkGenreMatch, evaluateTrack };
