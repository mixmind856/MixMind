/**
 * Beatsource Worker Entry Point
 * Processes music processing jobs from the Beatsource queue
 *
 * Responsibilities:
 * - Listen for beatsource queue jobs
 * - Process music uploads to BeatSource
 * - Update request status based on results
 * - Handle errors and retries
 */

require("dotenv").config();
const { Worker } = require("bullmq");
const WORKER_CONFIG = require("../config/workerConfig");
const { connectDatabase, disconnectDatabase, logJobStart, logJobComplete, logJobFailed } = require("../shared/workerUtils");
const Request = require("../../models/Request");
const runBeatsourceFlow = require("./beatsourceFlow");

const WORKER_TYPE = "BEATSOURCE";

/**
 * Initialize and start the Beatsource worker
 */
async function startBeatsourceWorker() {
  try {
    // Connect to database
    await connectDatabase();

    // Create worker instance
    const worker = new Worker(
      WORKER_CONFIG.QUEUES.BEATSOURCE.name,
      processBeatsourceJob,
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
 * Process a single Beatsource job
 * @param {Object} job - Bull queue job
 * @returns {Promise<Object>} - Job result
 */
async function processBeatsourceJob(job) {
  try {
    logJobStart(job, WORKER_TYPE);

    const { requestId } = job.data;

    if (!requestId) {
      throw new Error("Request ID not provided in job data");
    }

    // Fetch request from database
    const request = await Request.findById(requestId);
    if (!request) {
      throw new Error(`Request not found: ${requestId}`);
    }

    // ===== LIVE MODE: Check payment is confirmed before processing =====
    if (request.checkoutSessionId) {
      // This is a LIVE mode request - require payment confirmation
      if (request.paymentStatus !== "captured" && request.paymentStatus !== "paid") {
        console.log(`⏳ LIVE mode: Waiting for payment confirmation before beatsource processing`);
        console.log(`   Current paymentStatus: ${request.paymentStatus}`);
        console.log(`   Required: "captured" or "paid"`);
        throw new Error("Waiting for payment confirmation before processing");
      }
      console.log(`✅ LIVE mode: Payment confirmed (${request.paymentStatus})`);
    }

    // Update status to processing
    await Request.updateOne(
      { _id: request._id },
      { status: "processing" }
    );

    // Run Beatsource flow
    const result = await runBeatsourceFlow(request);

    // Update status to completed
    await Request.updateOne(
      { _id: request._id },
      {
        status: "completed",
        beatSourceTrackId: result.trackId || null,
        resultUrl: result.url || null
      }
    );

    return {
      success: true,
      requestId: request._id,
      trackId: result.trackId,
      url: result.url
    };

  } catch (error) {
    // Update request status to failed
    if (job.data.requestId) {
      await Request.updateOne(
        { _id: job.data.requestId },
        {
          status: "failed",
          errorMessage: error.message
        }
      );
    }

    throw error;
  }
}

// Start the worker if this file is run directly
if (require.main === module) {
  startBeatsourceWorker();
}

module.exports = {
  startBeatsourceWorker,
  processBeatsourceJob
};
