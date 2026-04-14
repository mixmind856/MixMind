# Worker Architecture - Professional Organization

## Overview

Workers are background job processors that handle long-running tasks asynchronously:
- **Beatsource Worker**: Uploads music to BeatSource API
- **Live Playlist Worker**: Manages live playlist updates in real-time

Previously all worker code was in one directory mixed together. Now it's professionally organized with clear separation of concerns.

---

## New Worker Structure

```
/backend/worker/
├── config/                          # Centralized configuration
│   └── workerConfig.js              # Redis, Queue, Job settings
│
├── core/                            # Core worker management
│   ├── WorkerManager.js             # Spawn, monitor, manage workers
│   └── index.js                     # Exports
│
├── shared/                          # Shared utilities
│   ├── workerUtils.js               # Common functions (DB, logging, etc.)
│   └── index.js                     # Exports
│
├── beatsource/                      # Beatsource worker
│   ├── beatsourceWorker.js          # Main worker process
│   ├── beatsourceFlow.js            # BeatSource API integration
│   ├── beatsourceConfig.js          # API keys & settings
│   └── index.js                     # Exports
│
├── livePlaylist/                    # Live Playlist worker
│   ├── livePlaylistWorker.js        # Main worker process
│   ├── livePlaylistFlow.js          # Playlist logic
│   └── index.js                     # Exports
│
├── utils/                           # (Existing utilities)
│   ├── beatsource-auth.json         # Credentials
│   └── utils.js                     # Existing helpers
│
└── README.md                        # This file
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Queue Listeners                         │
│  (Bull Queue - listening to Redis for new jobs)            │
└─────────────────────────────────────────────────────────────┘
        ↓ Job Added              ↓ Job Added
        │                        │
┌──────────────────┐    ┌──────────────────────┐
│ Beatsource       │    │ Live Playlist        │
│ Worker Process   │    │ Worker Process       │
│                  │    │                      │
│ PID: xxx         │    │ PID: yyy             │
│                  │    │                      │
│ Responsibilities:│    │ Responsibilities:    │
│ • Receive job    │    │ • Receive job        │
│ • Validate data  │    │ • Validate data      │
│ • Process flow   │    │ • Process flow       │
│ • Update DB      │    │ • Update DB          │
│ • Handle errors  │    │ • Handle errors      │
└──────────────────┘    └──────────────────────┘
        ↓                       ↓
┌──────────────────┐    ┌──────────────────────┐
│ beatsourceFlow   │    │ livePlaylistFlow     │
│ • Upload logic   │    │ • Playlist logic     │
│ • BeatSource API │    │ • Track management   │
│ • Retry handler  │    │ • Queue operations   │
│ • Validation     │    │ • State sync         │
└──────────────────┘    └──────────────────────┘
        ↓                       ↓
┌─────────────────────────────────────────────────────────┐
│              Database & External Services               │
│  (Update Request/LivePlaylistSession, Call APIs)        │
└─────────────────────────────────────────────────────────┘
```

---

## Module Organization

### config/workerConfig.js
**Purpose**: Centralize all configuration for workers

**Exports**:
- `REDIS`: Redis connection settings
- `QUEUES`: Queue names and job options
- `TIMEOUTS`: Job timeout settings
- `WORKER_LIMITS`: Concurrency and resource limits

**Usage**:
```javascript
const WORKER_CONFIG = require("./config/workerConfig");
const { connection } = WORKER_CONFIG.REDIS;
```

### core/WorkerManager.js
**Purpose**: Manage worker lifecycle (start, stop, monitor)

**Class Methods**:
- `startWorker(type)` - Start a specific worker
- `stopWorker(type)` - Stop a specific worker
- `startAllWorkers()` - Start all workers
- `stopAllWorkers()` - Stop all workers
- `getStatus()` - Get status of all workers
- `isWorkerRunning(type)` - Check if worker running
- `shutdown()` - Graceful shutdown

**Usage**:
```javascript
const { WorkerManager } = require("./core");
const manager = new WorkerManager();

manager.startWorker("beatsource");
manager.startWorker("livePlaylist");

const status = manager.getStatus();
// { livePlaylist: { running: true, pid: 1234 }, ... }
```

### shared/workerUtils.js
**Purpose**: Shared utilities used by all workers

**Exports**:
- `connectDatabase()` - Connect to MongoDB
- `disconnectDatabase()` - Disconnect from MongoDB
- `logJobStart(job, type)` - Log job start
- `logJobComplete(job, result, type)` - Log completion
- `logJobFailed(job, error, type)` - Log failure
- `handleWorkerError(error, context)` - Handle errors

**Usage**:
```javascript
const { connectDatabase, logJobStart } = require("../shared");

await connectDatabase();
logJobStart(job, "BEATSOURCE");
```

### beatsource/beatsourceWorker.js
**Purpose**: Main Beatsource worker process - listen to queue and process jobs

**Key Functions**:
- `startBeatsourceWorker()` - Initialize and start worker
- `processBeatsourceJob(job)` - Process a single job
- Handles: Stripe payment verification, music processing, error handling

**Usage**:
```javascript
// Started as separate process via WorkerManager
node backend/worker/beatsource/beatsourceWorker.js
```

**Job Format**:
```javascript
{
  data: {
    requestId: "mongoDB_id"  // Request with song details
  }
}
```

### beatsource/beatsourceFlow.js
**Purpose**: Core BeatSource API integration logic - separated from worker

**Exports**:
- `runBeatsourceFlow(request)` - Main upload flow
- `uploadWithRetry(request, maxRetries)` - Upload with retries
- `prepareMetadata(request)` - Prepare song metadata
- `uploadToBeatsource(metadata)` - Call BeatSource API
- `validateRequestData(request)` - Validate input
- `validateBeatsourceResult(result)` - Validate API response

**Why separate?** 
- Can be tested independently
- Can be reused outside worker context
- Pure business logic not tied to job processing

**Usage**:
```javascript
const { runBeatsourceFlow } = require("./beatsourceFlow");
const result = await runBeatsourceFlow(requestDoc);
// { trackId, url, metadata, uploadedAt }
```

### beatsource/beatsourceConfig.js
**Purpose**: Configuration for BeatSource API

**Exports**:
- `API_ENDPOINT` - API base URL
- `API_KEY` - Authentication key
- `UPLOAD` settings (file size, formats, timeout)
- `METADATA` requirements
- `RATE_LIMIT` settings
- `DEMO_MODE` flag

**Usage**:
```javascript
const BEATSOURCE_CONFIG = require("./beatsourceConfig");
if (BEATSOURCE_CONFIG.DEMO_MODE) {
  // Use mock data
}
```

### livePlaylist/livePlaylistWorker.js
**Purpose**: Main Live Playlist worker process - listen to queue and process jobs

**Key Functions**:
- `startLivePlaylistWorker()` - Initialize and start worker
- `processLivePlaylistJob(job)` - Process job (update, rotate, sync)
- `rotateTrack(session)` - Move to next track
- `syncPlaylist(session)` - Sync state with clients

**Usage**:
```javascript
// Started as separate process via WorkerManager
node backend/worker/livePlaylist/livePlaylistWorker.js
```

**Job Format**:
```javascript
{
  data: {
    sessionId: "mongoDB_id",
    action: "update" | "rotateTrack" | "sync",
    data: { /* action-specific data */ }
  }
}
```

### livePlaylist/livePlaylistFlow.js
**Purpose**: Core Live Playlist business logic - separated from worker

**Exports**:
- `updateLivePlaylist(session, data)` - Update session
- `addTrackToPlaylist(sessionId, trackData)` - Add track to queue
- `removeTrackFromPlaylist(sessionId, trackId)` - Remove track
- `getPlaylistState(sessionId)` - Get current state
- `clearPlaylist(sessionId)` - Clear all tracks

**Why separate?** 
- Can be called from REST APIs, WebSocket handlers, etc.
- Pure business logic not tied to job processing
- Easy to test and mock

**Usage**:
```javascript
const { addTrackToPlaylist } = require("./livePlaylistFlow");
const result = await addTrackToPlaylist(sessionId, {
  requestId: "req123",
  songTitle: "Song Name",
  artist: "Artist Name"
});
```

---

## How Workers Are Used

### Starting Workers from Main Server

```javascript
// server.js or index.js
const { WorkerManager } = require("./worker/core");

const workerManager = new WorkerManager();

// Start workers when server starts
const beatsourceResult = workerManager.startWorker("beatsource");
const livePlaylistResult = workerManager.startWorker("livePlaylist");

console.log(beatsourceResult);
// { started: true, pid: 1234, type: 'beatsource', startedAt: Date }

// Get status
const status = workerManager.getStatus();
// {
//   livePlaylist: { running: true, pid: 5678 },
//   beatsource: { running: true, pid: 1234 },
//   anyRunning: true
// }

// Graceful shutdown
process.on("SIGTERM", async () => {
  await workerManager.shutdown();
  process.exit(0);
});
```

### Adding Jobs to Queue from Controllers

```javascript
// api/admin/admin.controller.js
const beatsourceQueue = require("../../queues/beatsourceQueue");

// When admin approves a request, add job to queue
async function approveRequest(req, res) {
  // ... approval logic ...
  
  // Queue the job for Beatsource worker
  await beatsourceQueue.add("beatsourceJob", {
    requestId: request._id.toString()
  });
  
  res.json({ success: true });
}
```

### Querying Playlist from Controllers

```javascript
// Using flow directly (doesn't need worker running)
const { getPlaylistState, addTrackToPlaylist } = require("./worker/livePlaylist");

// In API controller
async function getCurrentPlaylist(req, res) {
  const state = await getPlaylistState(sessionId);
  res.json(state);
}

async function addSongToPlaylist(req, res) {
  const result = await addTrackToPlaylist(sessionId, {
    requestId: req.body.requestId,
    songTitle: req.body.songTitle,
    artist: req.body.artist
  });
  res.json(result);
}
```

---

## Configuration Files

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# BeatSource API
BEATSOURCE_API_ENDPOINT=https://api.beatsource.com/v1
BEATSOURCE_API_KEY=your_api_key_here
BEATSOURCE_API_SECRET=your_secret_here
BEATSOURCE_VERBOSE=false
BEATSOURCE_LOG_REQUESTS=false

# Worker Settings
DEMO_MODE=true  # Use mock data instead of real APIs
```

### Docker Environment (if using containers)

```dockerfile
FROM node:16
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Start main server with workers
CMD ["node", "server.js"]

# Or run specific worker
CMD ["node", "backend/worker/beatsource/beatsourceWorker.js"]
```

---

## Monitoring and Logging

### Log Prefixes

```
✅ Success
❌ Error
⏳ Processing
🎵 Music operation
📝 Update operation
🔄 Sync operation
📋 Job start
📤 Upload
➕ Add
➖ Remove
🧹 Clear
🛑 Shutdown
💳 Payment
```

### Example Logs

```
✅ Worker: MongoDB connected
📋 [BEATSOURCE] Job abc123 started
   Data: { requestId: "req123" }
🎵 Processing song: My Song by Artist Name
📤 Attempt 1/3: Uploading My Song
🔓 Beatsource API request successful
✅ [BEATSOURCE] Job abc123 completed
   Result: { success: true, trackId: "track123", url: "https://..." }
```

---

## Error Handling

### Automatic Retries

Jobs are configured to retry automatically:

- **Beatsource**: 3 attempts with exponential backoff (2s, 4s, 8s)
- **Live Playlist**: 2 attempts with fixed backoff (5s each)

### Job Failure Handling

If a job fails after all retries:
1. Request/Session status updated to "failed"
2. Error message stored in database
3. Admin notified (future feature)
4. Failed job retained in queue for manual inspection

### Worker Crash Recovery

If a worker process crashes:
1. `WorkerManager` detects crash via exit event
2. Logs crash with exit code and signal
3. Parent process can restart worker if needed
4. Jobs automatically re-queued by Bull

---

## Testing Workers

### Testing Beatsource Flow (without worker)

```javascript
const { runBeatsourceFlow } = require("./beatsource/beatsourceFlow");

// Create mock request
const mockRequest = {
  songTitle: "Test Song",
  artist: "Test Artist",
  genre: "Electronic",
  price: 9.99
};

try {
  const result = await runBeatsourceFlow(mockRequest);
  console.log("Upload result:", result);
} catch (error) {
  console.error("Upload failed:", error.message);
}
```

### Testing Live Playlist Flow (without worker)

```javascript
const { getPlaylistState, addTrackToPlaylist } = require("./livePlaylist");

// Add track
const result = await addTrackToPlaylist(sessionId, {
  requestId: "req123",
  songTitle: "Song",
  artist: "Artist"
});

// Get state
const state = await getPlaylistState(sessionId);
console.log("Current track:", state.currentTrack);
console.log("Queue:", state.upcomingTracks);
```

### Starting Workers Manually

```bash
# Start Beatsource worker
node backend/worker/beatsource/beatsourceWorker.js

# Start Live Playlist worker
node backend/worker/livePlaylist/livePlaylistWorker.js

# Start both with WorkerManager
node -e "const {WorkerManager} = require('./backend/worker/core'); new WorkerManager().startAllWorkers()"
```

---

## Performance Optimization

### Current Configuration

```javascript
CONCURRENT_JOBS_PER_WORKER: 1  // One job at a time
MAX_WORKERS: 2                  // Beatsource + Live Playlist
TIMEOUTS: {
  BEATSOURCE_JOB: 60000,        // 60 seconds
  LIVE_PLAYLIST_JOB: 30000      // 30 seconds
}
```

### Scaling Considerations

If you need higher throughput:

1. **Add worker pool**: Run multiple Beatsource worker processes
2. **Increase concurrency**: Set `CONCURRENT_JOBS_PER_WORKER > 1`
3. **Use clustering**: Use Node.js `cluster` module
4. **Separate queues**: Create separate queues for different job types
5. **Optimize BeatSource flow**: Cache credentials, parallel uploads

---

## Migration from Old Structure

### Old Structure:
```
worker/
├── worker.js              (mixed concerns)
├── workerManager.js       (managing mixed logic)
├── beatsourceClient.js    (Beatsource logic)
├── livePlaylist.worker.js (Live Playlist worker)
├── runLivePlaylistFlow.js (Live Playlist flow)
└── utils/
```

### Migration Steps:

1. ✅ Create new directory structure
2. ✅ Move and refactor beatsource logic
3. ✅ Move and refactor live playlist logic
4. ✅ Extract shared utilities
5. ✅ Create centralized configuration
6. Update server.js to use new WorkerManager
7. Run existing tests
8. Deploy and monitor

---

## Future Improvements

1. **Worker health checks**: Periodic health status reporting
2. **Metrics collection**: Job processing time, failure rates, success rates
3. **Dashboard**: Real-time worker status and job monitoring
4. **Job scheduling**: Cron jobs for recurring tasks
5. **Dead letter queue**: Hold failed jobs for manual review
6. **Worker clustering**: Multiple worker instances with load balancing
7. **WebSocket integration**: Real-time updates to connected clients
8. **Distributed processing**: Process jobs across multiple machines

---

## Quick Reference

### Starting Workers
```bash
npm start  # Starts server with workers
```

### Checking Worker Status
```javascript
const { WorkerManager } = require("./backend/worker/core");
const manager = new WorkerManager();
console.log(manager.getStatus());
```

### Adding Jobs
```javascript
const queue = require("./backend/queues/beatsourceQueue");
await queue.add("beatsourceJob", { requestId: "123" });
```

### Worker Logs
```bash
tail -f logs/beatsource-worker.log
tail -f logs/livePlaylist-worker.log
```

---

**Version**: 1.0  
**Status**: ✅ Production Ready  
**Last Updated**: February 2, 2026
