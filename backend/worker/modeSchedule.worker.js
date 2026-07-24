/**
 * Automatic Mode Switching worker.
 * Every minute, for each venue with automatic scheduling enabled
 * (and not under manual override), apply the mode required by the schedule.
 *
 * Run standalone:  node worker/modeSchedule.worker.js
 * Or started from server.js via startModeScheduleWorker().
 */

const path = require("path");
const fs = require("fs");

const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath });
} else {
  require("dotenv").config();
}

const mongoose = require("mongoose");
const Venue = require("../models/Venue");
const {
  resolveScheduledMode,
  normalizeTimezone,
  getLocalParts,
  modeLabel
} = require("../services/modeScheduleService");
const { applyScheduledModeIfNeeded } = require("../services/venueModeService");

const POLL_INTERVAL_MS = 60 * 1000;
let SHOULD_STOP = false;
let pollTimer = null;
let running = false;

function setupSignalHandlers() {
  const stop = () => {
    console.log("\n[mode-schedule] stop signal received");
    SHOULD_STOP = true;
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

async function ensureDb() {
  if (mongoose.connection.readyState === 1) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }
  await mongoose.connect(uri);
  console.log("[mode-schedule] Connected to MongoDB");
}

/**
 * One poll cycle across all auto-scheduled venues.
 */
async function processAutomaticModeSchedules() {
  if (running) {
    console.log("[mode-schedule] previous cycle still running, skipping");
    return { skipped: true };
  }

  running = true;
  const now = new Date();
  const summary = { checked: 0, changed: 0, skipped: 0, errors: 0 };

  try {
    const venues = await Venue.find({
      "automaticScheduling.enabled": true,
      "automaticScheduling.manualOverride": { $ne: true }
    }).select(
      "name timezone automaticScheduling djMode livePlaylistActive spotifyMode djPassword"
    );

    summary.checked = venues.length;

    for (const venue of venues) {
      if (SHOULD_STOP) break;

      try {
        const tz = normalizeTimezone(venue.timezone);
        const local = getLocalParts(now, tz);
        const scheduledMode = resolveScheduledMode(
          venue.automaticScheduling,
          tz,
          now
        );

        if (!scheduledMode) {
          summary.skipped += 1;
          continue;
        }

        const result = await applyScheduledModeIfNeeded(
          venue,
          scheduledMode,
          "mode-schedule-worker"
        );

        if (result.changed) {
          summary.changed += 1;
          console.log(
            `[mode-schedule] ${venue.name}: switched to ${modeLabel(scheduledMode)} ` +
              `(local ${local.dayKey} ${String(local.hour).padStart(2, "0")}:${String(local.minute).padStart(2, "0")} ${tz})`
          );
        } else {
          summary.skipped += 1;
        }
      } catch (err) {
        summary.errors += 1;
        console.error(
          `[mode-schedule] error for venue ${venue._id}:`,
          err.message
        );
      }
    }
  } catch (err) {
    summary.errors += 1;
    console.error("[mode-schedule] cycle error:", err.message);
  } finally {
    running = false;
  }

  return summary;
}

/**
 * Start the polling loop. Safe to call from server.js when DB is already connected.
 */
function startModeScheduleWorker({ runImmediately = true } = {}) {
  if (pollTimer) {
    return { started: false, message: "Mode schedule worker already running" };
  }

  console.log(
    `[mode-schedule] Starting worker (interval ${POLL_INTERVAL_MS / 1000}s)`
  );

  const tick = async () => {
    if (SHOULD_STOP) return;
    const summary = await processAutomaticModeSchedules();
    if (summary && !summary.skipped) {
      console.log(
        `[mode-schedule] cycle: checked=${summary.checked} changed=${summary.changed} skipped=${summary.skipped} errors=${summary.errors}`
      );
    }
  };

  if (runImmediately) {
    tick().catch((err) =>
      console.error("[mode-schedule] initial tick failed:", err.message)
    );
  }

  pollTimer = setInterval(() => {
    tick().catch((err) =>
      console.error("[mode-schedule] tick failed:", err.message)
    );
  }, POLL_INTERVAL_MS);

  // Prevent the timer from keeping the process alive unexpectedly in tests;
  // when run as main / with server, we want it alive.
  if (typeof pollTimer.unref === "function" && require.main !== module) {
    // Keep referenced when embedded in API server so it actually runs
  }

  return { started: true, intervalMs: POLL_INTERVAL_MS };
}

function stopModeScheduleWorker() {
  SHOULD_STOP = true;
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  return { stopped: true };
}

async function main() {
  setupSignalHandlers();
  await ensureDb();
  startModeScheduleWorker({ runImmediately: true });

  // Keep process alive
  console.log("[mode-schedule] Worker running. Ctrl+C to stop.");
}

if (require.main === module) {
  main().catch((err) => {
    console.error("[mode-schedule] fatal:", err.message);
    process.exit(1);
  });
}

module.exports = {
  POLL_INTERVAL_MS,
  processAutomaticModeSchedules,
  startModeScheduleWorker,
  stopModeScheduleWorker
};
