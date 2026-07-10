/**
 * Shared Spotify device status display logic (Venue Dashboard + Admin Dashboard).
 * Input matches GET /api/jukebox/debug-devices/:venueId response.
 */
export function getSpotifyDeviceActiveOffline(debugPayload) {
  if (!debugPayload) {
    return { isActive: false, label: "Offline" };
  }

  if (
    debugPayload.connectionIssue === "SPOTIFY_NOT_CONFIGURED" ||
    !debugPayload.spotifyConnected
  ) {
    return { isActive: false, label: "Offline" };
  }

  if (debugPayload.activeDevice?.name) {
    return { isActive: true, label: "Active" };
  }

  return { isActive: false, label: "Offline" };
}

export function formatSpotifyDeviceBadge(debugPayload) {
  const { isActive, label } = getSpotifyDeviceActiveOffline(debugPayload);
  return isActive ? `🟢 ${label}` : `🔴 ${label}`;
}
