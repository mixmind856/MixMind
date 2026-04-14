import React, { useState, useEffect } from "react";
import {
  getDashboardSummary,
  getAllVenuesStats,
  getRevenueBreakdown,
  getSongRequestDetails,
  getTopVenues,
} from "../services/adminStatsService";
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Music,
  CheckCircle,
  Clock,
  XCircle,
  Activity,
  MapPin,
  AlertCircle,
} from "lucide-react";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDashboardSummary();
      setDashboardData(data);
    } catch (err) {
      setError("Failed to load dashboard data. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-dashboard loading">
        <div className="loader"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard error">
        <AlertCircle size={48} />
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={fetchDashboardData} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  if (!dashboardData) {
    return <div className="admin-dashboard">No data available</div>;
  }

  const { summary, venues, revenue, requests } = dashboardData;

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Admin Dashboard</h1>
          <p className="subtitle">Complete Platform Overview & Analytics</p>
        </div>
        <button onClick={fetchDashboardData} className="refresh-button">
          ↻ Refresh
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <section className="summary-section">
        <h2>Key Metrics</h2>
        <div className="summary-grid">
          {/* Total Venues */}
          <div className="summary-card venues-card">
            <div className="card-header">
              <MapPin size={24} />
              <span className="badge">Venues</span>
            </div>
            <div className="card-content">
              <h3>{summary.totalVenues}</h3>
              <p>Total Venues</p>
            </div>
            <div className="card-stats">
              <span className="active">
                🟢 {summary.activeVenues} Active
              </span>
              <span className="inactive">
                🔴 {summary.inactiveVenues} Inactive
              </span>
            </div>
          </div>

          {/* Total Revenue */}
          <div className="summary-card revenue-card">
            <div className="card-header">
              <DollarSign size={24} />
              <span className="badge">Revenue</span>
            </div>
            <div className="card-content">
              <h3>${summary.totalRevenue.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}</h3>
              <p>Total Revenue</p>
            </div>
            <div className="card-stats">
              <span className="transactions">
                {summary.totalTransactions} Transactions
              </span>
              <span className="avg-per-venue">
                Avg: ${summary.avgRevenuePerVenue.toFixed(2)}/venue
              </span>
            </div>
          </div>

          {/* Total Requests */}
          <div className="summary-card requests-card">
            <div className="card-header">
              <Music size={24} />
              <span className="badge">Requests</span>
            </div>
            <div className="card-content">
              <h3>{summary.totalRequests}</h3>
              <p>Total Requests</p>
            </div>
            <div className="card-stats">
              <span className="approved">
                ✓ {summary.totalApproved} Approved
              </span>
              <span className="pending">
                ⧗ {summary.totalPending} Pending
              </span>
            </div>
          </div>

          {/* Approval Rate */}
          <div className="summary-card approval-card">
            <div className="card-header">
              <TrendingUp size={24} />
              <span className="badge">Approval Rate</span>
            </div>
            <div className="card-content">
              <h3>{summary.approvalRate}%</h3>
              <p>Request Approval Rate</p>
            </div>
            <div className="card-stats">
              <span className="rejected">
                ✗ {summary.totalRejected} Rejected
              </span>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${summary.approvalRate}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TABS NAVIGATION */}
      <div className="tabs-container">
        <button
          className={`tab-button ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <BarChart3 size={18} /> Overview
        </button>
        <button
          className={`tab-button ${activeTab === "venues" ? "active" : ""}`}
          onClick={() => setActiveTab("venues")}
        >
          <MapPin size={18} /> Venues
        </button>
        <button
          className={`tab-button ${activeTab === "revenue" ? "active" : ""}`}
          onClick={() => setActiveTab("revenue")}
        >
          <DollarSign size={18} /> Revenue
        </button>
        <button
          className={`tab-button ${activeTab === "songs" ? "active" : ""}`}
          onClick={() => setActiveTab("songs")}
        >
          <Music size={18} /> Songs
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <section className="tab-content overview-section">
          <div className="tab-grid">
            {/* Request Status Distribution */}
            <div className="card">
              <h3>Request Status Distribution</h3>
              <div className="status-distribution">
                <div className="status-item approved">
                  <CheckCircle size={20} />
                  <div className="status-info">
                    <p className="label">Approved</p>
                    <p className="count">{summary.totalApproved}</p>
                  </div>
                </div>
                <div className="status-item pending">
                  <Clock size={20} />
                  <div className="status-info">
                    <p className="label">Pending</p>
                    <p className="count">{summary.totalPending}</p>
                  </div>
                </div>
                <div className="status-item rejected">
                  <XCircle size={20} />
                  <div className="status-info">
                    <p className="label">Rejected</p>
                    <p className="count">{summary.totalRejected}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top 5 Venues by Revenue */}
            <div className="card">
              <h3>Top 5 Venues by Revenue</h3>
              <div className="venues-list">
                {venues.top.map((venue, index) => (
                  <div key={venue._id} className="venue-item">
                    <div className="rank">{index + 1}</div>
                    <div className="venue-details">
                      <p className="name">{venue.name || "Unknown Venue"}</p>
                      <p className="stats">
                        {venue.approvedRequests} approved requests
                      </p>
                    </div>
                    <div className="revenue">
                      ${venue.totalRevenue.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 5 Songs */}
            <div className="card full-width">
              <h3>Top 5 Requested Songs</h3>
              <div className="songs-list">
                <div className="songs-header">
                  <span className="rank">Rank</span>
                  <span className="song">Song</span>
                  <span className="requests">Requests</span>
                  <span className="status">Approved</span>
                </div>
                {requests.topSongs.map((song, index) => (
                  <div key={index} className="song-row">
                    <span className="rank">#{index + 1}</span>
                    <span className="song">
                      <strong>{song.songName}</strong>
                      <small>{song.artistName}</small>
                    </span>
                    <span className="requests">{song.totalRequests}</span>
                    <span className="status">{song.approvedCount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* VENUES TAB */}
      {activeTab === "venues" && (
        <section className="tab-content venues-section">
          <div className="venues-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Venue Name</th>
                  <th>Status</th>
                  <th>Total Requests</th>
                  <th>Approved</th>
                  <th>Pending</th>
                  <th>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {venues.all.map((venue) => (
                  <tr key={venue._id}>
                    <td className="venue-name">
                      {venue.name || "Unknown Venue"}
                    </td>
                    <td className="status">
                      <span className={`status-badge ${venue.isActive ? "active" : "inactive"}`}>
                        {venue.isActive ? "🟢 Active" : "🔴 Inactive"}
                      </span>
                    </td>
                    <td>{venue.totalRequests}</td>
                    <td className="approved">{venue.approvedRequests}</td>
                    <td className="pending">{venue.pendingRequests}</td>
                    <td className="revenue">
                      ${venue.totalRevenue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* REVENUE TAB */}
      {activeTab === "revenue" && (
        <section className="tab-content revenue-section">
          <div className="revenue-summary-card">
            <h3>Revenue Summary</h3>
            <div className="revenue-stats">
              <div className="stat">
                <p className="label">Total Revenue</p>
                <p className="value">
                  ${revenue.total.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="stat">
                <p className="label">Total Transactions</p>
                <p className="value">{revenue.totalTransactions}</p>
              </div>
              <div className="stat">
                <p className="label">Avg Transaction</p>
                <p className="value">
                  $
                  {revenue.totalTransactions > 0
                    ? (revenue.total / revenue.totalTransactions).toFixed(2)
                    : "0.00"}
                </p>
              </div>
            </div>
          </div>

          <div className="revenue-by-venue">
            <h3>Revenue by Venue</h3>
            <div className="venue-revenue-list">
              {revenue.byVenue.map((venueRevenue) => (
                <div key={venueRevenue.venueId} className="venue-revenue-card">
                  <div className="venue-revenue-header">
                    <h4>{venueRevenue.venueName}</h4>
                    <span className="total">
                      ${venueRevenue.totalAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="venue-revenue-stats">
                    <span className="transactions">
                      {venueRevenue.transactionCount} transactions
                    </span>
                    <span className="avg">
                      Avg: $
                      {(
                        venueRevenue.totalAmount /
                        venueRevenue.transactionCount
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SONGS TAB */}
      {activeTab === "songs" && (
        <section className="tab-content songs-section">
          <div className="songs-stats">
            <div className="stat-card">
              <h4>Total Requests</h4>
              <p className="big-number">{requests.totalRequests}</p>
            </div>
            <div className="stat-card approved">
              <h4>Approved</h4>
              <p className="big-number">{requests.byStatus.approved.length}</p>
            </div>
            <div className="stat-card pending">
              <h4>Pending</h4>
              <p className="big-number">{requests.byStatus.pending.length}</p>
            </div>
            <div className="stat-card rejected">
              <h4>Rejected</h4>
              <p className="big-number">{requests.byStatus.rejected.length}</p>
            </div>
          </div>

          <div className="songs-grid">
            {/* Approved Requests */}
            <div className="card">
              <h3>✓ Approved Requests ({requests.byStatus.approved.length})</h3>
              <div className="requests-list">
                {requests.byStatus.approved.slice(0, 10).map((req) => (
                  <div key={req._id} className="request-item approved">
                    <p className="song">
                      <strong>{req.songName}</strong>
                      <small>{req.artistName}</small>
                    </p>
                    <p className="meta">
                      {req.venueName} • {req.userName}
                    </p>
                    <p className="amount">${req.amount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Requests */}
            <div className="card">
              <h3>⧗ Pending Requests ({requests.byStatus.pending.length})</h3>
              <div className="requests-list">
                {requests.byStatus.pending.slice(0, 10).map((req) => (
                  <div key={req._id} className="request-item pending">
                    <p className="song">
                      <strong>{req.songName}</strong>
                      <small>{req.artistName}</small>
                    </p>
                    <p className="meta">
                      {req.venueName} • {req.userName}
                    </p>
                    <p className="amount">${req.amount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Rejected Requests */}
            <div className="card">
              <h3>✗ Rejected Requests ({requests.byStatus.rejected.length})</h3>
              <div className="requests-list">
                {requests.byStatus.rejected.slice(0, 10).map((req) => (
                  <div key={req._id} className="request-item rejected">
                    <p className="song">
                      <strong>{req.songName}</strong>
                      <small>{req.artistName}</small>
                    </p>
                    <p className="meta">
                      {req.venueName} • {req.userName}
                    </p>
                    <p className="amount">${req.amount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="dashboard-footer">
        <p>Last updated: {new Date().toLocaleString()}</p>
      </footer>
    </div>
  );
};

export default AdminDashboard;
