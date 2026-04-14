/**
 * Duration Tracker Utility
 * Handles duration calculations and timing thresholds for live playlist
 */

/**
 * Parse duration string in MM:SS format to seconds
 * @param {string} durationString - Duration in MM:SS format
 * @returns {number} - Duration in seconds
 */
function parseDurationString(durationString) {
  if (!durationString) return 0;
  
  const match = durationString.match(/(\d+):(\d+)/);
  if (!match) return 0;
  
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  
  return minutes * 60 + seconds;
}

/**
 * Calculate total duration from array of track durations
 * @param {Array<number>} durations - Array of durations in seconds
 * @returns {Object} - Duration info
 */
function calculateTotalDuration(durations) {
  const totalSeconds = durations.reduce((sum, duration) => sum + (duration || 0), 0);
  const totalMs = totalSeconds * 1000;
  const fiftyPercentMs = Math.round(totalMs / 2);
  
  return {
    totalSeconds,
    totalMs,
    fiftyPercentSeconds: Math.round(fiftyPercentMs / 1000),
    fiftyPercentMs,
    trackCount: durations.length
  };
}

/**
 * Identify tracks within 50% threshold for removal
 * Logic: Remove all tracks whose cumulative time <= 50% threshold
 *        Once cumulative > 50%, keep remaining tracks
 * @param {Array<Object>} tracks - Array of track objects with duration property
 * @param {number} fiftyPercentMs - 50% threshold in milliseconds
 * @returns {Object} - Tracks to keep and remove
 */
function identifyRemovalCandidates(tracks, fiftyPercentMs) {
  const tracksToKeep = [];
  const tracksToRemove = [];
  let cumulativeDurationMs = 0;

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const trackDurationMs = (track.duration || 0) * 1000;

    // If adding this track would exceed 50% threshold, keep this and remaining tracks
    if (cumulativeDurationMs + trackDurationMs > fiftyPercentMs) {
      tracksToKeep.push({
        ...track,
        cumulativeDurationMs: cumulativeDurationMs + trackDurationMs,
        withinThreshold: false
      });
    } else {
      // This track fits within 50% threshold - mark for removal
      cumulativeDurationMs += trackDurationMs;
      tracksToRemove.push({
        ...track,
        cumulativeDurationMs: cumulativeDurationMs,
        withinThreshold: true
      });
    }
  }

  return {
    tracksToKeep,
    tracksToRemove,
    keepCount: tracksToKeep.length,
    removeCount: tracksToRemove.length,
    fiftyPercentThresholdMs: fiftyPercentMs,
    fiftyPercentThresholdSeconds: Math.round(fiftyPercentMs / 1000)
  };
}

/**
 * Calculate wait time before next rotation
 * @param {number} fiftyPercentMs - 50% of total duration in milliseconds
 * @param {number} bufferMs - Additional buffer time (default 5s)
 * @returns {Object} - Wait time info
 */
function calculateWaitTime(fiftyPercentMs, bufferMs = 5000) {
  const waitTimeMs = fiftyPercentMs + bufferMs;
  const waitTimeSeconds = Math.round(waitTimeMs / 1000);

  return {
    fiftyPercentMs,
    bufferMs,
    totalWaitTimeMs: waitTimeMs,
    totalWaitTimeSeconds: waitTimeSeconds,
    displayText: `${waitTimeSeconds}s (${Math.round(fiftyPercentMs / 1000)}s playlist + ${Math.round(bufferMs / 1000)}s buffer)`
  };
}

/**
 * Format duration for display
 * @param {number} ms - Duration in milliseconds
 * @returns {string} - Formatted duration string
 */
function formatDuration(ms) {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Log batch timing info
 * @param {Object} batchInfo - Batch duration information
 */
function logBatchTiming(batchInfo) {
  console.log(`
  📊 BATCH TIMING INFO:
    • Total Duration: ${formatDuration(batchInfo.totalMs)} (${batchInfo.totalMs}ms)
    • 50% Threshold: ${formatDuration(batchInfo.fiftyPercentMs)} (${batchInfo.fiftyPercentMs}ms)
    • Track Count: ${batchInfo.trackCount}
  `);
}

module.exports = {
  parseDurationString,
  calculateTotalDuration,
  identifyRemovalCandidates,
  calculateWaitTime,
  formatDuration,
  logBatchTiming
};
