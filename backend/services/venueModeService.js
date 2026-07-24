/**
 * Shared venue mode application used by manual toggles and auto-scheduling.
 * Keeps playlist worker start/stop in one place.
 */

const Venue = require("../models/Venue");

/**
 * Apply a target mode for a venue.
 * @param {string|object} venueOrId
 * @param {'playlist'|'dj'|'none'} mode
 * @param {{ skipWorker?: boolean, source?: string }} options
 * @returns {Promise<{ venue, changed: boolean, previousMode: string, mode: string }>}
 */
async function applyVenueMode(venueOrId, mode, options = {}) {
  const { skipWorker = false, source = "manual" } = options;

  if (!["playlist", "dj", "none"].includes(mode)) {
    throw new Error(`Invalid mode: ${mode}`);
  }

  const venue =
    typeof venueOrId === "object" && venueOrId?._id
      ? venueOrId
      : await Venue.findById(venueOrId);

  if (!venue) {
    throw new Error("Venue not found");
  }

  const previous = {
    djMode: !!venue.djMode,
    livePlaylistActive: !!venue.livePlaylistActive,
    spotifyMode: !!venue.spotifyMode
  };

  const desired = {
    djMode: mode === "dj",
    livePlaylistActive: mode === "playlist",
    // Spotify is not part of auto schedule; leave alone unless enabling DJ
    spotifyMode: mode === "dj" ? false : !!venue.spotifyMode
  };

  if (mode === "dj" && !venue.djPassword) {
    const err = new Error(
      "Cannot enable DJ Mode automatically: DJ password has not been set. Enable DJ Mode once manually to set a password."
    );
    err.code = "DJ_PASSWORD_REQUIRED";
    throw err;
  }

  const changed =
    previous.djMode !== desired.djMode ||
    previous.livePlaylistActive !== desired.livePlaylistActive ||
    (mode === "dj" && previous.spotifyMode !== desired.spotifyMode);

  if (!changed) {
    return {
      venue,
      changed: false,
      previousMode: previous.djMode
        ? "dj"
        : previous.livePlaylistActive
          ? "playlist"
          : "none",
      mode
    };
  }

  venue.djMode = desired.djMode;
  venue.livePlaylistActive = desired.livePlaylistActive;
  if (mode === "dj") {
    venue.spotifyMode = false;
  }

  await venue.save();

  console.log(
    `[venueMode] ${source}: ${venue.name} → ${mode} ` +
      `(dj=${venue.djMode}, playlist=${venue.livePlaylistActive})`
  );

  if (!skipWorker) {
    await syncPlaylistWorker(venue);
  }

  return {
    venue,
    changed: true,
    previousMode: previous.djMode
      ? "dj"
      : previous.livePlaylistActive
        ? "playlist"
        : "none",
    mode
  };
}

/**
 * Start/stop live playlist worker to match venue.livePlaylistActive.
 * Mirrors toggleLivePlaylist side effects (without VirtualDJ webhooks on auto).
 */
async function syncPlaylistWorker(venue) {
  const workerManager = require("../worker/workerManager");
  const venueId = venue._id.toString();

  try {
    if (venue.livePlaylistActive) {
      const result = workerManager.startLivePlaylist(venueId);
      console.log(
        `[venueMode] playlist worker start:`,
        result.started ? `pid ${result.pid}` : result.message || result
      );
    } else {
      // Only stop if this was the active venue (worker is global/single)
      workerManager.stopLivePlaylist();
      console.log(`[venueMode] playlist worker stopped for ${venue.name}`);
    }
  } catch (err) {
    console.warn(`[venueMode] worker sync failed:`, err.message);
  }
}

/**
 * Apply scheduled mode if it differs from current flags.
 * No-ops when scheduledMode is null (outside all windows).
 */
async function applyScheduledModeIfNeeded(venue, scheduledMode, source = "schedule") {
  if (!scheduledMode) {
    return { changed: false, skipped: true, reason: "outside_schedule" };
  }

  const current = venue.djMode
    ? "dj"
    : venue.livePlaylistActive
      ? "playlist"
      : "none";

  if (current === scheduledMode) {
    return { changed: false, skipped: true, reason: "already_correct", mode: current };
  }

  try {
    const result = await applyVenueMode(venue, scheduledMode, { source });
    return { ...result, skipped: false };
  } catch (err) {
    if (err.code === "DJ_PASSWORD_REQUIRED") {
      console.warn(
        `[venueMode] Skipping DJ auto-switch for ${venue.name}: ${err.message}`
      );
      return { changed: false, skipped: true, reason: "dj_password_required", error: err.message };
    }
    throw err;
  }
}

module.exports = {
  applyVenueMode,
  syncPlaylistWorker,
  applyScheduledModeIfNeeded
};
