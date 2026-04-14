/**
 * Worker Core Module Index
 * Central export for core worker management
 */

const WorkerManager = require("./WorkerManager");

module.exports = {
  WorkerManager,
  createWorkerManager: () => new WorkerManager()
};
