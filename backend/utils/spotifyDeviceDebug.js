const Venue = require("../models/Venue");
const spotifyService = require("../services/spotifyJukebox.service");

async function fetchVenueSpotifyDeviceDebug(venueId) {
  const venue = await Venue.findById(venueId).select(
    "_id spotifyConnected spotifyMode spotifyAccessToken spotifyRefreshToken spotifyTokenExpiresAt spotifyLastActiveDeviceId spotifyLastActiveDeviceName"
  );
  if (!venue) {
    return null;
  }

  const isSpotifyConfigured =
    venue.spotifyConnected === true &&
    !!venue.spotifyAccessToken &&
    !!venue.spotifyRefreshToken;

  if (!isSpotifyConfigured) {
    return {
      venueId: String(venue._id),
      spotifyConnected: false,
      spotifyMode: !!venue.spotifyMode,
      spotifyUser: null,
      devices: [],
      activeDevice: null,
      connectionIssue: "SPOTIFY_NOT_CONFIGURED",
      lastStoredDeviceId: venue.spotifyLastActiveDeviceId || null,
      lastStoredDeviceName: venue.spotifyLastActiveDeviceName || null,
      tokenExpiresAt: venue.spotifyTokenExpiresAt || null,
    };
  }

  const [profile, deviceResult] = await Promise.all([
    spotifyService.getSpotifyProfileDebug(venueId),
    spotifyService.getSpotifyDevicesDebug(venueId),
  ]);
  const devices = Array.isArray(deviceResult?.devices) ? deviceResult.devices : [];
  const active = devices.find((d) => d.is_active) || null;

  return {
    venueId: String(venue._id),
    spotifyConnected: !!venue.spotifyConnected,
    spotifyMode: !!venue.spotifyMode,
    spotifyUser: profile
      ? {
          id: profile.id || null,
          display_name: profile.display_name || null,
          email: profile.email || null,
        }
      : null,
    devices: devices.map((d) => ({
      id: d.id || null,
      name: d.name || null,
      type: d.type || null,
      is_active: !!d.is_active,
      is_restricted: !!d.is_restricted,
      volume_percent: typeof d.volume_percent === "number" ? d.volume_percent : null,
    })),
    activeDevice: active
      ? {
          id: active.id || null,
          name: active.name || null,
          type: active.type || null,
        }
      : null,
    lastStoredDeviceId: venue.spotifyLastActiveDeviceId || null,
    lastStoredDeviceName: venue.spotifyLastActiveDeviceName || null,
    tokenExpiresAt: venue.spotifyTokenExpiresAt || null,
  };
}

module.exports = {
  fetchVenueSpotifyDeviceDebug,
};
