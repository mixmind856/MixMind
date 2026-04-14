/**
 * Shared Worker Utilities
 * Common functions used by all workers
 */

const mongoose = require("mongoose");

/**
 * Connect to MongoDB for worker processes
 * @returns {Promise<void>}
 */
async function connectDatabase() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI environment variable not set");
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Worker: MongoDB connected");
  } catch (error) {
    console.error("❌ Worker: MongoDB connection failed:", error.message);
    throw error;
  }
}

/**
 * Disconnect from MongoDB gracefully
 * @returns {Promise<void>}
 */
async function disconnectDatabase() {
  try {
    await mongoose.disconnect();
    console.log("✅ Worker: MongoDB disconnected");
  } catch (error) {
    console.error("❌ Worker: MongoDB disconnection failed:", error.message);
  }
}

/**
 * Handle worker process errors
 * @param {Error} error - The error to handle
 * @param {string} context - Context where error occurred
 */
function handleWorkerError(error, context = "Worker") {
  console.error(`❌ ${context} Error:`, error.message);
  console.error(`Stack:`, error.stack);
}

/**
 * Log worker job start
 * @param {Object} job - Bull queue job
 * @param {string} type - Worker type
 */
function logJobStart(job, type) {
  console.log(`📋 [${type}] Job ${job.id} started`);
  console.log(`   Data:`, JSON.stringify(job.data, null, 2));
}

/**
 * Log worker job completion
 * @param {Object} job - Bull queue job
 * @param {Object} result - Job result
 * @param {string} type - Worker type
 */
function logJobComplete(job, result, type) {
  console.log(`✅ [${type}] Job ${job.id} completed`);
  console.log(`   Result:`, JSON.stringify(result, null, 2));
}

/**
 * Log worker job failure
 * @param {Object} job - Bull queue job
 * @param {Error} error - Error object
 * @param {string} type - Worker type
 */
function logJobFailed(job, error, type) {
  console.error(`❌ [${type}] Job ${job.id} failed`);
  console.error(`   Error:`, error.message);
  console.error(`   Attempt:`, job.attemptsMade + 1, `of`, job.opts.attempts);
}

/**
 * Format Redis connection config to string
 * @param {Object} config - Redis config object
 * @returns {string} - Formatted config string
 */
function formatRedisConfig(config) {
  return `redis://${config.host}:${config.port}`;
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  handleWorkerError,
  logJobStart,
  logJobComplete,
  logJobFailed,
  formatRedisConfig
};
