/**
 * Live Playlist Worker Entry Point
 * Processes live playlist and track updates
 *
 * Responsibilities:
 * - Listen for live playlist queue jobs
 * - Update active playlists
 * - Manage track rotation
 * - Handle playlist events
 */

require("dotenv").config();
const { Worker } = require("bullmq");
const WORKER_CONFIG = require("../config/workerConfig");
const { connectDatabase, disconnectDatabase, logJobStart, logJobComplete, logJobFailed } = require("../shared/workerUtils");
const LivePlaylistSession = require("../../models/LivePlaylistSession");
const { updateLivePlaylist } = require("./livePlaylistFlow");

const WORKER_TYPE = "LIVE_PLAYLIST";

/**
 * Initialize and start the Live Playlist worker
 */
async function startLivePlaylistWorker() {
  try {
    // Connect to database
    await connectDatabase();

    // Create worker instance
    const worker = new Worker(
      WORKER_CONFIG.QUEUES.LIVE_PLAYLIST.name,
      processLivePlaylistJob,
      {
        connection: WORKER_CONFIG.REDIS,
        concurrency: WORKER_CONFIG.WORKER_LIMITS.CONCURRENT_JOBS_PER_WORKER
      }
    );

    console.log(`✅ ${WORKER_TYPE} Worker started (PID: ${process.pid})`);

    // Handle worker events
    worker.on("completed", (job) => {
      logJobComplete(job, { success: true }, WORKER_TYPE);
    });

    worker.on("failed", (job, error) => {
      logJobFailed(job, error, WORKER_TYPE);
    });

    worker.on("error", (error) => {
      console.error(`❌ ${WORKER_TYPE} Worker Error:`, error.message);
    });

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      console.log(`\n🛑 ${WORKER_TYPE} Worker shutting down...`);
      await worker.close();
      await disconnectDatabase();
      process.exit(0);
    });

  } catch (error) {
    console.error(`❌ ${WORKER_TYPE} Worker initialization failed:`, error.message);
    process.exit(1);
  }
}

/**
 * Process a single Live Playlist job
 * @param {Object} job - Bull queue job
 * @returns {Promise<Object>} - Job result
 */
async function processLivePlaylistJob(job) {
  try {
    logJobStart(job, WORKER_TYPE);

    const { sessionId, action, data } = job.data;

    if (!sessionId) {
      throw new Error("Session ID not provided in job data");
    }

    // Fetch session from database
    const session = await LivePlaylistSession.findById(sessionId)
      .populate("venueId")
      .populate("tracks");

    if (!session) {
      throw new Error(`Live Playlist session not found: ${sessionId}`);
    }

    // Process action
    let result;
    switch (action) {
      case "update":
        result = await updateLivePlaylist(session, data);
        break;
      case "rotateTrack":
        result = await rotateTrack(session);
        break;
      case "sync":
        result = await syncPlaylist(session);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return {
      success: true,
      sessionId: session._id,
      action: action,
      result: result
    };

  } catch (error) {
    throw error;
  }
}

/**
 * Rotate to next track in live playlist
 * @param {Object} session - Live playlist session
 * @returns {Promise<Object>} - Rotation result
 */
async function rotateTrack(session) {
  console.log(`🎵 Rotating track for session: ${session._id}`);

  if (!session.tracks || session.tracks.length === 0) {
    throw new Error("No tracks available in session");
  }

  // Move to next track
  const currentIndex = session.currentTrackIndex || 0;
  const nextIndex = (currentIndex + 1) % session.tracks.length;

  session.currentTrackIndex = nextIndex;
  session.lastTrackChangeAt = new Date();

  await session.save();

  return {
    trackIndex: nextIndex,
    track: session.tracks[nextIndex],
    updatedAt: session.lastTrackChangeAt
  };
}

/**
 * Sync playlist state with venue displays
 * @param {Object} session - Live playlist session
 * @returns {Promise<Object>} - Sync result
 */
async function syncPlaylist(session) {
  console.log(`🔄 Syncing playlist for venue: ${session.venueId.name}`);

  const syncData = {
    sessionId: session._id,
    venueId: session.venueId._id,
    currentTrack: session.tracks[session.currentTrackIndex || 0],
    queueLength: session.tracks.length,
    upcomingTracks: session.tracks.slice((session.currentTrackIndex || 0) + 1, (session.currentTrackIndex || 0) + 4),
    status: session.status,
    lastSync: new Date()
  };

  // TODO: Emit to connected clients via WebSocket
  // io.to(`venue_${session.venueId}`).emit("playlistSync", syncData);

  return syncData;
}

// Start the worker if this file is run directly
if (require.main === module) {
  startLivePlaylistWorker();
}

module.exports = {
  startLivePlaylistWorker,
  processLivePlaylistJob,
  rotateTrack,
  syncPlaylist
};
