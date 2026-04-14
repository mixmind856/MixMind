/**
 * Live Playlist Service
 * Handles all live playlist control and status operations
 */

const {
  isLivePlaylistEnabled,
  enableLivePlaylist,
  disableLivePlaylist
} = require("../helper/livePlaylist.db");

/**
 * Get current live playlist status
 * @returns {Promise<Object>} - Live playlist status
 */
async function getLivePlaylistStatus() {
  try {
    const enabled = await isLivePlaylistEnabled();
    return { enabled };
  } catch (err) {
    console.error("Live Playlist Status Error:", err);
    throw new Error("Failed to get live playlist status");
  }
}

/**
 * Start the live playlist feature
 * @returns {Promise<Object>} - Success confirmation
 */
async function startLivePlaylist() {
  try {
    await enableLivePlaylist();
    console.log("✅ Live playlist started");
    return { success: true, status: "LIVE_PLAYLIST_STARTED" };
  } catch (err) {
    console.error("Start Live Playlist Error:", err);
    throw new Error("Failed to start live playlist");
  }
}

/**
 * Stop the live playlist feature
 * @returns {Promise<Object>} - Success confirmation
 */
async function stopLivePlaylist() {
  try {
    await disableLivePlaylist();
    console.log("✅ Live playlist stopped");
    return { success: true, status: "LIVE_PLAYLIST_STOPPED" };
  } catch (err) {
    console.error("Stop Live Playlist Error:", err);
    throw new Error("Failed to stop live playlist");
  }
}

module.exports = {
  getLivePlaylistStatus,
  startLivePlaylist,
  stopLivePlaylist
};
