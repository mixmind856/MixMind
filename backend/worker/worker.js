require("dotenv").config();
const { Worker } = require("bullmq");
const mongoose = require("mongoose");
const runBeatsourceFlow = require("./beatsourceClient");
const Request = require("../models/Request");

const connection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379
};

async function connectDB() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI not set");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Worker MongoDB connected");
}

async function startWorker() {
  await connectDB();

  const worker = new Worker(
    "beatsource",
    async (job) => {
      console.log("Processing job", job.id, job.data);

      const request = await Request.findById(job.data.requestId);
      if (!request) {
        throw new Error("Request not found");
      }

      // ===== LIVE MODE: Check payment is confirmed before processing =====
      if (request.checkoutSessionId) {
        // This is a LIVE mode request - require payment confirmation
        if (request.paymentStatus !== "captured" && request.paymentStatus !== "paid") {
          console.log(`⏳ LIVE mode request waiting for payment confirmation`);
          console.log(`   Current paymentStatus: ${request.paymentStatus}`);
          console.log(`   Required: "captured" or "paid"`);
          // Don't fail - retry later when payment completes
          throw new Error("Waiting for payment confirmation before processing");
        }
      }

      await Request.updateOne(
        { _id: request._id },
        { status: "processing" }
      );

      try {
        const result = await runBeatsourceFlow(request);

        await Request.updateOne(
          { _id: request._id },
          {
            status: "completed",
            beatSourceTrackId: result.trackId || null,
            resultUrl: result.url || null
          }
        );

        console.log("Job completed", job.id);
      } catch (err) {
        console.error("Job failed", job.id, err.message);
        await Request.updateOne(
          { _id: request._id },
          { status: "failed" }
        );
        throw err; // let BullMQ mark as failed
      }
    },
    { connection, concurrency: 1 }
  );

  worker.on("completed", (job) => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed`, err);
  });
}

startWorker().catch((err) => {
  console.error("Worker startup failed", err);
  process.exit(1);
});