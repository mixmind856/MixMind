const axios = require('axios');
const VenueConfig = require('../models/VenueConfig');

const SPOTIFY_ACCOUNTS = 'https://accounts.spotify.com';
const SPOTIFY_API = 'https://api.spotify.com/v1';

function buildAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    scope: 'user-modify-playback-state user-read-playback-state',
    state,
  });
  return `${SPOTIFY_ACCOUNTS}/authorize?${params.toString()}`;
}

async function exchangeCode(code) {
  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const { data } = await axios.post(
    `${SPOTIFY_ACCOUNTS}/api/token`,
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    }),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

async function refreshAccessToken(venueId) {
  const venue = await VenueConfig.findById(venueId);
  if (!venue || !venue.spotifyRefreshToken) {
    throw new Error('Venue has no Spotify refresh token');
  }

  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const { data } = await axios.post(
    `${SPOTIFY_ACCOUNTS}/api/token`,
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: venue.spotifyRefreshToken,
    }),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  venue.spotifyAccessToken = data.access_token;
  venue.spotifyTokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);
  if (data.refresh_token) venue.spotifyRefreshToken = data.refresh_token;
  await venue.save();

  return venue.spotifyAccessToken;
}

async function getValidToken(venueId) {
  const venue = await VenueConfig.findById(venueId);
  if (!venue || !venue.spotifyConnected) throw new Error('Venue not connected to Spotify');

  const isExpired = !venue.spotifyTokenExpiresAt || venue.spotifyTokenExpiresAt <= new Date();
  if (isExpired) {
    return refreshAccessToken(venueId);
  }
  return venue.spotifyAccessToken;
}

async function searchTracks(query) {
  // Use client-credentials for search – no user context needed
  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const tokenRes = await axios.post(
    `${SPOTIFY_ACCOUNTS}/api/token`,
    new URLSearchParams({ grant_type: 'client_credentials' }),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  const { data } = await axios.get(`${SPOTIFY_API}/search`, {
    params: { q: query, type: 'track', limit: 10 },
    headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
  });

  return data.tracks.items.map((t) => ({
    id: t.id,
    uri: t.uri,
    name: t.name,
    artists: t.artists.map((a) => a.name).join(', '),
    album: t.album.name,
    albumArt: t.album.images[0]?.url || '',
    durationMs: t.duration_ms,
    previewUrl: t.preview_url,
  }));
}

async function addToQueue(venueId, spotifyUri) {
  const token = await getValidToken(venueId);

  try {
    await axios.post(`${SPOTIFY_API}/me/player/queue`, null, {
      params: { uri: spotifyUri },
      headers: { Authorization: `Bearer ${token}` },
    });

    return { success: true };
  } catch (err) {
    console.error("FULL SPOTIFY QUEUE ERROR:", {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });

    const msg =
      err.response?.data?.error?.message ||
      err.response?.data?.error ||
      err.message;

    throw new Error(`Spotify queue error: ${msg}`);
  }
}

module.exports = { buildAuthUrl, exchangeCode, searchTracks, addToQueue, getValidToken };