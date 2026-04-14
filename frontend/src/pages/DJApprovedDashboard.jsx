import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Check, X, Loader } from "lucide-react";
import logo from "../assets/Mixmind.jpeg";

/**
 * DJ Dashboard for approved DJ user accounts
 * Shows song requests for their approved venue
 * Uses DJ user account token (djToken) instead of venue password token
 */
export default function DJApprovedDashboard() {
  const { venueId } = useParams();
  const navigate = useNavigate();
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [venueName, setVenueName] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const djToken = localStorage.getItem("djToken");
  const djName = localStorage.getItem("djName");

  useEffect(() => {
    if (!djToken) {
      setError("DJ authentication required. Please log in.");
      navigate("/dj/auth");
      return;
    }

    fetchApprovedVenueRequests();
    // Refresh every 30 seconds
    const interval = setInterval(fetchApprovedVenueRequests, 30000);
    return () => clearInterval(interval);
  }, [venueId, djToken]);

  const fetchApprovedVenueRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${djToken}`
      };

      // Get venue details and requests
      // Using the venue ID passed in the URL
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/dj/requests/${venueId}`,
        { headers }
      );

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle specific errors
        if (response.status === 403) {
          throw new Error("You don't have access to this venue. Request approval first.");
        } else if (response.status === 401) {
          throw new Error("Session expired. Please log in again.");
        } else {
          throw new Error(errorData.error || "Failed to load requests");
        }
      }

      const requestsData = await response.json();
      console.log("✅ DJ Dashboard loaded requests:", requestsData);
      setRequests(Array.isArray(requestsData) ? requestsData : []);
      
      // Set venue name if available from first request
      if (requestsData.length > 0 && requestsData[0].venueId?.name) {
        setVenueName(requestsData[0].venueId.name);
      }
    } catch (err) {
      const errorMsg = err.message || "Failed to load song requests";
      setError(errorMsg);
      console.error("Error fetching requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId, requestTitle) => {
    setProcessingId(requestId);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/dj/requests/${requestId}/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${djToken}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to accept request");
      }

      console.log(`✅ Request accepted: ${requestTitle}`);
      setRequests(prev => prev.filter(r => r._id !== requestId));
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId, requestTitle) => {
    setProcessingId(requestId);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/dj/requests/${requestId}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${djToken}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reject request");
      }

      console.log(`✅ Request rejected: ${requestTitle}`);
      setRequests(prev => prev.filter(r => r._id !== requestId));
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("djToken");
    localStorage.removeItem("djId");
    localStorage.removeItem("djEmail");
    localStorage.removeItem("djName");
    navigate("/dj/auth");
  };

  return (
    <div className="min-h-screen bg-[#07070B] text-white p-4 md:p-8">
      <style>{`
        :root {
          --bg-deep: #07070B;
          --surface: #121222;
          --border: rgba(255,255,255,0.08);
          --text-primary: #FFFFFF;
          --text-secondary: rgba(255,255,255,0.72);
          --neon-purple: #A855F7;
          --electric-violet: #7C3AED;
          --revenue-green: #22E3A1;
          --error-red: #EF4444;
        }

        .glass-card {
          background: linear-gradient(135deg, rgba(18,18,34,0.92) 0%, rgba(18,18,34,0.55) 100%);
          backdrop-filter: blur(24px);
          border: 1px solid var(--border);
        }

        .request-card {
          background: linear-gradient(135deg, rgba(18,18,34,0.92) 0%, rgba(18,18,34,0.55) 100%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
          transition: all 0.2s;
        }

        .request-card:hover {
          border-color: rgba(168,85,247,0.3);
          box-shadow: 0 0 20px rgba(168,85,247,0.1);
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--neon-purple), var(--electric-violet));
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          color: white;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(168,85,247,0.3);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-danger {
          background: rgba(239,68,68,0.2);
          border: 1px solid rgba(239,68,68,0.4);
          color: var(--error-red);
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .btn-danger:hover:not(:disabled) {
          background: rgba(239,68,68,0.3);
        }
      `}</style>

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-15 h-15 rounded-lg glow-purple" 
                                    style={{ background: "linear-gradient(135deg, #A855F7, #7C3AED)" }}>
                                <img src={logo} alt="MixMind Logo" className="w-13 h-13" />
                                
                               </div>
                               
            <h1 className="text-2xl font-bold">DJ Dashboard</h1>
          </div>
          
          <button
            onClick={handleLogout}
            className="px-6 py-2 rounded-lg border border-gray-600 hover:border-gray-400 transition-colors"
          >
            Logout
          </button>
        </div>
                  <div className="mt-2">
          <p style={{ color: "rgba(255,255,255,0.72)" }}>
              {venueName ? `${venueName} • ${djName}` : `Welcome, ${djName}`}
            </p>
            </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-6xl mx-auto mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          ⚠️ {error}
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto">
        {loading ? (
          <div className="text-center py-12">
            <Loader size={32} className="animate-spin mx-auto mb-4" />
            <p>Loading song requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>📭</div>
            <h2 className="text-2xl font-bold mb-2">No Pending Requests</h2>
            <p style={{ color: "rgba(255,255,255,0.72)" }}>
              All caught up! No song requests to review right now.
            </p>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold mb-4">
              Pending Requests ({requests.length})
            </h2>
            {requests.map(request => (
              <div key={request._id} className="request-card">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{request.title}</h3>
                    <p style={{ color: "rgba(255,255,255,0.72)" }}>
                      {request.artist}
                    </p>
                    {request.userId?.name && (
                      <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px" }}>
                        Requested by: {request.userId.name}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn-primary"
                      onClick={() => handleAccept(request._id, request.title)}
                      disabled={processingId === request._id}
                    >
                      {processingId === request._id ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          Accept
                        </>
                      )}
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => handleReject(request._id, request.title)}
                      disabled={processingId === request._id}
                    >
                      {processingId === request._id ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                        </>
                      ) : (
                        <>
                          <X size={16} />
                          Reject
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
