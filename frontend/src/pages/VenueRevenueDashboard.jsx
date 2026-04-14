import React, { useEffect, useState } from "react";
import { DollarSign, CheckCircle, Clock, AlertCircle, TrendingUp, Music } from "lucide-react";
import "../styles/VenueRevenueDashboard.css";

export default function VenueRevenueDashboard() {
  const [venueId, setVenueId] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adminKey, setAdminKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(true);

  // Fetch admin key from localStorage on mount
  useEffect(() => {
    const storedVenueId = localStorage.getItem("venueId");
    const storedAdminKey = localStorage.getItem("adminKey");
    if (storedVenueId) setVenueId(storedVenueId);
    if (storedAdminKey) {
      setAdminKey(storedAdminKey);
      setShowKeyInput(false);
    }
  }, []);

  // Fetch revenue data
  useEffect(() => {
    if (!venueId || !adminKey) return;

    const fetchRevenue = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`📊 Fetching revenue for venue: ${venueId}`);
        
        const response = await fetch(
          `http://localhost:3000/admin/revenue/venue/${venueId}`,
          {
            headers: {
              "x-admin-key": adminKey,
              "Content-Type": "application/json"
            }
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch revenue: ${response.status}`);
        }

        const data = await response.json();
        console.log("💰 Revenue data:", data);
        setRevenue(data);
      } catch (err) {
        console.error("❌ Error fetching revenue:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRevenue();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchRevenue, 30000);
    return () => clearInterval(interval);
  }, [venueId, adminKey]);

  const handleSetAdmin = (e) => {
    e.preventDefault();
    if (adminKey && venueId) {
      localStorage.setItem("adminKey", adminKey);
      localStorage.setItem("venueId", venueId);
      setShowKeyInput(false);
    }
  };

  if (showKeyInput) {
    return (
      <div className="revenue-dashboard-container">
        <div className="admin-key-form">
          <h2>🔐 Venue Revenue Dashboard</h2>
          <p>Enter your admin credentials to view revenue</p>
          
          <form onSubmit={handleSetAdmin}>
            <input
              type="text"
              placeholder="Venue ID"
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Admin Key"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              required
            />
            <button type="submit">Access Dashboard</button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="revenue-dashboard-container">
        <div className="loading">⏳ Loading revenue data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="revenue-dashboard-container">
        <div className="error">
          <AlertCircle size={32} />
          <p>❌ Error: {error}</p>
          <button onClick={() => setShowKeyInput(true)}>Reset</button>
        </div>
      </div>
    );
  }

  if (!revenue) {
    return (
      <div className="revenue-dashboard-container">
        <div className="error">No revenue data available</div>
      </div>
    );
  }

  // Calculate statistics
  const totalEarned = revenue.totalRevenue || 0;
  const approvedSongs = revenue.capturedPayments || 0;
  const pendingApproval = revenue.totalAuthorizedAmount || 0;
  const failedPayments = revenue.payments?.failed?.count || 0;
  const avgPerSong = approvedSongs > 0 ? (totalEarned / approvedSongs).toFixed(2) : 0;

  return (
    <div className="revenue-dashboard-container">
      <div className="dashboard-header">
        <h1>💰 Venue Revenue Dashboard</h1>
        <p>Track revenue from accepted song requests</p>
        <button 
          className="logout-btn" 
          onClick={() => {
            localStorage.removeItem("adminKey");
            localStorage.removeItem("venueId");
            setShowKeyInput(true);
          }}
        >
          🚪 Change Account
        </button>
      </div>

      {/* Main Stats */}
      <div className="stats-grid">
        {/* Total Revenue */}
        <div className="stat-card total-earned">
          <div className="stat-icon">
            <DollarSign size={32} color="#10b981" />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Revenue</p>
            <h2 className="stat-value">${totalEarned.toFixed(2)}</h2>
            <p className="stat-subtext">From accepted songs ✅</p>
          </div>
        </div>

        {/* Approved Songs */}
        <div className="stat-card approved-songs">
          <div className="stat-icon">
            <CheckCircle size={32} color="#3b82f6" />
          </div>
          <div className="stat-content">
            <p className="stat-label">Approved Songs</p>
            <h2 className="stat-value">{approvedSongs}</h2>
            <p className="stat-subtext">Payments captured ✓</p>
          </div>
        </div>

        {/* Pending Approval */}
        <div className="stat-card pending">
          <div className="stat-icon">
            <Clock size={32} color="#f59e0b" />
          </div>
          <div className="stat-content">
            <p className="stat-label">Pending Approval</p>
            <h2 className="stat-value">${pendingApproval.toFixed(2)}</h2>
            <p className="stat-subtext">Awaiting admin decision ⏳</p>
          </div>
        </div>

        {/* Average Per Song */}
        <div className="stat-card average">
          <div className="stat-icon">
            <TrendingUp size={32} color="#8b5cf6" />
          </div>
          <div className="stat-content">
            <p className="stat-label">Average Per Song</p>
            <h2 className="stat-value">${avgPerSong}</h2>
            <p className="stat-subtext">When approved ✓</p>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="breakdown-section">
        <h2>📊 Payment Breakdown</h2>
        
        {/* Captured Payments */}
        <div className="payment-category">
          <div className="category-header">
            <CheckCircle size={20} color="#10b981" />
            <h3>✅ Captured Payments (Revenue Added)</h3>
            <span className="count">{revenue.payments?.captured?.count || 0}</span>
          </div>
          <div className="amount-badge earned">${(revenue.payments?.captured?.amount || 0).toFixed(2)}</div>
          
          {revenue.payments?.captured?.details && revenue.payments.captured.details.length > 0 ? (
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Song</th>
                  <th>Artist</th>
                  <th>Amount</th>
                  <th>Captured At</th>
                </tr>
              </thead>
              <tbody>
                {revenue.payments.captured.details.map((payment, idx) => (
                  <tr key={idx} className="payment-row captured">
                    <td className="song-name">
                      <Music size={16} />
                      {payment.song}
                    </td>
                    <td>{payment.artist}</td>
                    <td className="amount-cell">${payment.amount.toFixed(2)}</td>
                    <td className="date-cell">
                      {new Date(payment.capturedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="no-data">No captured payments yet</p>
          )}
        </div>

        {/* Authorized Payments */}
        {revenue.payments?.authorized?.count > 0 && (
          <div className="payment-category">
            <div className="category-header">
              <Clock size={20} color="#f59e0b" />
              <h3>⏳ Authorized Payments (Pending Decision)</h3>
              <span className="count">{revenue.payments?.authorized?.count || 0}</span>
            </div>
            <div className="amount-badge pending">${(revenue.payments?.authorized?.amount || 0).toFixed(2)}</div>
            
            {revenue.payments?.authorized?.details && revenue.payments.authorized.details.length > 0 ? (
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>Song</th>
                    <th>Artist</th>
                    <th>Amount</th>
                    <th>Authorized At</th>
                  </tr>
                </thead>
                <tbody>
                  {revenue.payments.authorized.details.map((payment, idx) => (
                    <tr key={idx} className="payment-row authorized">
                      <td className="song-name">
                        <Music size={16} />
                        {payment.song}
                      </td>
                      <td>{payment.artist}</td>
                      <td className="amount-cell">${payment.amount.toFixed(2)}</td>
                      <td className="date-cell">
                        {new Date(payment.authorizedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="no-data">No authorized payments pending</p>
            )}
          </div>
        )}

        {/* Failed/Rejected Payments */}
        {revenue.payments?.failed?.count > 0 && (
          <div className="payment-category">
            <div className="category-header">
              <AlertCircle size={20} color="#ef4444" />
              <h3>❌ Failed/Rejected Payments</h3>
              <span className="count">{revenue.payments?.failed?.count || 0}</span>
            </div>
            
            {revenue.payments?.failed?.details && revenue.payments.failed.details.length > 0 ? (
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>Song</th>
                    <th>Artist</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {revenue.payments.failed.details.map((payment, idx) => (
                    <tr key={idx} className="payment-row failed">
                      <td className="song-name">
                        <Music size={16} />
                        {payment.song}
                      </td>
                      <td>{payment.artist}</td>
                      <td className="amount-cell">${payment.amount.toFixed(2)}</td>
                      <td className="status-cell">Rejected</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="no-data">No failed payments</p>
            )}
          </div>
        )}
      </div>

      {/* Summary Info */}
      <div className="summary-info">
        <h3>📋 Summary</h3>
        <ul>
          <li>✅ <strong>Earned Revenue:</strong> ${totalEarned.toFixed(2)} (from {approvedSongs} approved songs)</li>
          <li>⏳ <strong>Pending Approval:</strong> ${pendingApproval.toFixed(2)} (awaiting admin decision)</li>
          {failedPayments > 0 && <li>❌ <strong>Rejected:</strong> {failedPayments} requests</li>}
          <li>📊 <strong>Average per Song:</strong> ${avgPerSong}</li>
          <li>⏰ <strong>Last Updated:</strong> {new Date(revenue.lastRevenueUpdateAt).toLocaleString()}</li>
        </ul>
      </div>

      {/* Important Note */}
      <div className="info-box">
        <p>
          💡 <strong>Note:</strong> Revenue is <strong>ONLY added</strong> when the admin approves your song request.
          Authorized payments (pending) will be added to your revenue once approved. Rejected requests do not generate revenue.
        </p>
      </div>
    </div>
  );
}
