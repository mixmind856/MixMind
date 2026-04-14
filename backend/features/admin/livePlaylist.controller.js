const {
  enableLivePlaylist,
  disableLivePlaylist
} = require("../../helper/livePlaylist.db");

exports.startLivePlaylist = async (req, res) => {
  await enableLivePlaylist();
  res.json({ success: true, status: "LIVE_PLAYLIST_STARTED" });
};

exports.stopLivePlaylist = async (req, res) => {
  await disableLivePlaylist();
  res.json({ success: true, status: "LIVE_PLAYLIST_STOPPED" });
};
