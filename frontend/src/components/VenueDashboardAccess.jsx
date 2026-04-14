import React, { useState } from "react";
import { BarChart3, DollarSign, LogOut } from "lucide-react";
import "../styles/VenueDashboardAccess.css";

export default function VenueDashboardAccess() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [venueId, setVenueId] = useState(localStorage.getItem("venueId") || "");
  const [adminKey, setAdminKey] = useState(localStorage.getItem("adminKey") || "");

  const handleAccessDashboard = () => {
    if (venueId && adminKey) {
      localStorage.setItem("venueId", venueId);
      localStorage.setItem("adminKey", adminKey);
      window.location.href = "/revenue-dashboard";
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("venueId");
    localStorage.removeItem("adminKey");
    setVenueId("");
    setAdminKey("");
    setShowDashboard(false);
  };

  return (
    <div className="venue-dashboard-access">
      {!showDashboard ? (
        <button 
          className="access-btn"
          onClick={() => setShowDashboard(true)}
        >
          <BarChart3 size={20} />
          View Revenue Dashboard
        </button>
      ) : (
        <div className="access-modal">
          <div className="modal-content">
            <h2>💰 Venue Revenue Dashboard</h2>
            
            <form onSubmit={(e) => { e.preventDefault(); handleAccessDashboard(); }}>
              <div className="form-group">
                <label>Venue ID</label>
                <input
                  type="text"
                  value={venueId}
                  onChange={(e) => setVenueId(e.target.value)}
                  placeholder="Enter your venue ID"
                  required
                />
              </div>

              <div className="form-group">
                <label>Admin Key</label>
                <input
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Enter admin key"
                  required
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  <DollarSign size={18} />
                  Access Dashboard
                </button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowDashboard(false)}
                >
                  Cancel
                </button>
              </div>
            </form>

            {(venueId || adminKey) && (
              <button 
                className="btn-logout"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                Clear Saved Credentials
              </button>
            )}

            <p className="help-text">
              📍 You can access your revenue dashboard from here anytime to see:
            </p>
            <ul className="features-list">
              <li>✅ Total revenue from accepted songs</li>
              <li>📊 Number of approved requests</li>
              <li>⏳ Pending payment approvals</li>
              <li>📈 Payment history and details</li>
              <li>💡 Average revenue per song</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
