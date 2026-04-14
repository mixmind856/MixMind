/**
 * Beatsource Queue - MOCK version (no Redis needed)
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

const beatsourceQueue = new MockQueue("beatsource");
module.exports = beatsourceQueue;
