import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Check, X, Loader, Bell, BellOff } from "lucide-react";
import logo from "../assets/Mixmind.jpeg";
import {
  isPushSupported,
  fetchPushStatus,
  subscribeToPush,
  unsubscribeFromPush,
  setPushAvailability
} from "../services/djPushService";
import {
  getDjSession,
  clearDjSession,
  setDjLastVenueId
} from "../services/djAuthStorage";

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
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
const [confirmAction, setConfirmAction] = useState(null);
const [selectedRequest, setSelectedRequest] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationOnline, setNotificationOnline] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushMessage, setPushMessage] = useState("");
  const [djName, setDjName] = useState("");

  const redirectToDjAuth = () => {
    clearDjSession();
    navigate("/dj/auth", { replace: true });
  };

  useEffect(() => {
    const session = getDjSession();
    if (!session.djToken || !session.djId) {
      redirectToDjAuth();
      return;
    }

    setDjName(session.djName || "");

    if (venueId) {
      setDjLastVenueId(venueId);
    }

    fetchApprovedVenueRequests();
    loadPushStatus();
    const interval = setInterval(fetchApprovedVenueRequests, 30000);
    return () => clearInterval(interval);
  }, [venueId]);

  const loadPushStatus = async () => {
    const token = getDjSession().djToken;
    if (!token || !venueId || !isPushSupported()) return;
    const status = await fetchPushStatus(venueId, token);
    if (status) {
      setNotificationsEnabled(!!status.hasPushSubscription);
      setNotificationOnline(!!status.notificationOnline);
    }
  };

  const handleEnableNotifications = async () => {
    if (!isPushSupported()) {
      setPushMessage("Push notifications are not supported in this browser.");
      return;
    }
    setPushLoading(true);
    setPushMessage("");
    const token = getDjSession().djToken;
    if (!token) {
      redirectToDjAuth();
      return;
    }

    try {
      await subscribeToPush(venueId, token);
      setNotificationsEnabled(true);
      setNotificationOnline(false);
      setPushMessage(
        "Notifications enabled, but you are offline for this venue. Turn Online to receive alerts."
      );
    } catch (err) {
      setPushMessage(err.message || "Failed to enable notifications");
    } finally {
      setPushLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setPushLoading(true);
    setPushMessage("");
    const token = getDjSession().djToken;
    if (!token) {
      redirectToDjAuth();
      return;
    }

    try {
      if (notificationOnline) {
        await setPushAvailability(venueId, false, token);
      }
      await unsubscribeFromPush(venueId, token);
      setNotificationsEnabled(false);
      setNotificationOnline(false);
      setPushMessage("");
    } catch (err) {
      setPushMessage(err.message || "Failed to disable notifications");
    } finally {
      setPushLoading(false);
    }
  };

  const handleSetOnline = async (online) => {
    if (!notificationsEnabled) {
      setPushMessage("Enable notifications first.");
      return;
    }
    setPushLoading(true);
    setPushMessage("");
    const token = getDjSession().djToken;
    if (!token) {
      redirectToDjAuth();
      return;
    }

    try {
      const result = await setPushAvailability(venueId, online, token);
      setNotificationOnline(!!result.notificationOnline);
      setPushMessage(
        result.notificationOnline
          ? "You'll receive new request notifications."
          : "Notifications enabled, but you are offline for this venue."
      );
    } catch (err) {
      setPushMessage(err.message || "Failed to update availability");
    } finally {
      setPushLoading(false);
    }
  };

  const fetchApprovedVenueRequests = async () => {
    const token = getDjSession().djToken;
    if (!token) {
      redirectToDjAuth();
      return;
    }

    try {
      setLoading(true);
      setError("");

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      };

      // Get venue details and requests
      // Using the venue ID passed in the URL
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/dj/requests/${venueId}`,
        { headers }
      );

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle specific errors
        if (response.status === 403) {
          throw new Error("You don't have access to this venue. Request approval first.");
        } else if (response.status === 401) {
          redirectToDjAuth();
          return;
        } else {
          throw new Error(errorData.error || "Failed to load requests");
        }
      }

      const requestsData = await response.json();
console.log("✅ DJ Dashboard loaded requests:", requestsData);

if (Array.isArray(requestsData)) {
  requestsData.forEach((request) => {
    console.log("REQUEST DEBUG:", {
      id: request._id,
      title: request.title,
      priorityRequest: request.priorityRequest,
      priorityType: request.priorityType,
      price: request.price,
      status: request.status
    });
  });
}

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
  setError("");

  const previousRequests = requests;
  setRequests(prev => prev.filter(r => r._id !== requestId));

  const token = getDjSession().djToken;
  if (!token) {
    redirectToDjAuth();
    return;
  }

  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/dj/requests/${requestId}/accept`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (response.status === 401) {
      redirectToDjAuth();
      return;
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to accept request");
    }

    console.log(`✅ Request accepted: ${requestTitle}`);
  } catch (err) {
    setRequests(previousRequests);
    setError(err.message);
  } finally {
    setProcessingId(null);
  }
};

  const handleReject = async (requestId, requestTitle) => {
  setProcessingId(requestId);
  setError("");

  const previousRequests = requests;
  setRequests(prev => prev.filter(r => r._id !== requestId));

  const token = getDjSession().djToken;
  if (!token) {
    redirectToDjAuth();
    return;
  }

  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/dj/requests/${requestId}/reject`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (response.status === 401) {
      redirectToDjAuth();
      return;
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to reject request");
    }

    console.log(`✅ Request rejected: ${requestTitle}`);
  } catch (err) {
    setRequests(previousRequests);
    setError(err.message);
  } finally {
    setProcessingId(null);
  }
};

  const handleLogout = () => {
    clearDjSession();
    navigate("/dj/auth", { replace: true });
  };

  const handleConfirmAction = async () => {
  if (!selectedRequest || !confirmAction) return;

  setConfirmModalOpen(false);

  if (confirmAction === "accept") {
    await handleAccept(selectedRequest._id, selectedRequest.title);
  } else {
    await handleReject(selectedRequest._id, selectedRequest.title);
  }

  setSelectedRequest(null);
  setConfirmAction(null);
};

const handleCancelConfirm = () => {
  setConfirmModalOpen(false);
  setSelectedRequest(null);
  setConfirmAction(null);
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/dj/select-venue")}
              className="px-4 py-2 rounded-lg border border-purple-500/40 hover:border-purple-400 transition-colors"
            >
              Back to Venues
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-2 rounded-lg border border-gray-600 hover:border-gray-400 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
                  <div className="mt-2">
          <p style={{ color: "rgba(255,255,255,0.72)" }}>
              {venueName ? `${venueName} • ${djName}` : `Welcome, ${djName}`}
            </p>
            </div>
      </div>

      {/* Push notifications */}
      {isPushSupported() && (
        <div className="max-w-6xl mx-auto mb-6">
          <div
            className="glass-card rounded-2xl p-4"
            style={{
              background: "linear-gradient(135deg, rgba(18,18,34,0.92) 0%, rgba(18,18,34,0.55) 100%)",
              border: "1px solid rgba(255,255,255,0.08)"
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold flex items-center gap-2">
                  <Bell size={18} />
                  Request notifications
                </p>
                <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.65)" }}>
                  {!notificationsEnabled &&
                    "Get browser alerts for new song requests at this venue."}
                  {notificationsEnabled && notificationOnline &&
                    "You'll receive new request notifications."}
                  {notificationsEnabled && !notificationOnline &&
                    "Notifications enabled, but you are offline for this venue."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!notificationsEnabled ? (
                  <button
                    type="button"
                    onClick={handleEnableNotifications}
                    disabled={pushLoading}
                    className="btn-primary"
                  >
                    {pushLoading ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        Enabling...
                      </>
                    ) : (
                      <>
                        <Bell size={16} />
                        Enable notifications
                      </>
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSetOnline(true)}
                      disabled={pushLoading || notificationOnline}
                      className="btn-primary"
                      style={{
                        opacity: notificationOnline ? 0.6 : 1
                      }}
                    >
                      Online for this venue
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetOnline(false)}
                      disabled={pushLoading || !notificationOnline}
                      className="px-4 py-2 rounded-lg border border-gray-600 hover:border-gray-400 transition-colors flex items-center gap-2"
                      style={{
                        opacity: !notificationOnline ? 0.6 : 1
                      }}
                    >
                      Offline
                    </button>
                    <button
                      type="button"
                      onClick={handleDisableNotifications}
                      disabled={pushLoading}
                      className="btn-danger"
                    >
                      {pushLoading ? (
                        <Loader size={16} className="animate-spin" />
                      ) : (
                        <>
                          <BellOff size={16} />
                          Disable
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
            {pushMessage && (
              <p className="text-sm mt-3" style={{ color: "rgba(255,255,255,0.72)" }}>
                {pushMessage}
              </p>
            )}
          </div>
        </div>
      )}

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
            {[...requests]
  .sort((a, b) => (b.priorityRequest ? 1 : 0) - (a.priorityRequest ? 1 : 0))
  .map(request => (
              <div key={request._id} className="request-card">
                <div className="flex justify-between items-start mb-3">
  <div className="flex-1">
    <div className="flex items-center gap-2 flex-wrap">
      <h3 className="text-xl font-bold">{request.title}</h3>

      {request.priorityRequest && (
        <span
          style={{
            background: "rgba(34,227,161,0.18)",
            color: "#22E3A1",
            border: "1px solid rgba(34,227,161,0.35)",
            fontSize: "11px",
            fontWeight: "700",
            padding: "4px 8px",
            borderRadius: "999px",
            letterSpacing: "0.4px"
          }}
        >
          🔥 PRIORITY
        </span>
      )}
    </div>

    <p style={{ color: "rgba(255,255,255,0.72)" }}>
      {request.artist}
    </p>

    {request.userId?.name && (
      <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px" }}>
        Requested by: {request.userId.name}
      </p>
    )}

    <p style={{ color: "rgba(255,255,255,0.72)", fontSize: "14px", marginTop: "6px" }}>
      Price: £{request.price} • Type: {request.priorityRequest ? "Priority" : "Normal"}
    </p>
  </div>

  <div className="flex gap-2">
    <button
  className="btn-primary"
  onClick={() => {
    setSelectedRequest(request);
    setConfirmAction("accept");
    setConfirmModalOpen(true);
  }}
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
  onClick={() => {
    setSelectedRequest(request);
    setConfirmAction("reject");
    setConfirmModalOpen(true);
  }}
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

      {confirmModalOpen && selectedRequest && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000
    }}
  >
    <div
      style={{
        background: "#121222",
        padding: "24px",
        borderRadius: "16px",
        width: "100%",
        maxWidth: "380px",
        border: "1px solid rgba(255,255,255,0.08)"
      }}
    >
      {/* TITLE */}
      <h3 style={{ fontSize: "20px", fontWeight: "700" }}>
        {confirmAction === "accept"
          ? "Add this to your set?"
          : "Are you sure?"}
      </h3>

      {/* SUBTEXT */}
      <p
        style={{
          marginTop: "6px",
          color: "rgba(255,255,255,0.6)",
          fontSize: "14px"
        }}
      >
        {confirmAction === "accept"
          ? "Keeps the crowd engaged 🎶"
          : "You might skip a good vibe"}
      </p>

      {/* SONG INFO */}
      <div style={{ marginTop: "14px" }}>
        <p style={{ fontWeight: "600" }}>{selectedRequest.title}</p>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px" }}>
          {selectedRequest.artist}
        </p>
      </div>

      {/* BUTTONS */}
      <div
        style={{
          marginTop: "20px",
          display: "flex",
          gap: "10px",
          justifyContent: "flex-end"
        }}
      >
        {/* LEFT BUTTON */}
<button
  onClick={
    confirmAction === "accept"
      ? handleCancelConfirm
      : handleConfirmAction
  }
  style={{
    padding: "8px 14px",
    borderRadius: "8px",
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "white",
    cursor: "pointer"
  }}
>
  Cancel
</button>

        {/* RIGHT BUTTON */}
<button
  onClick={
    confirmAction === "accept"
      ? handleConfirmAction
      : handleCancelConfirm
  }
  style={{
    padding: "8px 14px",
    borderRadius: "8px",
    background:
      confirmAction === "accept"
        ? "linear-gradient(135deg, #A855F7, #7C3AED)"
        : "#22E3A1",
    color: confirmAction === "accept" ? "white" : "black",
    fontWeight: "600",
    border: "none",
    cursor: "pointer"
  }}
>
  Confirm
</button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
