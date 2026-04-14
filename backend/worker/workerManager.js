const path = require('path');
const { spawn } = require('child_process');

let livePlaylistChild = null;
let beatsourceWorkerChild = null;

function isLivePlaylistRunning() {
  return livePlaylistChild && !livePlaylistChild.killed;
}

function isBeatsourceWorkerRunning() {
  return beatsourceWorkerChild && !beatsourceWorkerChild.killed;
}

function isRunning() {
  return isLivePlaylistRunning() || isBeatsourceWorkerRunning();
}

function startLivePlaylist(venueId) {
  if (isLivePlaylistRunning()) {
    return { started: false, message: 'Live playlist worker already running' };
  }

  const workerPath = path.resolve(__dirname, 'runLivePlaylistFlow.js');
  const args = venueId ? [workerPath, venueId] : [workerPath];
  
  try {
    livePlaylistChild = spawn(process.execPath, args, {
      cwd: path.resolve(__dirname, '..'),
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    livePlaylistChild.on('error', (err) => {
      console.error(`[live-worker] spawn error: ${err.message}`);
      livePlaylistChild = null;
    });

    livePlaylistChild.stdout.on('data', (data) => {
      process.stdout.write(`[live-worker] ${data.toString()}`);
    });
    
    livePlaylistChild.stderr.on('data', (data) => {
      process.stderr.write(`[live-worker-err] ${data.toString()}`);
    });

    livePlaylistChild.on('exit', (code, signal) => {
      console.log(`[live-worker] exited code=${code} signal=${signal}`);
      livePlaylistChild = null;
    });

    return { started: true, pid: livePlaylistChild.pid, type: 'live-playlist', venueId };
  } catch (err) {
    console.error(`Failed to start live playlist worker: ${err.message}`);
    return { started: false, error: err.message };
  }
}

function startBeatsourceWorker() {
  if (isBeatsourceWorkerRunning()) {
    return { started: false, message: 'Beatsource queue worker already running' };
  }

  const workerPath = path.resolve(__dirname, 'worker.js');
  beatsourceWorkerChild = spawn(process.execPath, [workerPath], {
    cwd: path.resolve(__dirname, '..'),
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  beatsourceWorkerChild.stdout.on('data', (data) => {
    process.stdout.write(`[beatsource-queue] ${data.toString()}`);
  });
  beatsourceWorkerChild.stderr.on('data', (data) => {
    process.stderr.write(`[beatsource-queue-err] ${data.toString()}`);
  });

  beatsourceWorkerChild.on('exit', (code, signal) => {
    console.log(`[beatsource-queue] exited code=${code} signal=${signal}`);
    beatsourceWorkerChild = null;
  });

  return { started: true, pid: beatsourceWorkerChild.pid, type: 'beatsource-queue' };
}

function start() {
  const results = [];
  
  const beatsourceResult = startBeatsourceWorker();
  results.push(beatsourceResult);
  
  const livePlaylistResult = startLivePlaylist();
  results.push(livePlaylistResult);
  
  return { 
    started: beatsourceResult.started || livePlaylistResult.started, 
    workers: results 
  };
}

function stop() {
  const results = [];

  if (isBeatsourceWorkerRunning()) {
    try {
      beatsourceWorkerChild.kill('SIGTERM');
      results.push({ stopped: true, type: 'beatsource-queue' });
    } catch (err) {
      results.push({ stopped: false, type: 'beatsource-queue', error: err.message });
    }
  }

  if (isLivePlaylistRunning()) {
    try {
      livePlaylistChild.kill('SIGTERM');
      results.push({ stopped: true, type: 'live-playlist' });
    } catch (err) {
      results.push({ stopped: false, type: 'live-playlist', error: err.message });
    }
  }

  return { 
    stopped: results.some(r => r.stopped), 
    workers: results 
  };
}

module.exports = { 
  start, 
  stop, 
  isRunning,
  isLivePlaylistRunning,
  isBeatsourceWorkerRunning,
  startLivePlaylist,
  startBeatsourceWorker,
  stopLivePlaylist: () => {
    if (isLivePlaylistRunning()) {
      try {
        livePlaylistChild.kill('SIGTERM');
        return { stopped: true, type: 'live-playlist' };
      } catch (err) {
        return { stopped: false, type: 'live-playlist', error: err.message };
      }
    }
    return { stopped: false, message: 'Live playlist worker not running' };
  },
  stopBeatsourceWorker: () => {
    if (isBeatsourceWorkerRunning()) {
      try {
        beatsourceWorkerChild.kill('SIGTERM');
        return { stopped: true, type: 'beatsource-queue' };
      } catch (err) {
        return { stopped: false, type: 'beatsource-queue', error: err.message };
      }
    }
    return { stopped: false, message: 'Beatsource worker not running' };
  }
};
