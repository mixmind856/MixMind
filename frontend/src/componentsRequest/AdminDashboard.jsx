import React, { useEffect, useState } from "react";
import axios from "axios";
import RequestRow from "./RequestRow";

const API = import.meta.env.VITE_API_URL;
const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY;

export default function AdminDashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("authorized");
  const [error, setError] = useState(null);

  const [liveEnabled, setLiveEnabled] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);

  // -------------------- REQUESTS --------------------
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(
        `${API}/api/admin/requests?status=${filter}`,
        {
          headers: { "x-admin-key": ADMIN_KEY }
        }
      );
      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.requests || [];
      setRequests(list);
    } catch (err) {
      console.error(err);
      setError("Failed to load requests");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filter]);

  async function approve(id) {
    try {
      await axios.post(
        `${API}/api/admin/requests/${id}/approve`,
        {},
        { headers: { "x-admin-key": ADMIN_KEY } }
      );
      load();
    } catch (err) {
      alert("Approve failed: " + (err?.response?.data?.error || err.message));
    }
  }

  async function reject(id) {
    try {
      await axios.post(
        `${API}/api/admin/requests/${id}/reject`,
        {},
        { headers: { "x-admin-key": ADMIN_KEY } }
      );
      load();
    } catch (err) {
      alert("Reject failed: " + (err?.response?.data?.error || err.message));
    }
  }

  // -------------------- LIVE PLAYLIST TOGGLE --------------------
  useEffect(() => {
    async function fetchLiveStatus() {
      try {
        const res = await axios.get(`${API}/api/admin/live-playlist/status`, {
          headers: { "x-admin-key": ADMIN_KEY }
        });
        setLiveEnabled(res.data.enabled);
      } catch (err) {
        console.error(err);
      }
    }
    fetchLiveStatus();
  }, []);

  const toggleLivePlaylist = async () => {
    setLiveLoading(true);
    try {
      const url = liveEnabled
        ? `${API}/api/admin/live-playlist/stop`
        : `${API}/api/admin/live-playlist/start`;

      const res = await axios.post(url, {}, {
        headers: { "x-admin-key": ADMIN_KEY }
      });

      if (res.data.success) {
        setLiveEnabled(!liveEnabled);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to toggle live playlist");
    }
    setLiveLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-md shadow">
      {/* -------------------- HEADER -------------------- */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Admin — Requests</h2>

        {/* LIVE PLAYLIST TOGGLE */}
        <div className="flex items-center gap-2">
          <span className={`font-bold ${liveEnabled ? "text-green-600" : "text-red-600"}`}>
            {liveEnabled ? "LIVE PLAYLIST ON" : "LIVE PLAYLIST OFF"}
          </span>
          <button
            onClick={toggleLivePlaylist}
            disabled={liveLoading}
            className={`px-4 py-1 rounded ${
              liveEnabled ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"
            } text-white`}
          >
            {liveLoading ? "..." : liveEnabled ? "Turn OFF" : "Turn ON"}
          </button>
        </div>
      </div>

      {/* -------------------- FILTER & RELOAD -------------------- */}
      <div className="flex items-center justify-between mb-4">
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="authorized">Authorized (Action Required)</option>
          <option value="processing">Processing</option>
          <option value="paid">Approved (Paid)</option>
          <option value="rejected">Rejected</option>
          <option value="failed">Failed</option>
        </select>
        <button className="ml-3 bg-slate-200 px-3 py-1 rounded" onClick={load}>
          Reload
        </button>
      </div>

      {/* -------------------- REQUESTS TABLE -------------------- */}
      {error && <div className="text-red-600 mb-4">{error}</div>}

      {loading ? (
        <div>Loading…</div>
      ) : requests.length === 0 ? (
        <div className="text-sm text-slate-500">
          No requests with status <strong>{filter}</strong>.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => (
            <RequestRow
              key={r._id}
              request={r}
              onApprove={() => approve(r._id)}
              onReject={() => reject(r._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
