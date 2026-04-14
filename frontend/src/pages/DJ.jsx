import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./DJ.css";
import logo from "../assets/Mixmind.jpeg";

export default function DJ() {
  const navigate = useNavigate();
  const { venueId } = useParams();
  
  const [djToken, setDJToken] = useState(null);
  const [venue, setVenue] = useState(null);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
    totalRevenue: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingRequestId, setRejectingRequestId] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(true);
  const [djPassword, setDjPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Check if already logged in
  useEffect(() => {
    const token = localStorage.getItem("djToken");
    const storedVenueId = localStorage.getItem("djVenueId");
    const storedVenueName = localStorage.getItem("djVenueName");
    
    if (token && storedVenueId) {
      setDJToken(token);
      setVenue(storedVenueName || "DJ Mode");
      setShowLoginModal(false);
      fetchDJData(token, storedVenueId);
    } else {
      setLoading(false);
    }
  }, []);
  
  // Refresh requests every 10 seconds
  useEffect(() => {
    if (djToken && !showLoginModal) {
      const interval = setInterval(() => {
        fetchDJData(djToken, localStorage.getItem("djVenueId"));
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [djToken, showLoginModal]);
  
  const handleDJLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setError("");
    
    try {
      if (!venueId) {
        throw new Error("Venue ID is missing");
      }

      if (!djPassword) {
        throw new Error("DJ password is required");
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/dj/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId, djPassword })
      });
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid DJ password");
      }
      
      // Store DJ token and venue info
      localStorage.setItem("djToken", data.djToken);
      localStorage.setItem("djVenueId", data.venueId);
      localStorage.setItem("djVenueName", data.venueName);
      
      setDJToken(data.djToken);
      setVenue(data.venueName);
      setShowLoginModal(false);
      setDjPassword("");
      
      // Fetch initial data
      fetchDJData(data.djToken, data.venueId);
    } catch (err) {
      setError(err.message || "Failed to login as DJ");
    } finally {
      setLoginLoading(false);
    }
  };
  
  const fetchDJData = async (token, vId) => {
    try {
      setLoading(true);
      setError("");
      
      console.log(`📡 [DJ Panel] Fetching data for venue: ${vId}`);
      
      // Include DJ token in authorization header
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      };
      
      const [requestsRes, statsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/dj/requests/${vId}`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/api/dj/stats/${vId}`, { headers })
      ]);
      
      if (requestsRes.ok) {
        const requestsData = await requestsRes.json();
        console.log(`✅ DJ Panel received ${requestsData.length} requests`, requestsData);
        setRequests(requestsData);
      } else if (requestsRes.status === 401) {
        console.error(`❌ Unauthorized - DJ token expired`);
        setError("DJ session expired. Please login again.");
        handleLogout();
      } else {
        const errorData = await requestsRes.json();
        console.error(`❌ Requests fetch failed: ${requestsRes.status}`, errorData);
        setError(errorData.error || `Failed to fetch requests (${requestsRes.status})`);
      }
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        console.log(`✅ Stats received:`, statsData);
        setStats(statsData);
      }
    } catch (err) {
      console.error("❌ Fetch DJ data error:", err);
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };
  
  const handleAcceptRequest = async (requestId) => {
    const token = localStorage.getItem("djToken");
    const vId = localStorage.getItem("djVenueId");
    
    setProcessingId(requestId);
    setError("");
    setSuccessMsg("");
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/dj/requests/${requestId}/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({})
        }
      );
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to accept request");
      }
      
      setSuccessMsg("✅ Request accepted!");
      fetchDJData(token, vId);
      
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to accept request");
    } finally {
      setProcessingId(null);
    }
  };
  
  const handleRejectRequest = async (requestId) => {
    const token = localStorage.getItem("djToken");
    const vId = localStorage.getItem("djVenueId");
    
    setProcessingId(requestId);
    setError("");
    setSuccessMsg("");
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/dj/requests/${requestId}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ 
            reason: rejectReason || "Rejected by DJ" 
          })
        }
      );
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reject request");
      }
      
      setSuccessMsg("❌ Request rejected");
      setRejectReason("");
      setRejectingRequestId(null);
      fetchDJData(token, vId);
      
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to reject request");
    } finally {
      setProcessingId(null);
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem("djToken");
    localStorage.removeItem("djVenueId");
    localStorage.removeItem("djVenueName");
    navigate("/");
  };
  
  // DJ Login Modal
  if (showLoginModal) {
    return (
      <div className="dj-login-container">
        <div className="dj-login-modal">
          <div className="dj-login-header">
           <div className="inline-flex items-center justify-center w-18 h-18 rounded-lg mb-4 glow-purple" 
                          style={{ background: "linear-gradient(135deg, #A855F7, #7C3AED)" }}>
                      <img src={logo} alt="MixMind Logo" className="w-17 h-17" />
                     </div>
            <h1>DJ Mode</h1>
            <p>Enter your DJ password to manage requests</p>
          </div>
          
          <form onSubmit={handleDJLogin} className="dj-login-form">
            <div className="form-group">
              <label htmlFor="djPassword">DJ Password</label>
              <input
                id="djPassword"
                type="password"
                value={djPassword}
                onChange={(e) => setDjPassword(e.target.value)}
                placeholder="Enter your DJ password"
                required
              />
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <button 
              type="submit" 
              className="btn-login"
              disabled={loginLoading}
            >
              {loginLoading ? "Logging in..." : "Enter DJ Mode"}
            </button>
          </form>
          
          <button 
            onClick={() => navigate("/")}
            className="btn-back"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }
  
  // DJ Dashboard
  return (
    <div className="dj-dashboard">
      {/* Header */}
      <header className="dj-header">
        <div className="dj-header-content">
          <div className="dj-title">
            <div className="inline-flex items-center justify-center w-18 h-18 rounded-lg mb-4 glow-purple" 
                           style={{ background: "linear-gradient(135deg, #A855F7, #7C3AED)" }}>
                       <img src={logo} alt="MixMind Logo" className="w-17 h-17" />
                      </div>
            <h1> DJ Control Panel</h1>
            <p>{venue || "DJ Mode"}</p>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </div>
      </header>
      
      {/* Stats Grid */}
      <section className="dj-stats">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending Requests</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.accepted}</div>
            <div className="stat-label">Accepted</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <div className="stat-value">{stats.rejected}</div>
            <div className="stat-label">Rejected</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-value">${stats.totalRevenue.toFixed(2)}</div>
            <div className="stat-label">Total Revenue</div>
          </div>
        </div>
      </section>
      
      {/* Messages */}
      {successMsg && <div className="success-banner">{successMsg}</div>}
      {error && <div className="error-banner">{error}</div>}
      
      {/* Main Content */}
      <section className="dj-main">
        <div className="requests-container">
          <h2 className="section-title">🎵 Pending Requests</h2>
          
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎉</div>
              <h3>No Pending Requests</h3>
              <p>All caught up! Waiting for new song requests...</p>
            </div>
          ) : (
            <div className="requests-grid">
              {requests.map((request) => (
                <div key={request._id} className="request-card">
                  <div className="request-header">
                    <div className="request-info">
                      <h3 className="song-title">{request.title || request.songTitle}</h3>
                      <p className="artist-name">{request.artist || request.artistName}</p>
                    </div>
                    <div className="request-requester">
                      <span className="user-name">{request.userName}</span>
                      <span className="user-email">{request.userId?.email}</span>
                    </div>
                  </div>
                  
                  <div className="request-details">
                    <div className="detail-item">
                      <span className="detail-label">Price:</span>
                      <span className="detail-value">${request.price}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status:</span>
                      <span className={`status-badge status-${request.status}`}>
                        {request.status}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Requested:</span>
                      <span className="detail-value">
                        {new Date(request.createdAt).toLocaleDateString()} {new Date(request.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="request-actions">
                    <button
                      onClick={() => handleAcceptRequest(request._id)}
                      disabled={processingId === request._id}
                      className="btn-accept"
                    >
                      {processingId === request._id ? "Processing..." : "✅ Accept"}
                    </button>
                    
                    {rejectingRequestId === request._id ? (
                      <div className="reject-modal">
                        <input
                          type="text"
                          placeholder="Reason for rejection (optional)"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="reject-input"
                        />
                        <button
                          onClick={() => handleRejectRequest(request._id)}
                          disabled={processingId === request._id}
                          className="btn-confirm-reject"
                        >
                          {processingId === request._id ? "Processing..." : "Confirm Reject"}
                        </button>
                        <button
                          onClick={() => {
                            setRejectingRequestId(null);
                            setRejectReason("");
                          }}
                          className="btn-cancel-reject"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setRejectingRequestId(request._id)}
                        className="btn-reject"
                      >
                        ❌ Reject
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
