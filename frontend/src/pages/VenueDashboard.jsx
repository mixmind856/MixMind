import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import DJAccessManagement from "../components/DJAccessManagement";
import logo from "../assets/Mixmind.jpeg";
import { Music, Zap, Award, Flame, Info } from "lucide-react";

export default function VenueDashboard() {
  const navigate = useNavigate();
  const [venue, setVenue] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [livePlaylistActive, setLivePlaylistActive] = useState(false);
  const [venueActive, setVenueActive] = useState(true);
  const [togglingVenueStatus, setTogglingVenueStatus] = useState(false);
  const [djMode, setDJMode] = useState(false);
  const [djPassword, setDjPassword] = useState("");
  const [showDJModal, setShowDJModal] = useState(false);
  const [settingUpDJ, setSettingUpDJ] = useState(false);
  const [isOn,setisOn]=useState(false);
  const [preferredGenres, setPreferredGenres] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [savingGenres, setSavingGenres] = useState(false);
  const [genreCheckBypass, setGenreCheckBypass] = useState(false);
  const [availableGenres] = useState([
    "COMMERCIAL_POP",
    "POP",
    "RNB",
    "US_HIPHOP",
    "UK_HIPHOP",
    "AFROBEATS",
    "DRILL",
    "ROCK",
    "INDIE",
    "HOUSE",
    "DANCEHALL",
    "DISCO",
    "REGGAETON",
    "HIP HOP",
    "80S",
    "90S",
    "CHEESE",
    "2000S",
    "GIRLS",
    "SINGALONG",
    "COMMERCIAL",
    "EDM",
    "TECHHOUSE",
    "TECHNO",
    "FUNK",
    "70S",
    "SOUL"
  ]);
  const [stats, setStats] = useState({
    total: 267,
    pending: 18,
    completed: 231,
    rejected: 18,
    revenue: 812.45
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("venueToken");
    if (!token) {
      navigate("/venue/signin");
      return;
    }
    fetchVenueData(token);
  }, [navigate]);

  // Check if backend is running
  // useEffect(() => {
  //   const checkBackendStatus = async () => {
  //     try {
  //       const response = await fetch(`${import.meta.env.VITE_API_URL}/check-vdj`, {
  //         timeout: 2000
  //       });
  //       if (response.ok) {
  //         setisOn(true);
  //         console.log("✅ Backend is running");
  //       } else {
  //         setisOn(false);
  //       }
  //     } catch (err) {
  //       setisOn(false);
  //       console.log("⚠️ Backend status: unreachable");
  //     }
  //   };

  //   checkBackendStatus();
  //   // Check every 30 seconds
  //   const interval = setInterval(checkBackendStatus, 30000);
  //   return () => clearInterval(interval);
  // }, []);

  const fetchVenueData = async (token) => {
    try {
      setLoading(true);
      setError("");
      
      // Fetch venue profile
      const venueRes = await fetch(`${import.meta.env.VITE_API_URL}/api/venue/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (venueRes.status === 401) {
        localStorage.removeItem("venueToken");
        navigate("/venue/signin");
        return;
      }

      const venueData = await venueRes.json();
      setVenue(venueData);
      setLivePlaylistActive(venueData.livePlaylistActive || false);
      setVenueActive(venueData.isActive || true);
      setDJMode(venueData.djMode || false);

      // Fetch venue requests
      const requestsRes = await fetch(
        `${import.meta.env.VITE_API_URL}/api/requests/venue/${venueData._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        setRequests(requestsData);
        
        // Categorize statuses correctly based on Request model
        // Status enum: ["queued", "created", "pending_dj_approval", "paid", "approved", "processing", "completed", "failed", "rejected", "authorized", "analyzing"]
        
        const PENDING_STATUSES = ["created", "authorized", "pending_dj_approval", "approved", "queued", "analyzing"];
        const COMPLETED_STATUSES = ["completed", "paid"];
        const REJECTED_STATUSES = ["rejected", "failed"];
        
        const total = requestsData.length;
        const pending = requestsData.filter(r => PENDING_STATUSES.includes(r.status)).length;
        const completed = requestsData.filter(r => COMPLETED_STATUSES.includes(r.status)).length;
        const rejected = requestsData.filter(r => REJECTED_STATUSES.includes(r.status)).length;
        const revenue = requestsData.reduce((sum, r) => sum + (r.price || 0), 0);

        // Debug logs
        console.log("📊 Total requests from API:", total);
        console.log("📊 Pending count:", pending);
        console.log("   🔵 Pending statuses:", requestsData.filter(r => PENDING_STATUSES.includes(r.status)).map(r => ({status: r.status, title: r.title})));
        console.log("📊 Completed count:", completed);
        console.log("   🟢 Completed statuses:", requestsData.filter(r => COMPLETED_STATUSES.includes(r.status)).map(r => ({status: r.status, title: r.title})));
        console.log("📊 Rejected count:", rejected);
        console.log("   🔴 Rejected statuses:", requestsData.filter(r => REJECTED_STATUSES.includes(r.status)).map(r => ({status: r.status, title: r.title})));
        console.log("📊 Revenue total:", revenue);
        console.log("📊 All requests data:", requestsData);

        setStats({
          total,
          pending,
          completed,
          rejected,
          revenue
        });
      }
    } catch (err) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("venueToken");
    localStorage.removeItem("venueId");
    navigate("/");
  };

  const handleRefreshStats = async () => {
    const token = localStorage.getItem("venueToken");
    setRefreshing(true);
    try {
      await fetchVenueData(token);
    } finally {
      setRefreshing(false);
    }
  };

  const handleApproveRequest = async (requestId) => {
    const token = localStorage.getItem("venueToken");
    setProcessingId(requestId);
    setError("");
    setSuccessMsg("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/requests/${requestId}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ venueId: venue._id })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to approve request");
      }

      setSuccessMsg("Request approved! Worker processing started.");
      fetchVenueData(token);

      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to approve request");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (requestId) => {
    const token = localStorage.getItem("venueToken");
    setProcessingId(requestId);
    setError("");
    setSuccessMsg("");

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/requests/${requestId}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ venueId: venue._id, reason: "Rejected by venue" })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to reject request");
      }

      setSuccessMsg("Request rejected.");
      fetchVenueData(token);

      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to reject request");
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleLivePlaylist = async () => {
    const token = localStorage.getItem("venueToken");
    const newState = !livePlaylistActive;

    console.log(`🎛️ Toggling Live Playlist to: ${newState}`);
    console.log(`⚠️  DJ Mode is INDEPENDENT and NOT affected`);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/venue/toggle-live-playlist`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ active: newState })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to toggle live playlist");
      }

      const data = await response.json();
      console.log(`📊 Toggle response:`, data);
      console.log(`   active: ${data.active}`);
      console.log(`   djMode: ${data.djMode} (unchanged)`);

      // Update ONLY Live Playlist state
      setLivePlaylistActive(data.active);
      
      // DJ Mode state should remain unchanged
      console.log(`✅ Updated - Live Playlist: ${data.active}, DJ Mode: ${data.djMode} (unchanged)`);
      
      if (data.active === true) {
        setSuccessMsg("✅ Live playlist enabled!");
      } else {
        setSuccessMsg("✅ Live playlist disabled!");
      }

      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error(`❌ Toggle error:`, err);
      setError(err.message || "Failed to toggle live playlist");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleToggleVenueStatus = async () => {
    const token = localStorage.getItem("venueToken");
    setTogglingVenueStatus(true);
    setError("");
    const newState = !venueActive;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/venue/toggle-status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ active: newState })
        }
      );

      if (!response.ok) {
        throw new Error("Failed to toggle venue status");
      }

      setVenueActive(newState);
      setSuccessMsg(
        newState
          ? "✅ Venue is now ONLINE - Customers can request songs"
          : "🔴 Venue is now OFFLINE - Customers cannot request songs"
      );

      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setError(err.message || "Failed to toggle venue status");
    } finally {
      setTogglingVenueStatus(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-300";
      case "processing":
        return "bg-blue-500/20 text-blue-300";
      case "rejected":
        return "bg-red-500/20 text-red-300";
      case "authorized":
      case "created":
        return "bg-yellow-500/20 text-yellow-300";
      default:
        return "bg-gray-500/20 text-gray-300";
    }
  };

  const handleSetupDJ = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("venueToken");
    setSettingUpDJ(true);
    setError("");

    try {
      if (!djMode) {
        // Enable DJ mode
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/dj/initialize/${venue._id}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ djPassword })
          }
        );

        if (!response.ok) {
          throw new Error("Failed to setup DJ mode");
        }

        setDJMode(true);
        // DJ Mode is now INDEPENDENT - doesn't affect Live Playlist
        setSuccessMsg("✅ DJ Mode enabled! Share the password with your DJ. Live Playlist remains unchanged.");
        
        setDjPassword("");
        setShowDJModal(false);
      } else {
        // Disable DJ mode
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/dj/toggle/${venue._id}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({})
          }
        );

        if (!response.ok) {
          throw new Error("Failed to disable DJ mode");
        }

        setDJMode(false);
        // DJ Mode is now INDEPENDENT - doesn't affect Live Playlist
        setSuccessMsg("✅ DJ Mode disabled. Live Playlist remains unchanged.");
        setShowDJModal(false);
      }

      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to update DJ mode");
    } finally {
      setSettingUpDJ(false);
    }
  };

  const handleAccessDJ = () => {
    navigate(`/venue/dj/${venue._id}`);
  };

  const fetchPreferredGenres = async (token) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/venue/genres/get`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPreferredGenres(data.preferredGenres || []);
        setSelectedGenres(data.preferredGenres || []);
        setGenreCheckBypass(data.genreCheckBypass || false);
        console.log("📊 Preferred genres:", data.preferredGenres);
        console.log("🔓 Genre check bypass:", data.genreCheckBypass);
      }
    } catch (err) {
      console.error("Failed to fetch genres:", err);
    }
  };

  const handleSaveGenres = async () => {
    const token = localStorage.getItem("venueToken");
    
    // Validation: Either select genres OR enable "All Genres"
    if (!genreCheckBypass && selectedGenres.length === 0) {
      setError("Please select at least one genre or enable 'All Genres'");
      return;
    }

    setSavingGenres(true);
    setError("");
    setSuccessMsg("");

    try {
      const payload = genreCheckBypass 
        ? { genreCheckBypass: true }
        : { preferredGenres: selectedGenres, genreCheckBypass: false };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/venue/genres/set`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Failed to save genres");
      }

      const data = await response.json();
      setPreferredGenres(data.preferredGenres || []);
      setGenreCheckBypass(data.genreCheckBypass || false);
      
      const msg = data.genreCheckBypass 
        ? "✅ All genres enabled - Songs accepted without restriction"
        : `✅ Genres updated: ${data.preferredGenres.join(", ")}`;
      
      setSuccessMsg(msg);
      console.log("✅ Genres saved:", payload);
    } catch (err) {
      setError(err.message || "Failed to save genres");
    } finally {
      setSavingGenres(false);
    }
  };

  const handleGenreToggle = (genre) => {
    setSelectedGenres(prev => {
      if (prev.includes(genre)) {
        return prev.filter(g => g !== genre);
      } else {
        return [...prev, genre];
      }
    });
  };

  const handleAllGenres = () => {
    if (genreCheckBypass) {
      // Disable "All Genres" - reset to empty
      setGenreCheckBypass(false);
      setSelectedGenres([]);
    } else {
      // Enable "All Genres" - bypass all checks
      setGenreCheckBypass(true);
      setSelectedGenres([]);
    }
  };

  // Fetch genres on component mount
  useEffect(() => {
    const token = localStorage.getItem("venueToken");
    if (token) {
      fetchPreferredGenres(token);
    }
  }, []);

  // Auto-refresh stats every 10 seconds
  useEffect(() => {
    const token = localStorage.getItem("venueToken");
    if (!token) return;

    const interval = setInterval(() => {
      fetchVenueData(token);
    }, 1800000); // Refresh every 30 minutes

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#140822] to-[#0a0712] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          <p className="text-gray-400 mt-4">Loading venue dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#140822] to-[#0a0712] text-white">
      {/* Background glow */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-purple-600/20 blur-[200px]" />
      </div>

      {/* Header */}
      <div className="bg-black/40 backdrop-blur-md border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
         <div className="inline-flex items-center justify-center w-15 h-15 rounded-lg glow-purple" 
                        style={{ background: "linear-gradient(135deg, #A855F7, #7C3AED)" }}>
                    <img src={logo} alt="MixMind Logo" className="w-13 h-13" />
                   </div>
          <div className="md:-ml-210">
            <h1 className="text-2xl font-bold">Venue Dashboard</h1>
            {venue && <p className="text-gray-400 text-sm">{venue.name}</p>}
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-600/20 text-red-300 rounded-lg border border-red-500/30 hover:bg-red-600/30 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-6 py-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-green-500/20 border border-green-500 text-green-200 px-6 py-4 rounded-lg mb-6">
            {successMsg}
          </div>
        )}

        {/* Live Playlist Control */}
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-xl p-8 mb-12">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Playlist Mode</h2>
            </div>
            <div className="flex gap-3 items-center">
              <button
                onClick={handleToggleLivePlaylist}
                className={`px-8 py-3 rounded-lg font-semibold ml-20 transition-all ${
                  livePlaylistActive
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-gray-600 hover:bg-gray-700 text-white"
                }`}
              >
                {livePlaylistActive ? "Turn Off" : "Turn On"}
              </button>
                           <div className="group relative ml-10 flex flex-col items-center cursor-help">
  
  {/* Label below the icon */}

  {/* 1. Added 'relative' so the tooltip aligns to this box */}
{/* 2. Added 'group' so children can react to hovering here */}
{/* Added tabIndex={0} and focus-within classes to handle "clicks" on mobile */}
<div 
  className="relative group -ml-10 flex flex-col items-center cursor-help focus-within:outline-none" 
  tabIndex={0}
>
    <Info size={24} style={{ color: '#22E3A1' }} />
    <p style={{ color: '#22E3A1' }}>Info.</p>

    {/* Added 'group-focus:opacity-100' and 'group-active:opacity-100' for mobile tap */}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 
        bg-[#121222]/95 border border-[#a855f7]/40 text-[#C084FC] 
        px-[14px] py-[10px] rounded-lg text-[12px] whitespace-nowrap 
        shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-50 
        opacity-0 pointer-events-none transition-opacity duration-200
        group-hover:opacity-100 
        group-focus:opacity-100 
        group-active:opacity-100">
        Tooltip Content
    </div>
</div>


</div>

            </div>
          </div>
        </div>

        {/* Venue Status Control */}
        <div className={`bg-gradient-to-r ${venueActive ? 'from-green-900/30 to-emerald-900/30 border-green-500/30' : 'from-red-900/30 to-orange-900/30 border-red-500/30'} border rounded-xl p-8 mb-12`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">Venue Status</h2>
              <p className="text-gray-400">
                {venueActive 
                  ? "🟢 ONLINE - Customers can view your venue and request songs" 
                  : "🔴 OFFLINE - Your venue is hidden from customers"}
              </p>
            </div>
            <button
              onClick={handleToggleVenueStatus}
              disabled={togglingVenueStatus}
              className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                venueActive
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              } ${togglingVenueStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {togglingVenueStatus ? "Updating..." : (venueActive ? "Go Offline" : "Go Online")}
            </button>
          </div>
        </div>

        {/* DJ Mode Control */}
        <div className={`bg-gradient-to-r ${djMode ? 'from-purple-900/30 to-pink-900/30 border-purple-500/30' : 'from-gray-900/30 to-gray-900/30 border-gray-500/30'} border rounded-xl p-8 mb-12`}>
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">🎧 DJ Mode</h2>
              <p className="text-gray-400">
                {djMode 
                  ? "✓ Enabled - DJ can accept/reject requests in real-time" 
                  : "Disabled - Set a DJ password to enable DJ Mode"}
              </p>
            </div>
            <div className="flex gap-3">
              {djMode && (
                <button
                  onClick={handleAccessDJ}
                  className="px-8 py-3 rounded-lg font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-all"
                >
                  Access DJ Panel
                </button>
              )}
              <button
                onClick={() => setShowDJModal(true)}
                className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                  djMode
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-purple-600 hover:bg-purple-700 text-white"
                }`}
              >
                {djMode ? "Disable DJ Mode" : "Enable DJ Mode"}
              </button>
            </div>
          </div>
        </div>

        {/* DJ Setup Modal */}
        {showDJModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-[#140822] border border-purple-500/30 rounded-xl p-8 max-w-md w-full">
              <h3 className="text-2xl font-bold mb-4">
                {djMode ? "Disable DJ Mode" : "Enable DJ Mode"}
              </h3>
              
              {!djMode && (
                <form onSubmit={handleSetupDJ}>
                  <p className="text-gray-400 mb-4">
                    Set a password that your DJ will use to access the DJ panel.
                  </p>
                  <input
                    type="password"
                    value={djPassword}
                    onChange={(e) => setDjPassword(e.target.value)}
                    placeholder="Enter DJ password"
                    required
                    className="w-full px-4 py-2 bg-white/10 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 mb-4 focus:outline-none focus:border-purple-500"
                  />
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={settingUpDJ || !djPassword}
                      className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold disabled:opacity-50 transition-all"
                    >
                      {settingUpDJ ? "Setting up..." : "Enable DJ Mode"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDJModal(false);
                        setDjPassword("");
                      }}
                      className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {djMode && (
                <div>
                  <p className="text-gray-400 mb-4">
                    Are you sure you want to disable DJ Mode? Your DJ will no longer be able to manage requests.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSetupDJ}
                      disabled={settingUpDJ}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-50 transition-all"
                    >
                      {settingUpDJ ? "Disabling..." : "Disable DJ Mode"}
                    </button>
                    <button
                      onClick={() => setShowDJModal(false)}
                      className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Genre Management Control */}
        <div className="bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border border-blue-500/30 rounded-xl p-8 mb-12">
          <div>
            <h2 className="text-2xl font-bold mb-2">🎵 Preferred Genres</h2>
            <p className="text-gray-400 mb-6">
              Select music genres you want to allow at your venue. When DJ Mode is OFF, only songs matching these genres will be accepted.
            </p>

            {/* Current Genres Display */}
            {genreCheckBypass ? (
              <div className="mb-6 p-4 bg-green-600/20 border border-green-500/40 rounded-lg">
                <p className="text-green-300 font-semibold">✅ All Genres Mode</p>
                <p className="text-sm text-green-200">All songs will be accepted without genre restrictions</p>
              </div>
            ) : preferredGenres.length > 0 ? (
              <div className="mb-6">
                <p className="text-sm text-gray-300 mb-3">Currently Selected:</p>
                <div className="flex flex-wrap gap-2">
                  {preferredGenres.map(genre => (
                    <span key={genre} className="px-3 py-1 bg-blue-600/40 border border-blue-500/60 rounded-full text-sm text-blue-200">
                      ✓ {genre}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Mode Selection */}
            <div className="mb-6 flex gap-4">
              <button
                onClick={handleAllGenres}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all border-2 ${
                  genreCheckBypass
                    ? "bg-green-600/20 border-green-500 text-green-300"
                    : "bg-gray-700/30 border-gray-600 text-gray-300 hover:bg-gray-600/30"
                }`}
              >
                {genreCheckBypass ? "✓ All Genres Enabled" : "Enable All Genres"}
              </button>
            </div>

            {/* Genre Selection Grid (only show if not in bypass mode) */}
            {!genreCheckBypass && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                  {availableGenres.map(genre => (
                    <label key={genre} className="flex items-center gap-2 cursor-pointer p-3 rounded-lg hover:bg-white/5 transition-all">
                      <input
                        type="checkbox"
                        checked={selectedGenres.includes(genre)}
                        onChange={() => handleGenreToggle(genre)}
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                      />
                      <span className="text-white text-sm">{genre}</span>
                    </label>
                  ))}
                </div>
              </>
            )}

            {/* Save Button */}
            <button
              onClick={handleSaveGenres}
              disabled={savingGenres || (!genreCheckBypass && selectedGenres.length === 0)}
              className={`w-full px-6 py-3 rounded-lg font-semibold transition-all ${
                savingGenres
                  ? "bg-blue-600/50 cursor-not-allowed opacity-50"
                  : !genreCheckBypass && selectedGenres.length === 0
                  ? "bg-gray-600 cursor-not-allowed opacity-50"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {savingGenres ? "Saving..." : "Save Genre Settings"}
            </button>

            {/* Info Message */}
            {!genreCheckBypass && selectedGenres.length === 0 && (
              <p className="text-sm text-yellow-400 mt-4">
                ⚠️ No genres selected. Click "Enable All Genres" to accept all songs, or select specific genres.
              </p>
            )}
            {genreCheckBypass && (
              <p className="text-sm text-green-400 mt-4">
                ✅ All genres mode enabled. All song requests will be accepted without genre restrictions.
              </p>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">📊 Live Stats</h2>
            <button
              onClick={handleRefreshStats}
              disabled={refreshing}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
            >
              {refreshing ? "⟳ Refreshing..." : "⟳ Refresh"}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="bg-white/5 backdrop-blur-md border border-purple-500/20 rounded-xl p-6 hover:border-purple-500/40 transition-all">
              <p className="text-gray-400 text-sm mb-2">Total Requests</p>
              <p className="text-3xl font-bold text-purple-400">{stats.total}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-purple-500/20 rounded-xl p-6 hover:border-yellow-500/40 transition-all">
              <p className="text-gray-400 text-sm mb-2">Pending</p>
              <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-purple-500/20 rounded-xl p-6 hover:border-green-500/40 transition-all">
              <p className="text-gray-400 text-sm mb-2">Completed</p>
              <p className="text-3xl font-bold text-green-400">{stats.completed}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-purple-500/20 rounded-xl p-6 hover:border-red-500/40 transition-all">
              <p className="text-gray-400 text-sm mb-2">Rejected</p>
              <p className="text-3xl font-bold text-red-400">{stats.rejected}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-purple-500/20 rounded-xl p-6 hover:border-blue-500/40 transition-all">
              <p className="text-gray-400 text-sm mb-2">Total Revenue</p>
              <p className="text-3xl font-bold text-blue-400">£{stats.revenue.toFixed(2)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">💡 Auto-refreshes every 10 seconds</p>
        </div>

        {/* Venue Info */}
        {venue && (
          <div className="bg-white/5 backdrop-blur-md border border-purple-500/20 rounded-xl p-8 mb-12">
            <h2 className="text-xl font-bold mb-6">Venue Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-gray-400 text-sm">Email</p>
                <p className="text-white font-semibold">{venue.email}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Phone</p>
                <p className="text-white font-semibold">{venue.phone || "N/A"}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Location</p>
                <p className="text-white font-semibold">
                  {venue.city && venue.state 
                    ? `${venue.city}, ${venue.state}` 
                    : venue.address || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Website</p>
                <p className="text-white font-semibold">{venue.websiteUrl || "N/A"}</p>
              </div>
            </div>
            {venue.description && (
              <div className="mt-6">
                <p className="text-gray-400 text-sm">Description</p>
                <p className="text-white">{venue.description}</p>
              </div>
            )}
          </div>
        )}

        {/* DJ Access Management (NEW DJ USER SYSTEM) */}
        {djMode && venue && (
          <div className="mb-12">
            <DJAccessManagement venueId={venue._id} venueName={venue.name} />
          </div>
        )}

        {/* Recent Requests */}
        {/* <div className="bg-white/5 backdrop-blur-md border border-purple-500/20 rounded-xl p-8">
          <h2 className="text-xl font-bold mb-6">Song Requests</h2>
          {requests.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No song requests yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-purple-500/20">
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Song</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Artist</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Requester</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Price</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Actions</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(request => (
                    <tr key={request._id} className="border-b border-purple-500/10 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-semibold">{request.songTitle || request.title}</td>
                      <td className="py-3 px-4">{request.artistName || request.artist}</td>
                      <td className="py-3 px-4 text-sm">{request.userName}</td>
                      <td className="py-3 px-4">${(request.price || 0).toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {(request.status === "created" || request.status === "authorized") && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApproveRequest(request._id)}
                              disabled={processingId === request._id}
                              className="px-3 py-1 bg-green-600/40 hover:bg-green-600/60 text-green-300 rounded text-xs font-semibold disabled:opacity-50 transition-colors"
                            >
                              {processingId === request._id ? "..." : "Accept"}
                            </button>
                            <button
                              onClick={() => handleRejectRequest(request._id)}
                              disabled={processingId === request._id}
                              className="px-3 py-1 bg-red-600/40 hover:bg-red-600/60 text-red-300 rounded text-xs font-semibold disabled:opacity-50 transition-colors"
                            >
                              {processingId === request._id ? "..." : "Reject"}
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-sm">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div> */}
      </div>
    </div>
  );
}
