const axios = require('axios');

const LASTFM_API = 'https://ws.audioscrobbler.com/2.0/';

/**
 * Fetch top tags (genres) for a track from Last.fm.
 * Returns an array of lowercase tag strings, most popular first.
 */
async function getTrackTags(artistName, trackName) {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) {
    console.warn('[Last.fm] LASTFM_API_KEY not set – skipping Last.fm lookup');
    return [];
  }

  try {
    const { data } = await axios.get(LASTFM_API, {
      params: {
        method: 'track.getTopTags',
        artist: artistName,
        track: trackName,
        api_key: apiKey,
        format: 'json',
        autocorrect: 1,
      },
      timeout: 5000,
    });

    const tags = data?.toptags?.tag;
    if (!Array.isArray(tags)) return [];

    return tags
      .filter((t) => t.count > 0)
      .map((t) => t.name.toLowerCase().trim())
      .slice(0, 15);
  } catch (err) {
    console.error('[Last.fm] Error fetching tags:', err.message);
    return [];
  }
}

/**
 * Fetch top tags for an artist.
 * Used as fallback when track tags come back empty.
 */
async function getArtistTags(artistName) {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) return [];

  try {
    const { data } = await axios.get(LASTFM_API, {
      params: {
        method: 'artist.getTopTags',
        artist: artistName,
        api_key: apiKey,
        format: 'json',
        autocorrect: 1,
      },
      timeout: 5000,
    });

    const tags = data?.toptags?.tag;
    if (!Array.isArray(tags)) return [];

    return tags
      .filter((t) => t.count > 0)
      .map((t) => t.name.toLowerCase().trim())
      .slice(0, 10);
  } catch (err) {
    console.error('[Last.fm] Error fetching artist tags:', err.message);
    return [];
  }
}

module.exports = { getTrackTags, getArtistTags };
