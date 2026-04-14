/**
 * Worker Manager
 * Central manager for starting, stopping, and monitoring all workers
 * 
 * Responsibilities:
 * - Spawn worker processes (Beatsource, Live Playlist)
 * - Monitor worker health
 * - Handle worker restarts
 * - Provide worker status endpoint
 */

const path = require("path");
const { spawn } = require("child_process");
const WORKER_CONFIG = require("../config/workerConfig");

class WorkerManager {
  constructor() {
    this.workers = new Map();
    this.workerPids = {
      livePlaylist: null,
      beatsource: null
    };
  }

  /**
   * Start a worker process
   * @param {string} workerType - Type of worker: 'beatsource' or 'livePlaylist'
   * @returns {Object} - { started: boolean, pid?: number, message: string }
   */
  startWorker(workerType) {
    if (this.isWorkerRunning(workerType)) {
      return {
        started: false,
        message: `${workerType} worker already running (PID: ${this.workerPids[workerType]})`
      };
    }

    try {
      const workerPath = this.getWorkerPath(workerType);
      const child = spawn(process.execPath, [workerPath], {
        cwd: path.resolve(__dirname, "../.."),
        detached: false,
        stdio: ["ignore", "pipe", "pipe"]
      });

      // Store process reference
      this.workerPids[workerType] = child.pid;
      this.workers.set(workerType, child);

      // Handle stdout
      child.stdout.on("data", (data) => {
        process.stdout.write(`[${workerType}-worker] ${data.toString()}`);
      });

      // Handle stderr
      child.stderr.on("data", (data) => {
        process.stderr.write(`[${workerType}-worker-err] ${data.toString()}`);
      });

      // Handle exit
      child.on("exit", (code, signal) => {
        console.log(`[${workerType}-worker] exited with code=${code} signal=${signal}`);
        this.workers.delete(workerType);
        this.workerPids[workerType] = null;
      });

      console.log(`✅ ${workerType} worker started (PID: ${child.pid})`);

      return {
        started: true,
        pid: child.pid,
        type: workerType,
        startedAt: new Date()
      };

    } catch (error) {
      console.error(`❌ Failed to start ${workerType} worker:`, error.message);
      return {
        started: false,
        message: `Failed to start ${workerType} worker: ${error.message}`
      };
    }
  }

  /**
   * Stop a worker process
   * @param {string} workerType - Type of worker to stop
   * @returns {Object} - { stopped: boolean, message: string }
   */
  stopWorker(workerType) {
    const worker = this.workers.get(workerType);

    if (!worker || worker.killed) {
      return {
        stopped: false,
        message: `${workerType} worker not running`
      };
    }

    try {
      worker.kill("SIGTERM");
      console.log(`🛑 ${workerType} worker stopped (PID: ${worker.pid})`);

      return {
        stopped: true,
        type: workerType,
        stoppedAt: new Date()
      };

    } catch (error) {
      console.error(`❌ Failed to stop ${workerType} worker:`, error.message);
      return {
        stopped: false,
        message: `Failed to stop ${workerType} worker: ${error.message}`
      };
    }
  }

  /**
   * Check if a worker is running
   * @param {string} workerType - Type of worker to check
   * @returns {boolean} - True if running
   */
  isWorkerRunning(workerType) {
    const worker = this.workers.get(workerType);
    return worker && !worker.killed;
  }

  /**
   * Check if any workers are running
   * @returns {boolean} - True if any worker is running
   */
  isAnyWorkerRunning() {
    return Array.from(this.workers.values()).some(worker => !worker.killed);
  }

  /**
   * Get status of all workers
   * @returns {Object} - Status of each worker
   */
  getStatus() {
    return {
      livePlaylist: {
        running: this.isWorkerRunning("livePlaylist"),
        pid: this.workerPids.livePlaylist
      },
      beatsource: {
        running: this.isWorkerRunning("beatsource"),
        pid: this.workerPids.beatsource
      },
      anyRunning: this.isAnyWorkerRunning()
    };
  }

  /**
   * Start all workers
   * @returns {Object} - Results for each worker
   */
  startAllWorkers() {
    const results = {
      livePlaylist: this.startWorker("livePlaylist"),
      beatsource: this.startWorker("beatsource")
    };

    return results;
  }

  /**
   * Stop all workers
   * @returns {Object} - Results for each worker
   */
  stopAllWorkers() {
    const results = {
      livePlaylist: this.stopWorker("livePlaylist"),
      beatsource: this.stopWorker("beatsource")
    };

    return results;
  }

  /**
   * Get the path to a worker file
   * @param {string} workerType - Type of worker
   * @returns {string} - Path to worker file
   */
  getWorkerPath(workerType) {
    const workerBase = path.resolve(__dirname, "..");
    const paths = {
      beatsource: path.join(workerBase, "beatsource", "beatsourceWorker.js"),
      livePlaylist: path.join(workerBase, "livePlaylist", "livePlaylistWorker.js")
    };

    if (!paths[workerType]) {
      throw new Error(`Unknown worker type: ${workerType}`);
    }

    return paths[workerType];
  }

  /**
   * Gracefully shutdown all workers
   * @returns {Promise<void>}
   */
  async shutdown() {
    console.log("\n🛑 Shutting down all workers...");
    this.stopAllWorkers();

    // Wait for workers to exit
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn("⚠️ Workers did not exit gracefully, forcing shutdown");
        resolve();
      }, 5000);

      const checkInterval = setInterval(() => {
        if (!this.isAnyWorkerRunning()) {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          console.log("✅ All workers shut down");
          resolve();
        }
      }, 100);
    });
  }
}

module.exports = WorkerManager;
