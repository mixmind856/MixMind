import { useState, useEffect } from "react";
import { Check, X, Trash2, Loader, AlertCircle, CheckCircle } from "lucide-react";

export default function DJAccessManagement({ venueId, venueName }) {
  const [accessRequests, setAccessRequests] = useState({
    pending: [],
    approved: [],
    rejected: [],
    revoked: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [activeTab, setActiveTab] = useState("pending");

  const token = localStorage.getItem("venueToken");

  useEffect(() => {
    if (!token) {
      setError("⚠️ Venue token not found. Please log in again.");
      setLoading(false);
      return;
    }
    if (!venueId) {
      setError("⚠️ Venue ID is missing.");
      setLoading(false);
      return;
    }
    
    fetchDJAccessRequests();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDJAccessRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDJAccessRequests = async () => {
    try {
      setLoading(true);
      setError("");

      console.log(`📡 Fetching DJ access requests for venue: ${venueId}`);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/dj/venue/${venueId}/access-requests`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log(`Response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error(`❌ API Error (${response.status}):`, errorData);
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ DJ access requests loaded:`, data);
      
      // Filter out requests with null/missing djId
      const filteredData = {
        pending: (data.pending || []).filter(r => r.djId),
        approved: (data.approved || []).filter(r => r.djId),
        rejected: (data.rejected || []).filter(r => r.djId),
        revoked: (data.revoked || []).filter(r => r.djId),
        all: (data.all || []).filter(r => r.djId)
      };
      
      setAccessRequests(filteredData);
    } catch (err) {
      const errorMsg = err.message || "Failed to load DJ requests";
      setError(errorMsg);
      console.error("Error fetching DJ access requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (accessRequestId, djName) => {
    setProcessingId(accessRequestId);
    setError("");
    setSuccessMsg("");

    try {
      console.log(`📤 Approving DJ access: ${accessRequestId}`);
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/dj/venue/${accessRequestId}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log(`Response status: ${response.status}`);

      const data = await response.json();
      console.log(`Response data:`, data);

      if (!response.ok) {
        throw new Error(data.error || `API Error: ${response.status}`);
      }

      setSuccessMsg(`✅ ${djName} has been approved!`);
      fetchDJAccessRequests();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to approve DJ");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (accessRequestId, djName) => {
    setProcessingId(accessRequestId);
    setError("");
    setSuccessMsg("");

    try {
      console.log(`📤 Rejecting DJ access: ${accessRequestId}`);
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/dj/venue/${accessRequestId}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            reason: rejectReason || "Request rejected by venue"
          })
        }
      );

      console.log(`Response status: ${response.status}`);

      const data = await response.json();
      console.log(`Response data:`, data);

      if (!response.ok) {
        throw new Error(data.error || `API Error: ${response.status}`);
      }

      setSuccessMsg(`❌ ${djName}'s request has been rejected`);
      setRejectingId(null);
      setRejectReason("");
      fetchDJAccessRequests();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to reject DJ");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRevoke = async (accessRequestId, djName) => {
    if (!window.confirm(`Remove ${djName}'s access to your venue?`)) {
      return;
    }

    setProcessingId(accessRequestId);
    setError("");
    setSuccessMsg("");

    try {
      console.log(`📤 Revoking DJ access: ${accessRequestId}`);
      
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/dj/venue/${accessRequestId}/revoke`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log(`Response status: ${response.status}`);

      const data = await response.json();
      console.log(`Response data:`, data);

      if (!response.ok) {
        throw new Error(data.error || `API Error: ${response.status}`);
      }

      setSuccessMsg(`🔒 ${djName}'s access has been revoked`);
      fetchDJAccessRequests();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to revoke access");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="dj-management-container">
        <div className="loading-state">
          <Loader className="spin" size={32} />
          <p>Loading DJ requests...</p>
        </div>
      </div>
    );
  }

  const pendingCount = accessRequests.pending?.length || 0;
  const approvedCount = accessRequests.approved?.length || 0;
  const rejectedCount = accessRequests.rejected?.length || 0;
  const revokedCount = accessRequests.revoked?.length || 0;

  return (
    <div className="dj-management-container">
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
          --danger: #EF4444;
          --warning: #F59E0B;
        }

        .dj-management-container {
          width: 100%;
          background: var(--bg-deep);
          color: var(--text-primary);
          padding: 24px;
          border-radius: 16px;
        }

        .dj-header {
          margin-bottom: 24px;
        }

        .dj-header h2 {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .dj-header p {
          color: var(--text-secondary);
          font-size: 14px;
        }

        .dj-tabs {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border);
        }

        .tab-button {
          padding: 12px 16px;
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          border-bottom: 3px solid transparent;
          transition: all 0.3s ease;
          position: relative;
        }

        .tab-button:hover {
          color: var(--neon-purple);
        }

        .tab-button.active {
          color: var(--neon-purple);
          border-bottom-color: var(--neon-purple);
        }

        .tab-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          background: var(--neon-purple);
          color: white;
          border-radius: 50%;
          font-size: 11px;
          font-weight: bold;
          margin-left: 6px;
        }

        .messages {
          margin-bottom: 20px;
        }

        .error-alert {
          padding: 12px 16px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #FCA5A5;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .error-alert svg {
          flex-shrink: 0;
        }

        .success-alert {
          padding: 12px 16px;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 8px;
          color: #86EFAC;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .success-alert svg {
          flex-shrink: 0;
        }

        .empty-state {
          text-align: center;
          padding: 40px 24px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border);
          border-radius: 12px;
        }

        .empty-state-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .empty-state h3 {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 6px;
        }

        .empty-state p {
          color: var(--text-secondary);
          font-size: 14px;
        }

        .requests-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .dj-request-card {
          background: linear-gradient(135deg, rgba(18,18,34,0.92) 0%, rgba(18,18,34,0.55) 100%);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 16px;
          transition: all 0.3s ease;
        }

        .dj-request-card:hover {
          border-color: rgba(168, 85, 247, 0.3);
          background: linear-gradient(135deg, rgba(18,18,34,0.95) 0%, rgba(18,18,34,0.65) 100%);
        }

        .dj-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .dj-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .dj-email {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .dj-genres {
          font-size: 12px;
          color: var(--text-secondary);
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 4px;
        }

        .genre-badge {
          background: rgba(168, 85, 247, 0.15);
          color: #A855F7;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
        }

        .dj-request-message {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 8px;
          padding: 8px;
          background: rgba(0, 0, 0, 0.3);
          border-left: 2px solid var(--neon-purple);
          border-radius: 4px;
        }

        .dj-meta {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 6px;
        }

        .dj-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .action-button {
          padding: 8px 12px;
          border: none;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-width: 100px;
        }

        .btn-approve {
          background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%);
          color: white;
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
        }

        .btn-approve:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 0 30px rgba(34, 197, 94, 0.5);
        }

        .btn-reject {
          background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
          color: white;
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
        }

        .btn-reject:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 0 30px rgba(239, 68, 68, 0.5);
        }

        .btn-revoke {
          background: rgba(239, 68, 68, 0.15);
          color: #FCA5A5;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .btn-revoke:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.25);
        }

        .action-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .reject-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .reject-modal {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          max-width: 400px;
          width: 90%;
        }

        .reject-modal h3 {
          font-size: 16px;
          margin-bottom: 12px;
        }

        .reject-modal textarea {
          width: 100%;
          min-height: 80px;
          padding: 8px;
          background: rgba(168, 85, 247, 0.1);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-primary);
          font-family: inherit;
          resize: vertical;
          margin-bottom: 12px;
        }

        .reject-modal textarea::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .reject-modal textarea:focus {
          outline: none;
          border-color: var(--neon-purple);
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.2);
        }

        .reject-modal-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 40px 24px;
          color: var(--text-secondary);
        }

        .spin {
          animation: spin 2s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .dj-request-card {
            grid-template-columns: 1fr;
          }

          .dj-actions {
            grid-template-columns: 1fr 1fr;
            flex-direction: row;
          }

          .dj-tabs {
            overflow-x: auto;
          }
        }
      `}</style>

      <div className="dj-header">
        <h2>👥 DJ Access Management</h2>
        <p>{venueName || "Your Venue"} - Manage DJ access requests</p>
      </div>

      {/* Messages */}
      <div className="messages">
        {error && (
          <div className="error-alert">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
        {successMsg && (
          <div className="success-alert">
            <CheckCircle size={16} />
            {successMsg}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="dj-tabs">
        <button
          className={`tab-button ${activeTab === "pending" ? "active" : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          Pending Requests
          {pendingCount > 0 && (
            <span className="tab-badge">{pendingCount}</span>
          )}
        </button>
        <button
          className={`tab-button ${activeTab === "approved" ? "active" : ""}`}
          onClick={() => setActiveTab("approved")}
        >
          Approved DJs
          {approvedCount > 0 && (
            <span className="tab-badge">{approvedCount}</span>
          )}
        </button>
        <button
          className={`tab-button ${activeTab === "rejected" ? "active" : ""}`}
          onClick={() => setActiveTab("rejected")}
        >
          Rejected
          {rejectedCount > 0 && (
            <span className="tab-badge">{rejectedCount}</span>
          )}
        </button>
        <button
          className={`tab-button ${activeTab === "revoked" ? "active" : ""}`}
          onClick={() => setActiveTab("revoked")}
        >
          Revoked
          {revokedCount > 0 && (
            <span className="tab-badge">{revokedCount}</span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="requests-list">
        {activeTab === "pending" && (
          <>
            {pendingCount === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <h3>No Pending Requests</h3>
                <p>DJs will request access here when they select your venue</p>
              </div>
            ) : (
              accessRequests.pending.map((request) => {
                // Skip if djId is null
                if (!request.djId) return null;
                
                return (
                <div key={request._id} className="dj-request-card">
                  <div className="dj-info">
                    <div className="dj-name">🎧 {request.djId.name}</div>
                    <div className="dj-email">📧 {request.djId.email}</div>
                    {request.djId.genres && request.djId.genres.length > 0 && (
                      <div className="dj-genres">
                        {request.djId.genres.map((genre) => (
                          <span key={genre} className="genre-badge">
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}
                    {request.requestMessage && (
                      <div className="dj-request-message">
                        💬 {request.requestMessage}
                      </div>
                    )}
                    <div className="dj-meta">
                      Requested on{" "}
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="dj-actions">
                    <button
                      className="action-button btn-approve"
                      onClick={() =>
                        handleApprove(request._id, request.djId.name)
                      }
                      disabled={processingId === request._id}
                    >
                      {processingId === request._id ? (
                        <>
                          <Loader size={14} className="spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          Approve
                        </>
                      )}
                    </button>
                    <button
                      className="action-button btn-reject"
                      onClick={() => setRejectingId(request._id)}
                      disabled={processingId === request._id}
                    >
                      <X size={14} />
                      Reject
                    </button>
                  </div>

                  {rejectingId === request._id && (
                    <div className="reject-modal-overlay">
                      <div className="reject-modal">
                        <h3>Reject Request?</h3>
                        <textarea
                          placeholder="Reason for rejection (optional)"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                        />
                        <div className="reject-modal-actions">
                          <button
                            className="action-button btn-approve"
                            onClick={() =>
                              handleReject(
                                request._id,
                                request.djId.name
                              )
                            }
                            disabled={processingId === request._id}
                          >
                            {processingId === request._id
                              ? "Processing..."
                              : "Reject"}
                          </button>
                          <button
                            className="action-button btn-reject"
                            onClick={() => {
                              setRejectingId(null);
                              setRejectReason("");
                            }}
                            disabled={processingId === request._id}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                );
              })
            )}
          </>
        )}

        {activeTab === "approved" && (
          <>
            {approvedCount === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">✨</div>
                <h3>No Approved DJs Yet</h3>
                <p>Approve DJ requests to see them here</p>
              </div>
            ) : (
              accessRequests.approved.map((request) => {
                // Skip if djId is null
                if (!request.djId) return null;
                
                return (
                <div key={request._id} className="dj-request-card">
                  <div className="dj-info">
                    <div className="dj-name">
                      ✅ {request.djId.name}
                    </div>
                    <div className="dj-email">📧 {request.djId.email}</div>
                    {request.djId.genres && request.djId.genres.length > 0 && (
                      <div className="dj-genres">
                        {request.djId.genres.map((genre) => (
                          <span key={genre} className="genre-badge">
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="dj-meta">
                      Approved on{" "}
                      {new Date(request.respondedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="dj-actions">
                    <button
                      className="action-button btn-revoke"
                      onClick={() =>
                        handleRevoke(request._id, request.djId.name)
                      }
                      disabled={processingId === request._id}
                    >
                      {processingId === request._id ? (
                        <>
                          <Loader size={14} className="spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Trash2 size={14} />
                          Revoke
                        </>
                      )}
                    </button>
                  </div>
                </div>
                );
              })
            )}
          </>
        )}

        {activeTab === "rejected" && (
          <>
            {rejectedCount === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <h3>No Rejected Requests</h3>
                <p>Rejected DJ requests will appear here</p>
              </div>
            ) : (
              accessRequests.rejected.map((request) => {
                // Skip if djId is null
                if (!request.djId) return null;
                
                return (
                <div key={request._id} className="dj-request-card">
                  <div className="dj-info">
                    <div className="dj-name">
                      ❌ {request.djId.name}
                    </div>
                    <div className="dj-email">📧 {request.djId.email}</div>
                    {request.rejectionReason && (
                      <div className="dj-request-message">
                        💬 Reason: {request.rejectionReason}
                      </div>
                    )}
                    <div className="dj-meta">
                      Rejected on{" "}
                      {new Date(request.respondedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                );
              })
            )}
          </>
        )}

        {activeTab === "revoked" && (
          <>
            {revokedCount === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🔒</div>
                <h3>No Revoked Access</h3>
                <p>Revoked DJ access will appear here</p>
              </div>
            ) : (
              accessRequests.revoked.map((request) => {
                // Skip if djId is null
                if (!request.djId) return null;
                
                return (
                <div key={request._id} className="dj-request-card">
                  <div className="dj-info">
                    <div className="dj-name">
                      🔒 {request.djId.name}
                    </div>
                    <div className="dj-email">📧 {request.djId.email}</div>
                    <div className="dj-meta">
                      Revoked on{" "}
                      {new Date(request.revokedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}
