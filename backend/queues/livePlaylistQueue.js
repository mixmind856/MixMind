/**
 * Live Playlist Queue - MOCK version (no Redis needed)
 * Job queuing now handled via MongoDB stackService
 */

class MockQueue {
  constructor(name) {
    this.name = name;
  }

  async add(jobName, jobData) {
    console.log(`✅ [${this.name}] Job queued: ${jobName}`);
    return { id: Date.now().toString(), ...jobData };
  }

  async getCountsPerStatus() {
    return { waiting: 0, active: 0, completed: 0, failed: 0 };
  }

  async getJobCounts() {
    return { waiting: 0, active: 0, completed: 0, failed: 0 };
  }

  async getActiveCount() { return 0; }
  async getWaitingCount() { return 0; }
  async getFailedCount() { return 0; }
  async getCompletedCount() { return 0; }
}

const queue = new MockQueue("live-playlist");

async function enqueueLivePlaylistBatch() {
  const { isLivePlaylistEnabled } = require("../helper/livePlaylist.db");
  if (await isLivePlaylistEnabled()) {
    await queue.add("run-batch", {});
    console.log("✅ Live playlist batch queued");
  }
}

// Note: Live Playlist now uses direct worker polling instead of Redis queues
// This function is kept for compatibility but doesn't require Redis

module.exports = queue;

