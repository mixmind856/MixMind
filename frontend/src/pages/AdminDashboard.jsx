import React, { useState, useEffect } from "react";
import {
  getDashboardSummary,
  getAnalyticsFunnel,
  getAnalyticsVenue,
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
  QrCode,
} from "lucide-react";
import "./AdminDashboard.css";

function londonYmdBrowser() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function buildAnalyticsQueryString({ rangePreset, dayDate, customStart, customEnd }) {
  const params = new URLSearchParams();
  if (rangePreset === "custom" && customStart && customEnd) {
    params.set("range", "custom");
    params.set("startDate", customStart);
    params.set("endDate", customEnd);
    return `?${params.toString()}`;
  }
  if (rangePreset === "today") params.set("range", "today");
  else if (rangePreset === "yesterday") params.set("range", "yesterday");
  else if (rangePreset === "day") {
    params.set("range", "day");
    if (dayDate) params.set("date", dayDate);
  } else if (rangePreset === "week") params.set("range", "week");
  else if (rangePreset === "month") params.set("range", "month");
  else if (rangePreset === "year") params.set("range", "year");
  const s = params.toString();
  return s ? `?${s}` : "";
}

const AdminDashboard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!localStorage.getItem("adminKey")?.trim()
  );
  const [loginInput, setLoginInput] = useState("");
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(
    () => !!localStorage.getItem("adminKey")?.trim()
  );
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [funnel, setFunnel] = useState(null);
  const [funnelError, setFunnelError] = useState(null);
  const [rangePreset, setRangePreset] = useState("today");
  const [dayDate, setDayDate] = useState(() => londonYmdBrowser());
  const [customStart, setCustomStart] = useState(() => londonYmdBrowser());
  const [customEnd, setCustomEnd] = useState(() => londonYmdBrowser());
  const [detailVenueId, setDetailVenueId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [detailTab, setDetailTab] = useState("funnel");

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchDashboardData();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchFunnelData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch when range changes; fetchFunnelData reads latest state
  }, [isAuthenticated, rangePreset, dayDate, customStart, customEnd]);

  useEffect(() => {
    if (!isAuthenticated || !detailVenueId) {
      setDetailData(null);
      setDetailError(null);
      return;
    }
    let cancelled = false;
    const qs = buildAnalyticsQueryString({ rangePreset, dayDate, customStart, customEnd });
    (async () => {
      try {
        setDetailLoading(true);
        setDetailError(null);
        const data = await getAnalyticsVenue(detailVenueId, qs);
        if (!cancelled) setDetailData(data);
      } catch (err) {
        console.error(err);
        if (!cancelled) setDetailError("Could not load venue analytics.");
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, detailVenueId, rangePreset, dayDate, customStart, customEnd]);

  useEffect(() => {
    if (detailVenueId) setDetailTab("funnel");
  }, [detailVenueId]);

  const handleLogin = (e) => {
    e.preventDefault();
    const v = loginInput.trim();
    if (!v) return;
    localStorage.setItem("adminKey", v);
    setLoginInput("");
    setLoading(true);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("adminKey");
    setIsAuthenticated(false);
    setDashboardData(null);
    setFunnel(null);
    setError(null);
    setFunnelError(null);
    setDetailVenueId(null);
    setDetailData(null);
    setDetailError(null);
    setLoading(false);
  };

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

  const fetchFunnelData = async () => {
    try {
      setFunnelError(null);
      const qs = buildAnalyticsQueryString({ rangePreset, dayDate, customStart, customEnd });
      const data = await getAnalyticsFunnel(qs);
      setFunnel(data);
    } catch (err) {
      console.error(err);
      setFunnelError("Could not load QR & funnel analytics.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="admin-dashboard">
        <div style={{ maxWidth: 400, margin: "4rem auto", padding: 24 }}>
          <h1 style={{ marginBottom: 16 }}>Admin login</h1>
          <p style={{ color: "#94a3b8", marginBottom: 20 }}>
            Enter your admin key. It is stored only in this browser (localStorage).
          </p>
          <form onSubmit={handleLogin}>
            <input
              type="password"
              autoComplete="off"
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              placeholder="Admin key"
              style={{
                width: "100%",
                padding: "10px 12px",
                marginBottom: 12,
                borderRadius: 8,
                border: "1px solid rgba(168,85,247,0.4)",
                background: "rgba(0,0,0,0.3)",
                color: "#fff",
              }}
            />
            <button type="submit" className="refresh-button" style={{ width: "100%" }}>
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

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
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={fetchDashboardData} className="retry-button">
            Retry
          </button>
          <button type="button" onClick={handleLogout} className="retry-button">
            Logout
          </button>
        </div>
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
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button type="button" onClick={handleLogout} className="refresh-button">
            Logout
          </button>
          <button
            onClick={() => {
              fetchDashboardData();
              fetchFunnelData();
            }}
            className="refresh-button"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* QR & FUNNEL ANALYTICS */}
      <section className="summary-section funnel-section">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <QrCode size={22} />
          <h2 style={{ margin: 0 }}>Analytics & true revenue</h2>
        </div>
        <p className="subtitle admin-range-label" style={{ marginTop: 0, opacity: 0.95, fontSize: "0.95rem" }}>
          {funnel?.appliedRange?.label || "Showing: Today"}
        </p>
        <p className="subtitle" style={{ marginTop: 4, opacity: 0.75, fontSize: "0.85rem" }}>
          {funnel?.dateRange?.timezone
            ? `Boundaries: ${funnel.dateRange.timezone}`
            : ""}
        </p>

        <div className="admin-analytics-filters">
          <button
            type="button"
            className={`admin-filter-btn ${rangePreset === "today" ? "active" : ""}`}
            onClick={() => setRangePreset("today")}
          >
            Today
          </button>
          <button
            type="button"
            className={`admin-filter-btn ${rangePreset === "yesterday" ? "active" : ""}`}
            onClick={() => setRangePreset("yesterday")}
          >
            Yesterday
          </button>
          <label className="admin-filter-day">
            <span className="admin-filter-day-label">Day</span>
            <input
              type="date"
              value={dayDate}
              onChange={(e) => {
                setDayDate(e.target.value);
                setRangePreset("day");
              }}
            />
          </label>
          <button
            type="button"
            className={`admin-filter-btn ${rangePreset === "week" ? "active" : ""}`}
            onClick={() => setRangePreset("week")}
          >
            This week
          </button>
          <button
            type="button"
            className={`admin-filter-btn ${rangePreset === "month" ? "active" : ""}`}
            onClick={() => setRangePreset("month")}
          >
            This month
          </button>
          <button
            type="button"
            className={`admin-filter-btn ${rangePreset === "year" ? "active" : ""}`}
            onClick={() => setRangePreset("year")}
          >
            This year
          </button>
          <div className="admin-filter-custom">
            <span className="admin-filter-day-label">Custom</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => {
                setCustomStart(e.target.value);
                setRangePreset("custom");
              }}
            />
            <span style={{ opacity: 0.7 }}>–</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => {
                setCustomEnd(e.target.value);
                setRangePreset("custom");
              }}
            />
          </div>
        </div>

        {funnelError && (
          <p style={{ color: "#f87171", marginBottom: "12px" }}>{funnelError}</p>
        )}
        {funnel && funnel.analyticsTotals && funnel.dbTotals && (
          <>
            <h3 className="admin-analytics-section-title" style={{ marginTop: "20px", marginBottom: "10px" }}>
              1. Analytics funnel
            </h3>
            <p className="subtitle" style={{ fontSize: "0.85rem", opacity: 0.75, marginBottom: "12px" }}>
              Event-based funnel (not banked revenue).
            </p>
            <div className="summary-grid" style={{ marginTop: "4px" }}>
              <div className="summary-card requests-card">
                <div className="card-header">
                  <QrCode size={22} />
                  <span className="badge">QR</span>
                </div>
                <div className="card-content">
                  <h3>{funnel.analyticsTotals.qrScans}</h3>
                  <p>QR scans</p>
                </div>
              </div>
              <div className="summary-card requests-card">
                <div className="card-header">
                  <Activity size={22} />
                  <span className="badge">Pages</span>
                </div>
                <div className="card-content">
                  <h3>{funnel.analyticsTotals.venuePageVisits}</h3>
                  <p>Venue page visits</p>
                </div>
              </div>
              <div className="summary-card revenue-card">
                <div className="card-header">
                  <CheckCircle size={22} />
                  <span className="badge">Events</span>
                </div>
                <div className="card-content">
                  <h3>{funnel.analyticsTotals.analyticsCheckoutCompletions}</h3>
                  <p>Analytics checkout completions</p>
                </div>
              </div>
              <div className="summary-card approval-card">
                <div className="card-header">
                  <TrendingUp size={22} />
                  <span className="badge">Funnel</span>
                </div>
                <div className="card-content">
                  <h3>{funnel.analyticsTotals.overallFunnelConversionPct}%</h3>
                  <p>Funnel conversion (completions ÷ QR scans)</p>
                </div>
              </div>
            </div>

            <h3 className="admin-analytics-section-title" style={{ marginTop: "28px", marginBottom: "10px" }}>
              2. True revenue (database)
            </h3>
            <p className="subtitle" style={{ fontSize: "0.85rem", opacity: 0.75, marginBottom: "12px" }}>
              MixMind captured and Jukebox succeeded amounts in the selected window.
            </p>
            <div className="summary-grid" style={{ marginTop: "4px" }}>
              <div className="summary-card revenue-card">
                <div className="card-header">
                  <DollarSign size={22} />
                  <span className="badge">MixMind</span>
                </div>
                <div className="card-content">
                  <h3>£{Number(funnel.dbTotals.mixmindCapturedRevenue || 0).toFixed(2)}</h3>
                  <p>Captured revenue</p>
                </div>
              </div>
              <div className="summary-card revenue-card">
                <div className="card-header">
                  <Music size={22} />
                  <span className="badge">Jukebox</span>
                </div>
                <div className="card-content">
                  <h3>£{Number(funnel.dbTotals.jukeboxSucceededRevenue || 0).toFixed(2)}</h3>
                  <p>Succeeded jukebox revenue</p>
                </div>
              </div>
              <div className="summary-card approval-card">
                <div className="card-header">
                  <TrendingUp size={22} />
                  <span className="badge">Total</span>
                </div>
                <div className="card-content">
                  <h3>£{Number(funnel.dbTotals.totalTrueRevenue || 0).toFixed(2)}</h3>
                  <p>Total true revenue</p>
                </div>
              </div>
              <div className="summary-card requests-card">
                <div className="card-header">
                  <Users size={22} />
                  <span className="badge">DB</span>
                </div>
                <div className="card-content">
                  <h3>
                    {(funnel.dbTotals.mixmindRequestCount || 0) +
                      (funnel.dbTotals.jukeboxRequestCount || 0)}
                  </h3>
                  <p>Total DB requests</p>
                </div>
              </div>
            </div>

            <div className="venues-table-container" style={{ marginTop: "28px" }}>
              <h3 style={{ marginBottom: "12px" }}>Venues</h3>
              <p className="subtitle" style={{ fontSize: "0.85rem", opacity: 0.75, marginBottom: "12px" }}>
                Tap a venue for details (same date range).
              </p>
              {(funnel.venues || []).length === 0 ? (
                <p style={{ textAlign: "center", opacity: 0.7 }}>No venues with activity in this range.</p>
              ) : (
                <div className="admin-venue-grid">
                  {funnel.venues.map((row) => {
                    const active = row.isActive !== false;
                    const rev = row.totalTrueRevenue ?? 0;
                    const conv = row.venueFunnelConversionPct ?? row.visitToPaymentConversion ?? 0;
                    return (
                      <button
                        type="button"
                        key={row.venueId}
                        className="admin-venue-card"
                        onClick={() => setDetailVenueId(row.venueId)}
                      >
                        <div className="admin-venue-card-title-row">
                          <span className="admin-venue-card-title">{row.venueName || row.venueId}</span>
                          <span className={`admin-venue-status-badge ${active ? "active" : "inactive"}`}>
                            {active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div className="admin-venue-card-stat">
                          <span>Page visits</span>
                          <strong>{row.venuePageVisits ?? 0}</strong>
                        </div>
                        <div className="admin-venue-card-stat">
                          <span>DB requests</span>
                          <strong>{row.dbRequestCount ?? 0}</strong>
                        </div>
                        <div className="admin-venue-card-stat">
                          <span>True revenue</span>
                          <strong>£{rev.toFixed(2)}</strong>
                        </div>
                        <div className="admin-venue-card-stat">
                          <span>Funnel conversion %</span>
                          <strong>{conv}%</strong>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="venues-table-container" style={{ marginTop: "28px" }}>
              <h3 style={{ marginBottom: "12px" }}>Source breakdown (analytics)</h3>
              <p className="subtitle" style={{ fontSize: "0.85rem", opacity: 0.75, marginBottom: "10px" }}>
                Visits = QR scans with <code>src</code>; selections = venue picks; completions = analytics checkout
                completions.
              </p>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Visits</th>
                    <th>Venue selected</th>
                    <th>Analytics checkout completions</th>
                    <th>Conv %</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(funnel.sources || {}).length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", opacity: 0.7 }}>
                        No source tags recorded in this range.
                      </td>
                    </tr>
                  ) : (
                    Object.entries(funnel.sources || {})
                      .sort((a, b) => (b[1].visits || 0) - (a[1].visits || 0))
                      .map(([src, s]) => (
                        <tr key={src}>
                          <td>{src}</td>
                          <td>{s.visits}</td>
                          <td>{s.selections}</td>
                          <td>{s.analyticsCheckoutCompletions ?? 0}</td>
                          <td>{s.conversion}%</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

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

      {/* VENUE DETAIL MODAL */}
      {detailVenueId && (
        <div
          className="admin-modal-overlay"
          role="presentation"
          onClick={() => setDetailVenueId(null)}
        >
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header">
              <div>
                <h2 style={{ marginBottom: 6 }}>{detailData?.venue?.name || "Venue"}</h2>
                {detailData?.venue && (
                  <span
                    className={`admin-venue-status-badge ${
                      detailData.venue.isActive !== false ? "active" : "inactive"
                    }`}
                  >
                    {detailData.venue.isActive !== false ? "Active" : "Inactive"}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setDetailVenueId(null)}
              >
                Close
              </button>
            </div>
            <p className="subtitle admin-range-label" style={{ marginBottom: "12px" }}>
              {detailData?.appliedRange?.label || funnel?.appliedRange?.label}
            </p>
            <div className="admin-detail-tabs">
              {["funnel", "revenue", "requests", "sources", "hourly"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`admin-detail-tab ${detailTab === tab ? "active" : ""}`}
                  onClick={() => setDetailTab(tab)}
                >
                  {tab === "funnel" && "Funnel"}
                  {tab === "revenue" && "Revenue"}
                  {tab === "requests" && "Requests"}
                  {tab === "sources" && "Sources"}
                  {tab === "hourly" && "Hourly"}
                </button>
              ))}
            </div>
            {detailLoading && <p>Loading…</p>}
            {detailError && <p style={{ color: "#f87171" }}>{detailError}</p>}
            {!detailLoading && detailData && (
              <div className="admin-modal-body">
                {detailTab === "funnel" && (
                  <section className="admin-modal-section">
                    <h3>Funnel (analytics)</h3>
                    <ul className="admin-modal-kv">
                      <li>
                        <span>Venue page visits</span>
                        <strong>{detailData.funnel?.venuePageVisits ?? 0}</strong>
                      </li>
                      <li>
                        <span>Venue selections</span>
                        <strong>{detailData.funnel?.venueSelections ?? 0}</strong>
                      </li>
                      <li>
                        <span>Song searches</span>
                        <strong>{detailData.funnel?.songSearches ?? 0}</strong>
                      </li>
                      <li>
                        <span>Requests started</span>
                        <strong>{detailData.funnel?.requestsStarted ?? 0}</strong>
                      </li>
                      <li>
                        <span>Checkouts started</span>
                        <strong>{detailData.funnel?.checkoutsStarted ?? 0}</strong>
                      </li>
                      <li>
                        <span>Analytics checkout completions</span>
                        <strong>{detailData.funnel?.analyticsCheckoutCompletions ?? 0}</strong>
                      </li>
                      <li>
                        <span>Funnel conversion %</span>
                        <strong>
                          {detailData.funnel?.venueFunnelConversionPct ??
                            detailData.funnel?.visitToPaymentConversion ??
                            0}
                          %
                        </strong>
                      </li>
                      <li>
                        <span>Hottest hour (page visits)</span>
                        <strong>{detailData.funnel?.hottestHour || "—"}</strong>
                      </li>
                    </ul>
                  </section>
                )}

                {detailTab === "revenue" && (
                  <section className="admin-modal-section">
                    <h3>True revenue (database)</h3>
                    <ul className="admin-modal-kv">
                      <li>
                        <span>Captured revenue</span>
                        <strong>£{(detailData.mixmind?.capturedRevenue ?? 0).toFixed(2)}</strong>
                      </li>
                      <li>
                        <span>Succeeded jukebox revenue</span>
                        <strong>£{(detailData.jukebox?.revenue ?? 0).toFixed(2)}</strong>
                      </li>
                      <li>
                        <span>Total true revenue</span>
                        <strong>
                          £
                          {(
                            (detailData.mixmind?.capturedRevenue ?? 0) +
                            (detailData.jukebox?.revenue ?? 0)
                          ).toFixed(2)}
                        </strong>
                      </li>
                    </ul>
                  </section>
                )}

                {detailTab === "requests" && (
                  <>
                    <section className="admin-modal-section">
                      <h3>DB requests</h3>
                      <ul className="admin-modal-kv">
                        <li>
                          <span>Total DB requests</span>
                          <strong>
                            {(detailData.mixmind?.total ?? 0) + (detailData.jukebox?.total ?? 0)}
                          </strong>
                        </li>
                        <li>
                          <span>MixMind requests</span>
                          <strong>{detailData.mixmind?.total ?? 0}</strong>
                        </li>
                        <li>
                          <span>Jukebox requests</span>
                          <strong>{detailData.jukebox?.total ?? 0}</strong>
                        </li>
                      </ul>
                    </section>
                    <section className="admin-modal-section">
                      <h3>MixMind breakdown</h3>
                      <ul className="admin-modal-kv">
                        <li>
                          <span>Accepted / pipeline</span>
                          <strong>{detailData.mixmind?.acceptedCompleted ?? 0}</strong>
                        </li>
                        <li>
                          <span>Pending</span>
                          <strong>{detailData.mixmind?.pending ?? 0}</strong>
                        </li>
                        <li>
                          <span>Rejected / failed</span>
                          <strong>{detailData.mixmind?.rejectedFailed ?? 0}</strong>
                        </li>
                      </ul>
                    </section>
                    <section className="admin-modal-section">
                      <h3>Jukebox breakdown</h3>
                      <ul className="admin-modal-kv">
                        <li>
                          <span>Queued (success path)</span>
                          <strong>{detailData.jukebox?.queuedSuccess ?? 0}</strong>
                        </li>
                        <li>
                          <span>Pending</span>
                          <strong>{detailData.jukebox?.pending ?? 0}</strong>
                        </li>
                        <li>
                          <span>Rejected / failed</span>
                          <strong>{detailData.jukebox?.rejected ?? 0}</strong>
                        </li>
                      </ul>
                    </section>
                    <section className="admin-modal-section">
                      <h3>Recent MixMind</h3>
                      {(detailData.mixmind?.recent || []).length === 0 ? (
                        <p className="subtitle">None in range.</p>
                      ) : (
                        <ul className="admin-recent-list">
                          {detailData.mixmind.recent.map((r) => (
                            <li key={r._id}>
                              <strong>{r.title || "—"}</strong> · {r.status} · {r.paymentStatus} · £
                              {(Number(r.paidAmount) || Number(r.price) || 0).toFixed(2)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                    <section className="admin-modal-section">
                      <h3>Recent Jukebox</h3>
                      {(detailData.jukebox?.recent || []).length === 0 ? (
                        <p className="subtitle">None in range.</p>
                      ) : (
                        <ul className="admin-recent-list">
                          {detailData.jukebox.recent.map((r) => (
                            <li key={r._id}>
                              <strong>{r.trackName}</strong> · {r.status} · {r.paymentStatus} · £
                              {((Number(r.amountPence) || 0) / 100).toFixed(2)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  </>
                )}

                {detailTab === "sources" && (
                  <section className="admin-modal-section">
                    <h3>Sources (analytics)</h3>
                    {Object.keys(detailData.sources || {}).length === 0 ? (
                      <p className="subtitle">No sources for this venue in range.</p>
                    ) : (
                      <table className="data-table admin-modal-table">
                        <thead>
                          <tr>
                            <th>Source</th>
                            <th>Visits</th>
                            <th>Selected</th>
                            <th>Analytics checkout completions</th>
                            <th>Conv %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(detailData.sources).map(([src, s]) => (
                            <tr key={src}>
                              <td>{src}</td>
                              <td>{s.visits}</td>
                              <td>{s.selections}</td>
                              <td>{s.analyticsCheckoutCompletions ?? 0}</td>
                              <td>{s.conversion}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </section>
                )}

                {detailTab === "hourly" && (
                  <section className="admin-modal-section">
                    <h3>Hourly activity (venue-tagged events)</h3>
                    {(detailData.hourlyActivity || []).length === 0 ? (
                      <p className="subtitle">No hourly data.</p>
                    ) : (
                      <div className="admin-hourly-scroll">
                        <table className="data-table admin-modal-table">
                          <thead>
                            <tr>
                              <th>Hour</th>
                              <th>Events</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailData.hourlyActivity.map((h) => (
                              <tr key={h.hour}>
                                <td>{h.hour}</td>
                                <td>{h.count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="dashboard-footer">
        <p>Last updated: {new Date().toLocaleString()}</p>
      </footer>
    </div>
  );
};

export default AdminDashboard;