/**
 * Worker Configuration
 * Centralized configuration for all workers (queue, Redis, database)
 */

require("dotenv").config();

const WORKER_CONFIG = {
  // Redis Configuration for Bull Queue
  REDIS: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    enableOfflineQueue: false
  },

  // Worker Process Configuration
  WORKER_PROCESS: {
    DETACHED: false,
    STDIO: ['ignore', 'pipe', 'pipe'],
    RESTART_ON_CRASH: true
  },

  // Queue Names and Settings
  QUEUES: {
    BEATSOURCE: {
      name: "beatsource",
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000
        },
        removeOnComplete: true,
        removeOnFail: false
      }
    },
    LIVE_PLAYLIST: {
      name: "livePlaylist",
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: "fixed",
          delay: 5000
        },
        removeOnComplete: true,
        removeOnFail: false
      }
    }
  },

  // Job Status
  JOB_STATUS: {
    PENDING: "pending",
    PROCESSING: "processing",
    COMPLETED: "completed",
    FAILED: "failed",
    RETRYING: "retrying"
  },

  // Timeouts (in milliseconds)
  TIMEOUTS: {
    BEATSOURCE_JOB: 60000,        // 60 seconds
    LIVE_PLAYLIST_JOB: 30000,     // 30 seconds
    WORKER_STARTUP: 10000,        // 10 seconds
    DB_CONNECTION: 10000          // 10 seconds
  },

  // Worker Process Limits
  WORKER_LIMITS: {
    MAX_WORKERS: 2,
    CONCURRENT_JOBS_PER_WORKER: 1,
    WORKER_RESTART_DELAY: 5000
  }
};

module.exports = WORKER_CONFIG;
