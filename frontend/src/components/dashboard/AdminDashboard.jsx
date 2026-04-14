import React, { useState, useEffect } from "react";
import "./AdminDashboard.css";
import StripePayment from "../payment/StripePayment";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({
    totalVenues: 0,
    activeWorkers: 0,
    totalRequests: 0,
    totalRevenue: 0,
    livePlaylistStatus: "inactive"
  });

  const [venues, setVenues] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    // Mock data - replace with actual API calls
    setStats({
      totalVenues: 12,
      activeWorkers: 8,
      totalRequests: 156,
      totalRevenue: 4520.50,
      livePlaylistStatus: "active"
    });

    setVenues([
      { id: 1, name: "The Blue Room", status: "active", requests: 45, revenue: 1200 },
      { id: 2, name: "Neon Lounge", status: "active", requests: 38, revenue: 950 },
      { id: 3, name: "Electric Nights", status: "inactive", requests: 12, revenue: 450 }
    ]);
  }, []);

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>🎛️ Admin Dashboard</h1>
          <p>Manage venues, workers, and payments</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setShowPaymentModal(true)}>
            💳 Manage Payments
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🏢</div>
          <div className="stat-content">
            <p className="stat-label">Total Venues</p>
            <p className="stat-value">{stats.totalVenues}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⚙️</div>
          <div className="stat-content">
            <p className="stat-label">Active Workers</p>
            <p className="stat-value">{stats.activeWorkers}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <p className="stat-label">Total Requests</p>
            <p className="stat-value">{stats.totalRequests}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <p className="stat-label">Total Revenue</p>
            <p className="stat-value">${stats.totalRevenue.toFixed(2)}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎵</div>
          <div className="stat-content">
            <p className="stat-label">Live Playlist</p>
            <p className="stat-value status" style={{
              color: stats.livePlaylistStatus === "active" ? "#10b981" : "#ef4444"
            }}>
              {stats.livePlaylistStatus.toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          className={`tab-button ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          📊 Overview
        </button>
        <button
          className={`tab-button ${activeTab === "venues" ? "active" : ""}`}
          onClick={() => setActiveTab("venues")}
        >
          🏢 Venues
        </button>
        <button
          className={`tab-button ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          ⚙️ Settings
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "overview" && (
          <div className="overview-section">
            <div className="chart-container">
              <h3>📈 Revenue Trend</h3>
              <div className="simple-chart">
                <div className="chart-bar" style={{ height: "40%" }}>
                  <span>Week 1</span>
                </div>
                <div className="chart-bar" style={{ height: "60%" }}>
                  <span>Week 2</span>
                </div>
                <div className="chart-bar" style={{ height: "75%" }}>
                  <span>Week 3</span>
                </div>
                <div className="chart-bar" style={{ height: "90%" }}>
                  <span>Week 4</span>
                </div>
              </div>
            </div>

            <div className="activity-container">
              <h3>🔄 Recent Activity</h3>
              <div className="activity-list">
                <div className="activity-item">
                  <span className="activity-icon">✅</span>
                  <div className="activity-content">
                    <p className="activity-title">Worker Started</p>
                    <p className="activity-time">The Blue Room - 5 minutes ago</p>
                  </div>
                </div>
                <div className="activity-item">
                  <span className="activity-icon">💰</span>
                  <div className="activity-content">
                    <p className="activity-title">Payment Received</p>
                    <p className="activity-time">$250.00 - 2 hours ago</p>
                  </div>
                </div>
                <div className="activity-item">
                  <span className="activity-icon">📝</span>
                  <div className="activity-content">
                    <p className="activity-title">New Request</p>
                    <p className="activity-time">Neon Lounge - 3 hours ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "venues" && (
          <div className="venues-section">
            <div className="venues-toolbar">
              <h3>Venue Management</h3>
              <button className="btn btn-secondary">➕ Add Venue</button>
            </div>

            <div className="venues-grid">
              {venues.map((venue) => (
                <div key={venue.id} className="venue-card">
                  <div className="venue-header">
                    <h4>{venue.name}</h4>
                    <span className={`status-badge ${venue.status}`}>
                      {venue.status}
                    </span>
                  </div>

                  <div className="venue-stats">
                    <div className="venue-stat">
                      <span className="label">Requests:</span>
                      <span className="value">{venue.requests}</span>
                    </div>
                    <div className="venue-stat">
                      <span className="label">Revenue:</span>
                      <span className="value">${venue.revenue}</span>
                    </div>
                  </div>

                  <div className="venue-actions">
                    <button className="btn btn-small btn-primary">View</button>
                    <button className="btn btn-small btn-secondary">Edit</button>
                    <button className="btn btn-small btn-danger">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="settings-section">
            <h3>⚙️ Settings</h3>

            <div className="settings-group">
              <label>
                <input type="checkbox" defaultChecked />
                <span>Enable Live Playlist Feature</span>
              </label>
            </div>

            <div className="settings-group">
              <label>
                <input type="checkbox" defaultChecked />
                <span>Enable Payment Processing</span>
              </label>
            </div>

            <div className="settings-group">
              <label>
                <input type="checkbox" />
                <span>Enable Email Notifications</span>
              </label>
            </div>

            <div className="settings-group">
              <label>
                <input type="checkbox" defaultChecked />
                <span>Auto-start Workers on Venue Activation</span>
              </label>
            </div>

            <button className="btn btn-primary" style={{ marginTop: "20px" }}>
              💾 Save Settings
            </button>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowPaymentModal(false)}>
              ✕
            </button>
            <StripePayment amount={99.99} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
