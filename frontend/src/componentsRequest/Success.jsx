import React, { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export default function Success() {
  const [status, setStatus] = useState("checking");
  const [request, setRequest] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const requestId = sessionStorage.getItem("dj_request_id");
    if (!requestId) {
      setError("No request id found in session. If you just paid, go back to the website and start again.");
      setStatus("error");
      return;
    }

    let cancelled = false;

    async function poll() {
      try {
        const res = await axios.get(`${API}/api/requests/${requestId}`);
        const r = res.data;
        if (cancelled) return;

        setRequest(r);
        setStatus(r.status);

        // Poll until request.status is 'paid' or a terminal state
        if (r.status === "created" || r.status === "processing") {
          setTimeout(poll, 2500);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to fetch request status.");
        setStatus("error");
      }
    }

    poll();

    return () => { cancelled = true; };
  }, []);

  function friendly(s) {
    if (!s) return "";
    if (s === "created") return "Created (waiting payment confirmation)";
    if (s === "paid") return "Paid — waiting admin approval";
    if (s === "approved") return "Approved — automation queued";
    if (s === "processing") return "Processing (automation running)";
    if (s === "completed") return "Completed — track added";
    if (s === "failed") return "Failed — check logs";
    return s;
  }

  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded-md shadow">
      <h2 className="text-xl font-semibold mb-4">Payment status</h2>

      {error && <div className="text-red-600">{error}</div>}

      {!error && (
        <>
          <div className="mb-4">
            <div className="text-sm text-slate-600">Status</div>
            <div className="mt-2 font-medium">{friendly(status)}</div>
          </div>

          {request && (
            <div className="space-y-2 text-sm text-slate-700">
              <div><strong>Song:</strong> {request.title} — {request.artist}</div>
              <div><strong>Price:</strong> ${request.price}</div>
              <div><strong>Request ID:</strong> {request._id}</div>
            </div>
          )}

          <div className="mt-6 text-sm text-slate-500">
            Admin approval is required to add the track to Beatsource/dJ app. Refresh will continue polling until payment is confirmed and status updates.
          </div>
        </>
      )}
    </div>
  );
}
