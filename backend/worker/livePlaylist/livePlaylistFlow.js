/**
 * Live Playlist Flow
 * Core business logic for live playlist operations
 * 
 * Handles:
 * - Playlist updates
 * - Track management
 * - Queue operations
 * - Playlist state synchronization
 * - Batch rotation with timing
 */

const LivePlaylistSession = require("../../models/LivePlaylistSession");
const LivePlaylistTrack = require("../../models/LivePlaylistTrack");
const Request = require("../../models/Request");

/**
 * Initialize new batch - clear playlist and prepare for new tracks
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} - Batch initialization result
 */
async function initializeBatch(sessionId) {
  try {
    console.log(`🔄 Initializing new batch for session: ${sessionId}`);

    const session = await LivePlaylistSession.findById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Delete old tracks from database
    await LivePlaylistTrack.deleteMany({ _id: { $in: session.tracks } });

    // Reset session batch info
    session.tracks = [];
    session.removedTrackIds = [];
    session.currentTrackIndex = 0;
    session.batchId = `batch_${Date.now()}`;
    session.batchStartedAt = new Date();
    session.batchTotalDurationMs = 0;
    session.fiftyPercentThresholdMs = 0;
    session.lastUpdatedAt = new Date();

    await session.save();

    console.log(`✅ Batch initialized: ${session.batchId}`);

    return {
      sessionId: session._id,
      batchId: session.batchId,
      batchStartedAt: session.batchStartedAt
    };
  } catch (error) {
    console.error(`❌ Failed to initialize batch: ${error.message}`);
    throw error;
  }
}

/**
 * Add track to live playlist with duration tracking
 * @param {string} sessionId - Session ID
 * @param {Object} trackData - Track data (title, artist, duration in ms, etc.)
 * @returns {Promise<Object>} - Track with position in queue
 */
async function addTrackToPlaylist(sessionId, trackData) {
  try {
    console.log(`➕ Adding track to live playlist: ${trackData.title || trackData.songTitle}`);

    const session = await LivePlaylistSession.findById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Create live playlist track with duration
    const track = new LivePlaylistTrack({
      title: trackData.title || trackData.songTitle,
      artist: trackData.artist,
      duration: trackData.duration, // in seconds
      addedAt: new Date(),
      status: "playing",
      batchId: session.batchId
    });

    await track.save();

    // Add to session's tracks array
    session.tracks.push(track._id);
    session.lastUpdatedAt = new Date();

    await session.save();

    console.log(`✅ Track added at position: ${session.tracks.length} (duration: ${trackData.duration}s)`);

    return {
      trackId: track._id,
      position: session.tracks.length,
      durationMs: (trackData.duration || 0) * 1000,
      queueLength: session.tracks.length
    };

  } catch (error) {
    console.error(`❌ Failed to add track: ${error.message}`);
    throw error;
  }
}

/**
 * Calculate and update batch total duration and threshold
 * @param {string} sessionId - Session ID
 * @param {number} totalDurationMs - Total duration in milliseconds
 * @returns {Promise<Object>} - Duration info
 */
async function updateBatchDuration(sessionId, totalDurationMs) {
  try {
    console.log(`⏱️  Updating batch duration: ${totalDurationMs}ms (${Math.round(totalDurationMs / 1000)}s)`);

    const session = await LivePlaylistSession.findById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.batchTotalDurationMs = totalDurationMs;
    session.fiftyPercentThresholdMs = Math.round(totalDurationMs / 2);
    session.lastUpdatedAt = new Date();

    await session.save();

    console.log(`⏱️  50% threshold: ${session.fiftyPercentThresholdMs}ms (${Math.round(session.fiftyPercentThresholdMs / 1000)}s)`);

    return {
      sessionId: session._id,
      totalDurationMs: totalDurationMs,
      fiftyPercentThresholdMs: session.fiftyPercentThresholdMs
    };
  } catch (error) {
    console.error(`❌ Failed to update batch duration: ${error.message}`);
    throw error;
  }
}

/**
 * Identify tracks within 50% threshold for removal
 * Logic: Remove tracks that fit within first 50% duration,
 *        then add new tracks to replace them
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} - Tracks to remove
 */
async function identifyTracksToRemove(sessionId) {
  try {
    console.log(`🔍 Identifying tracks within 50% threshold for removal...`);

    const session = await LivePlaylistSession.findById(sessionId)
      .populate("tracks");

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const tracksToRemove = [];
    let cumulativeDuration = 0;

    // Find tracks that fit WITHIN the 50% threshold
    // Once cumulative exceeds 50%, stop adding to removal list
    for (let i = 0; i < session.tracks.length; i++) {
      const track = session.tracks[i];
      const trackDurationMs = (track.duration || 0) * 1000;
      
      // If adding this track would exceed 50% threshold, stop
      if (cumulativeDuration + trackDurationMs > session.fiftyPercentThresholdMs) {
        console.log(`  ⏹️  Track "${track.title}" would exceed threshold - stop here`);
        break;
      }

      cumulativeDuration += trackDurationMs;
      tracksToRemove.push({
        trackId: track._id,
        title: track.title,
        duration: track.duration,
        cumulativeDuration: cumulativeDuration
      });
      console.log(`  🗑️  Track "${track.title}" - cumulative: ${Math.round(cumulativeDuration / 1000)}s <= threshold: ${Math.round(session.fiftyPercentThresholdMs / 1000)}s`);
    }

    console.log(`✅ Found ${tracksToRemove.length} tracks to remove (within 50% threshold)`);

    return {
      sessionId: session._id,
      tracksToRemove: tracksToRemove,
      removalCount: tracksToRemove.length
    };

  } catch (error) {
    console.error(`❌ Failed to identify tracks: ${error.message}`);
    throw error;
  }
}

/**
 * Remove track from live playlist
 * @param {string} sessionId - Session ID
 * @param {string} trackId - Track ID to remove
 * @returns {Promise<Object>} - Removal result
 */
async function removeTrackFromPlaylist(sessionId, trackId) {
  try {
    console.log(`➖ Removing track from playlist: ${trackId}`);

    const session = await LivePlaylistSession.findById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Remove from tracks array
    session.tracks = session.tracks.filter(id => id.toString() !== trackId);
    session.removedTrackIds.push(trackId);
    session.lastUpdatedAt = new Date();

    await session.save();

    // Delete track record
    await LivePlaylistTrack.findByIdAndDelete(trackId);

    console.log(`✅ Track removed successfully`);

    return {
      trackId: trackId,
      queueLength: session.tracks.length
    };

  } catch (error) {
    console.error(`❌ Failed to remove track: ${error.message}`);
    throw error;
  }
}

/**
 * Update live playlist with new changes
 * @param {Object} session - Live playlist session
 * @param {Object} data - Update data
 * @returns {Promise<Object>} - Update result
 */
async function updateLivePlaylist(session, data = {}) {
  try {
    console.log(`📝 Updating live playlist: ${session._id}`);

    // Update session fields if provided
    if (data.status) {
      session.status = data.status;
    }

    session.lastUpdatedAt = new Date();
    await session.save();

    console.log(`✅ Playlist updated successfully`);

    return {
      sessionId: session._id,
      status: session.status,
      updatedAt: session.lastUpdatedAt
    };

  } catch (error) {
    console.error(`❌ Failed to update playlist: ${error.message}`);
    throw error;
  }
}

/**
 * Get current playlist state
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} - Current state with current track and queue
 */
async function getPlaylistState(sessionId) {
  try {
    const session = await LivePlaylistSession.findById(sessionId)
      .populate("tracks")
      .populate("venueId", "name");

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const currentIndex = session.currentTrackIndex || 0;
    const currentTrack = session.tracks[currentIndex];

    return {
      sessionId: session._id,
      venueId: session.venueId._id,
      venueName: session.venueId.name,
      status: session.status,
      currentTrack: currentTrack || null,
      currentTrackIndex: currentIndex,
      upcomingTracks: session.tracks.slice(currentIndex + 1),
      queueLength: session.tracks.length,
      batchId: session.batchId,
      batchTotalDurationMs: session.batchTotalDurationMs,
      fiftyPercentThresholdMs: session.fiftyPercentThresholdMs,
      createdAt: session.createdAt,
      lastUpdatedAt: session.lastUpdatedAt
    };

  } catch (error) {
    console.error(`❌ Failed to get playlist state: ${error.message}`);
    throw error;
  }
}

/**
 * Clear all tracks from live playlist
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} - Clear result
 */
async function clearPlaylist(sessionId) {
  try {
    console.log(`🧹 Clearing live playlist: ${sessionId}`);

    const session = await LivePlaylistSession.findById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Delete all tracks
    await LivePlaylistTrack.deleteMany({ _id: { $in: session.tracks } });

    // Clear session tracks
    session.tracks = [];
    session.removedTrackIds = [];
    session.currentTrackIndex = 0;
    session.lastClearedAt = new Date();
    session.lastUpdatedAt = new Date();

    await session.save();

    console.log(`✅ Playlist cleared successfully`);

    return {
      sessionId: session._id,
      clearedAt: session.lastClearedAt
    };

  } catch (error) {
    console.error(`❌ Failed to clear playlist: ${error.message}`);
    throw error;
  }
}

module.exports = {
  initializeBatch,
  addTrackToPlaylist,
  updateBatchDuration,
  identifyTracksToRemove,
  removeTrackFromPlaylist,
  updateLivePlaylist,
  getPlaylistState,
  clearPlaylist
};
