const axios = require("axios");
const Venue = require("../models/Venue");

const SPOTIFY_ACCOUNTS = "https://accounts.spotify.com";
const SPOTIFY_API = "https://api.spotify.com/v1";

function buildDeviceSummary(devices = []) {
  return (devices || []).map((d) => ({
    id: d.id,
    name: d.name,
    is_active: !!d.is_active,
    type: d.type
  }));
}

function makeSpotifyError(code, message, statusCode, details) {
  const err = new Error(message);
  err.code = code;
  if (statusCode) err.statusCode = statusCode;
  if (details) err.details = details;
  return err;
}

function mapSpotifyApiError(err, fallbackCode = "SPOTIFY_QUEUE_FAILED") {
  const status = err?.response?.status;
  const message =
    err?.response?.data?.error?.message ||
    err?.response?.data?.error ||
    err?.message ||
    "Spotify API request failed";

  const msgLower = String(message).toLowerCase();

  if (status === 401) {
    return makeSpotifyError("SPOTIFY_AUTH_EXPIRED", `Spotify auth error: ${message}`, status, err?.response?.data);
  }
  if (status === 404) {
    if (msgLower.includes("no active device")) {
      return makeSpotifyError("NO_ACTIVE_DEVICE", `Spotify queue error: ${message}`, status, err?.response?.data);
    }
    if (msgLower.includes("device")) {
      return makeSpotifyError("SPOTIFY_DEVICE_NOT_FOUND", `Spotify device error: ${message}`, status, err?.response?.data);
    }
  }
  if (msgLower.includes("no active device")) {
    return makeSpotifyError("NO_ACTIVE_DEVICE", `Spotify queue error: ${message}`, status, err?.response?.data);
  }

  return makeSpotifyError(fallbackCode, `Spotify queue error: ${message}`, status, err?.response?.data);
}

function assertSpotifyConfig() {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    const missing = [
      !process.env.SPOTIFY_CLIENT_ID ? "SPOTIFY_CLIENT_ID" : null,
      !process.env.SPOTIFY_CLIENT_SECRET ? "SPOTIFY_CLIENT_SECRET" : null,
    ]
      .filter(Boolean)
      .join(", ");
    const err = new Error(`Missing Spotify credentials: ${missing}`);
    err.code = "SPOTIFY_CONFIG_MISSING";
    throw err;
  }
}

function buildAuthUrl(state) {
  assertSpotifyConfig();
  if (!process.env.SPOTIFY_REDIRECT_URI) {
    const err = new Error("Missing Spotify credentials: SPOTIFY_REDIRECT_URI");
    err.code = "SPOTIFY_CONFIG_MISSING";
    throw err;
  }

  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    scope: "user-modify-playback-state user-read-playback-state",
    state,
  });
  return `${SPOTIFY_ACCOUNTS}/authorize?${params.toString()}`;
}

async function exchangeCode(code) {
  assertSpotifyConfig();
  if (!process.env.SPOTIFY_REDIRECT_URI) {
    const err = new Error("Missing Spotify credentials: SPOTIFY_REDIRECT_URI");
    err.code = "SPOTIFY_CONFIG_MISSING";
    throw err;
  }

  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const { data } = await axios.post(
    `${SPOTIFY_ACCOUNTS}/api/token`,
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
    }),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
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
  assertSpotifyConfig();
  const venue = await Venue.findById(venueId);
  if (!venue || !venue.spotifyRefreshToken) {
    throw new Error("Venue has no Spotify refresh token");
  }

  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const { data } = await axios.post(
    `${SPOTIFY_ACCOUNTS}/api/token`,
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: venue.spotifyRefreshToken,
    }),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
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
  const venue = await Venue.findById(venueId);
  if (!venue || !venue.spotifyConnected) throw new Error("Venue not connected to Spotify");

  const isExpired = !venue.spotifyTokenExpiresAt || venue.spotifyTokenExpiresAt <= new Date();
  if (isExpired) return refreshAccessToken(venueId);
  return venue.spotifyAccessToken;
}

async function fetchSpotifyDevicesWithToken(token) {
  const { data } = await axios.get(`${SPOTIFY_API}/me/player/devices`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data?.devices || [];
}

async function fetchSpotifyProfileWithToken(token) {
  const { data } = await axios.get(`${SPOTIFY_API}/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return data || null;
}

async function getSpotifyDevices(venueId) {
  let token = await getValidToken(venueId);

  try {
    const devices = await fetchSpotifyDevicesWithToken(token);
    return { devices, refreshed: false };
  } catch (err) {
    const mapped = mapSpotifyApiError(err, "SPOTIFY_QUEUE_FAILED");
    if (mapped.code !== "SPOTIFY_AUTH_EXPIRED") {
      throw mapped;
    }

    token = await refreshAccessToken(venueId);
    try {
      const devices = await fetchSpotifyDevicesWithToken(token);
      return { devices, refreshed: true };
    } catch (retryErr) {
      throw mapSpotifyApiError(retryErr, "SPOTIFY_QUEUE_FAILED");
    }
  }
}

async function getSpotifyProfile(venueId) {
  let token = await getValidToken(venueId);

  try {
    return await fetchSpotifyProfileWithToken(token);
  } catch (err) {
    const mapped = mapSpotifyApiError(err, "SPOTIFY_QUEUE_FAILED");
    if (mapped.code !== "SPOTIFY_AUTH_EXPIRED") {
      throw mapped;
    }

    token = await refreshAccessToken(venueId);
    try {
      return await fetchSpotifyProfileWithToken(token);
    } catch (retryErr) {
      throw mapSpotifyApiError(retryErr, "SPOTIFY_QUEUE_FAILED");
    }
  }
}

async function searchTracks(query) {
  assertSpotifyConfig();

  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const tokenRes = await axios.post(
    `${SPOTIFY_ACCOUNTS}/api/token`,
    new URLSearchParams({ grant_type: "client_credentials" }),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const { data } = await axios.get(`${SPOTIFY_API}/search`, {
    params: { q: query, type: "track", limit: 10 },
    headers: { Authorization: `Bearer ${tokenRes.data.access_token}` },
  });

  return data.tracks.items.map((t) => ({
    id: t.id,
    uri: t.uri,
    name: t.name,
    artists: t.artists.map((a) => a.name).join(", "),
    album: t.album.name,
    albumArt: t.album.images[0]?.url || "",
    durationMs: t.duration_ms,
  }));
}

async function addToQueue(venueId, spotifyUri) {
  const venue = await Venue.findById(venueId).select(
    "_id spotifyLastActiveDeviceId spotifyLastActiveDeviceName spotifyConnected"
  );
  if (!venue || !venue.spotifyConnected) {
    throw makeSpotifyError("SPOTIFY_QUEUE_FAILED", "Venue not connected to Spotify", 400);
  }

  const queueToDevice = async ({ token, deviceId, deviceName }) => {
    console.log("[Spotify Queue Attempt]", {
      venueId: String(venueId),
      deviceId: deviceId || null,
      deviceName: deviceName || null
    });

    await axios.post(`${SPOTIFY_API}/me/player/queue`, null, {
      params: { uri: spotifyUri, device_id: deviceId },
      headers: { Authorization: `Bearer ${token}` }
    });

    await Venue.findByIdAndUpdate(venueId, {
      spotifyLastActiveDeviceId: deviceId || null,
      spotifyLastActiveDeviceName: deviceName || null,
      spotifyLastDeviceSeenAt: new Date()
    });
  };

  const choosePreferredDevice = (devices) => {
    const activeDevice = (devices || []).find((d) => d.is_active);
    if (activeDevice) {
      return { device: activeDevice, source: "active" };
    }

    const storedDevice = venue.spotifyLastActiveDeviceId
      ? (devices || []).find((d) => d.id === venue.spotifyLastActiveDeviceId)
      : null;

    if (storedDevice) {
      return { device: storedDevice, source: "stored" };
    }

    return { device: null, source: "none" };
  };

  const runQueueFlow = async ({ forceRefreshToken = false, allowDeviceRetry = true }) => {
    let token = forceRefreshToken ? await refreshAccessToken(venueId) : await getValidToken(venueId);
    const deviceLookup = await getSpotifyDevices(venueId);
    const devices = deviceLookup.devices || [];
    const summary = buildDeviceSummary(devices);
    const selected = choosePreferredDevice(devices);

    console.log("[Spotify Device Snapshot]", {
      venueId: String(venueId),
      selectedSource: selected.source,
      selectedDeviceId: selected.device?.id || null,
      selectedDeviceName: selected.device?.name || null,
      activeFlags: summary
    });

    if (!selected.device) {
      throw makeSpotifyError(
        "NO_ACTIVE_DEVICE",
        "Spotify queue error: No active device found",
        404,
        { devices: summary }
      );
    }

    try {
      await queueToDevice({
        token,
        deviceId: selected.device.id,
        deviceName: selected.device.name
      });
      return { success: true };
    } catch (err) {
      const mapped = mapSpotifyApiError(err, "SPOTIFY_QUEUE_FAILED");
      console.warn("[Spotify Queue Failure]", {
        venueId: String(venueId),
        code: mapped.code,
        statusCode: mapped.statusCode || null,
        message: mapped.message
      });

      if (mapped.code === "SPOTIFY_AUTH_EXPIRED" && !forceRefreshToken) {
        return runQueueFlow({ forceRefreshToken: true, allowDeviceRetry });
      }

      if (
        allowDeviceRetry &&
        (mapped.code === "NO_ACTIVE_DEVICE" || mapped.code === "SPOTIFY_DEVICE_NOT_FOUND")
      ) {
        const retryLookup = await getSpotifyDevices(venueId);
        const retryDevices = retryLookup.devices || [];
        const retrySummary = buildDeviceSummary(retryDevices);
        const retryActive = retryDevices.find((d) => d.is_active);

        console.log("[Spotify Device Retry Snapshot]", {
          venueId: String(venueId),
          retryActiveDeviceId: retryActive?.id || null,
          retryActiveDeviceName: retryActive?.name || null,
          activeFlags: retrySummary
        });

        if (!retryActive) {
          throw makeSpotifyError(
            "NO_ACTIVE_DEVICE",
            "Spotify queue error: No active device found",
            404,
            { devices: retrySummary }
          );
        }

        try {
          token = await getValidToken(venueId);
          await queueToDevice({
            token,
            deviceId: retryActive.id,
            deviceName: retryActive.name
          });
          return { success: true, retried: true };
        } catch (retryErr) {
          throw mapSpotifyApiError(retryErr, "SPOTIFY_QUEUE_FAILED");
        }
      }

      throw mapped;
    }
  };

  return runQueueFlow({ forceRefreshToken: false, allowDeviceRetry: true });
}

module.exports = {
  buildAuthUrl,
  exchangeCode,
  searchTracks,
  addToQueue,
  getSpotifyDevices,
  getSpotifyProfile
};
