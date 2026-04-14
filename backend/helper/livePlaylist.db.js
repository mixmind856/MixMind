const AdminFlag = require("../models/AdminFlag");

/**
 * Live Playlist DB helpers
 * Note: Now using MongoDB polling instead of Redis queues
 */

async function isLivePlaylistEnabled() {
  const flag = await AdminFlag.findOne({ key: "LIVE_PLAYLIST" });
  return flag?.enabled || false;
}

async function enableLivePlaylist() {
  let flag = await AdminFlag.findOne({ key: "LIVE_PLAYLIST" });
  if (!flag) flag = new AdminFlag({ key: "LIVE_PLAYLIST" });
  flag.enabled = true;
  await flag.save();
  
  console.log(`✅ Live Playlist enabled - songRequestWorker will start processing`);
}

async function disableLivePlaylist() {
  const flag = await AdminFlag.findOne({ key: "LIVE_PLAYLIST" });
  if (flag) {
    flag.enabled = false;
    await flag.save();
    console.log(`✅ Live Playlist disabled`);
  }
}

module.exports = {
  isLivePlaylistEnabled,
  enableLivePlaylist,
  disableLivePlaylist
};
