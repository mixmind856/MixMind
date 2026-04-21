const path = require('path');
const { spawn } = require('child_process');

let livePlaylistChild = null;
let beatsourceWorkerChild = null;
let songRequestWorkerChild = null;

function isLivePlaylistRunning() {
  return livePlaylistChild && !livePlaylistChild.killed;
}

function isBeatsourceWorkerRunning() {
  return beatsourceWorkerChild && !beatsourceWorkerChild.killed;
}

function isRunning() {
  return isLivePlaylistRunning() || isBeatsourceWorkerRunning() || isSongRequestWorkerRunning();
}

function isSongRequestWorkerRunning() {
  return songRequestWorkerChild && !songRequestWorkerChild.killed;
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

    // Ensure song request worker is running when playlist mode is active
    const requestWorkerResult = startSongRequestWorker();

    return {
      started: true,
      pid: livePlaylistChild.pid,
      type: 'live-playlist',
      venueId,
      requestWorker: requestWorkerResult
    };
  } catch (err) {
    console.error(`Failed to start live playlist worker: ${err.message}`);
    return { started: false, error: err.message };
  }
}

function startSongRequestWorker() {
  if (isSongRequestWorkerRunning()) {
    return { started: false, message: 'Song request worker already running' };
  }

  const workerPath = path.resolve(__dirname, '../queues/songRequestWorker.js');

  try {
    songRequestWorkerChild = spawn(process.execPath, [workerPath], {
      cwd: path.resolve(__dirname, '..'),
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    songRequestWorkerChild.stdout.on('data', (data) => {
      process.stdout.write(`[song-request-worker] ${data.toString()}`);
    });

    songRequestWorkerChild.stderr.on('data', (data) => {
      process.stderr.write(`[song-request-worker-err] ${data.toString()}`);
    });

    songRequestWorkerChild.on('exit', (code, signal) => {
      console.log(`[song-request-worker] exited code=${code} signal=${signal}`);
      songRequestWorkerChild = null;
    });

    return { started: true, pid: songRequestWorkerChild.pid, type: 'song-request-worker' };
  } catch (err) {
    console.error(`Failed to start song request worker: ${err.message}`);
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

  if (isSongRequestWorkerRunning()) {
    try {
      songRequestWorkerChild.kill('SIGTERM');
      results.push({ stopped: true, type: 'song-request-worker' });
    } catch (err) {
      results.push({ stopped: false, type: 'song-request-worker', error: err.message });
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
  isSongRequestWorkerRunning,
  startLivePlaylist,
  startBeatsourceWorker,
  startSongRequestWorker,
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
  stopSongRequestWorker: () => {
    if (isSongRequestWorkerRunning()) {
      try {
        songRequestWorkerChild.kill('SIGTERM');
        return { stopped: true, type: 'song-request-worker' };
      } catch (err) {
        return { stopped: false, type: 'song-request-worker', error: err.message };
      }
    }
    return { stopped: false, message: 'Song request worker not running' };
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