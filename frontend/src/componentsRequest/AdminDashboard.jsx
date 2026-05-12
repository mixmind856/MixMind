import React, { useEffect, useState } from "react";
import axios from "axios";
import RequestRow from "./RequestRow";

const API = import.meta.env.VITE_API_URL;

export default function AdminDashboard() {
  const [storedKey, setStoredKey] = useState(
    () => localStorage.getItem("adminKey")?.trim() || ""
  );
  const [inputKey, setInputKey] = useState("");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("authorized");
  const [error, setError] = useState(null);

  const [liveEnabled, setLiveEnabled] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);

  // -------------------- REQUESTS --------------------
  async function load() {
    if (!storedKey) return;
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(
        `${API}/admin/requests?status=${filter}`,
        {
          headers: { "x-admin-key": storedKey }
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
    if (!storedKey) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load uses current storedKey/filter
  }, [filter, storedKey]);

  async function approve(id) {
    if (!storedKey) return;
    try {
      await axios.post(
        `${API}/admin/requests/${id}/approve`,
        {},
        { headers: { "x-admin-key": storedKey } }
      );
      load();
    } catch (err) {
      alert("Approve failed: " + (err?.response?.data?.error || err.message));
    }
  }

  async function reject(id) {
    if (!storedKey) return;
    try {
      await axios.post(
        `${API}/admin/requests/${id}/reject`,
        {},
        { headers: { "x-admin-key": storedKey } }
      );
      load();
    } catch (err) {
      alert("Reject failed: " + (err?.response?.data?.error || err.message));
    }
  }

  // -------------------- LIVE PLAYLIST TOGGLE --------------------
  useEffect(() => {
    if (!storedKey) return;
    async function fetchLiveStatus() {
      try {
        const res = await axios.get(`${API}/admin/live-playlist/status`, {
          headers: { "x-admin-key": storedKey }
        });
        setLiveEnabled(res.data.enabled);
      } catch (err) {
        console.error(err);
      }
    }
    fetchLiveStatus();
  }, [storedKey]);

  const toggleLivePlaylist = async () => {
    if (!storedKey) return;
    setLiveLoading(true);
    try {
      const url = liveEnabled
        ? `${API}/admin/live-playlist/stop`
        : `${API}/admin/live-playlist/start`;

      const res = await axios.post(url, {}, {
        headers: { "x-admin-key": storedKey }
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

  const handleSaveKey = (e) => {
    e.preventDefault();
    const t = inputKey.trim();
    if (!t) return;
    localStorage.setItem("adminKey", t);
    setStoredKey(t);
    setInputKey("");
  };

  if (!storedKey) {
    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded-md shadow mt-8">
        <h2 className="text-xl font-semibold mb-2">Admin key required</h2>
        <p className="text-sm text-slate-600 mb-4">
          Enter the admin key to manage requests. It is stored in this browser only.
        </p>
        <form onSubmit={handleSaveKey} className="space-y-3">
          <input
            type="password"
            autoComplete="off"
            className="w-full border rounded px-3 py-2"
            placeholder="Admin key"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
          />
          <button
            type="submit"
            className="w-full bg-purple-600 text-white py-2 rounded font-medium"
          >
            Continue
          </button>
        </form>
      </div>
    );
  }

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
