import React from "react";

export default function RequestRow({ request, onApprove, onReject }) {
  const actionable = request.status === "authorized";

  return (
    <div className="border rounded px-4 py-3 flex items-start justify-between">
      <div>
        <div className="font-medium">
          {request.title} — {request.artist}
        </div>
        <div className="text-sm text-slate-600">
          By: {request.userId?.email || "—"} · ${request.price}
        </div>
        <div className="text-sm text-slate-500 mt-2">
          Status: <span className="font-medium">{request.status}</span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        {actionable ? (
          <>
            <button
              onClick={onApprove}
              className="bg-green-600 text-white px-3 py-1 rounded"
            >
              Approve
            </button>
            <button
              onClick={onReject}
              className="bg-red-600 text-white px-3 py-1 rounded"
            >
              Reject
            </button>
          </>
        ) : (
          <div className="text-sm text-slate-500">No actions</div>
        )}
      </div>
    </div>
  );
}
