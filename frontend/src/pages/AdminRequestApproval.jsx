import { useState, useEffect } from "react";

export default function AdminRequestApproval() {
  const [requests, setRequests] = useState([]);
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("authorized");
  const [loading, setLoading] = useState(false);
  const [adminKey, setAdminKey] = useState(localStorage.getItem("adminKey") || "");
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("adminKey"));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Authenticate admin
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminKey) {
      localStorage.setItem("adminKey", adminKey);
      setIsAuthenticated(true);
      fetchRequests();
    }
  };

  // Fetch requests based on filters
  const fetchRequests = async (venueId = null, status = "authorized") => {
    try {
      setLoading(true);
      const key = adminKey || localStorage.getItem("adminKey");
      
      let url = `${import.meta.env.VITE_API_URL}/api/admin/requests?status=${status}`;
      if (venueId && venueId !== "all") {
        url = `${import.meta.env.VITE_API_URL}/api/admin/requests/venue/${venueId}?status=${status}`;
      }

      const response = await fetch(url, {
        headers: { "x-admin-key": key }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch requests");
      }

      const data = await response.json();
      setRequests(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Approve a request
  const approveRequest = async (requestId) => {
    try {
      setSuccess("");
      setError("");
      const key = adminKey || localStorage.getItem("adminKey");

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/requests/${requestId}/approve`,
        {
          method: "POST",
          headers: { "x-admin-key": key }
        }
      );

      if (!response.ok) {
        throw new Error("Failed to approve request");
      }

      setSuccess("Request approved and sent to worker!");
      setTimeout(() => fetchRequests(selectedVenue, selectedStatus), 1000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Reject a request
  const rejectRequest = async (requestId) => {
    try {
      setSuccess("");
      setError("");
      const key = adminKey || localStorage.getItem("adminKey");

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/requests/${requestId}/reject`,
        {
          method: "POST",
          headers: { "x-admin-key": key }
        }
      );

      if (!response.ok) {
        throw new Error("Failed to reject request");
      }

      setSuccess("Request rejected!");
      setTimeout(() => fetchRequests(selectedVenue, selectedStatus), 1000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Handle venue change
  const handleVenueChange = (venueId) => {
    setSelectedVenue(venueId);
    fetchRequests(venueId, selectedStatus);
  };

  // Handle status change
  const handleStatusChange = (status) => {
    setSelectedStatus(status);
    fetchRequests(selectedVenue, status);
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchRequests(selectedVenue, selectedStatus);
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#140822] to-[#0a0712] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/5 backdrop-blur-md border border-purple-500/20 rounded-xl p-8">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">Admin Login</h1>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Enter admin key"
              className="w-full px-4 py-2 bg-white/10 border border-purple-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#140822] to-[#0a0712] text-white">
      {/* Header */}
      <div className="bg-black/40 backdrop-blur-md border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Admin: Request Approval</h1>
          <button
            onClick={() => {
              localStorage.removeItem("adminKey");
              setIsAuthenticated(false);
            }}
            className="px-4 py-2 bg-red-600/20 text-red-300 rounded-lg border border-red-500/30 hover:bg-red-600/30"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Alerts */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-500/20 border border-green-500 text-green-200 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white/5 backdrop-blur-md border border-purple-500/20 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="authorized">Authorized (Pending Approval)</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Venue (Optional)</label>
              <select
                value={selectedVenue}
                onChange={(e) => handleVenueChange(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Venues</option>
                <option value="venue1">Venue 1</option>
                <option value="venue2">Venue 2</option>
                {/* Venues will be populated from requests */}
              </select>
            </div>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white/5 backdrop-blur-md border border-purple-500/20 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">
            {loading ? "Loading requests..." : `${requests.length} Requests`}
          </h2>

          {requests.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No requests found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-purple-500/20">
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Song</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Artist</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">User</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Venue</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Price</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request._id} className="border-b border-purple-500/10 hover:bg-white/5">
                      <td className="py-3 px-4">{request.title}</td>
                      <td className="py-3 px-4">{request.artist}</td>
                      <td className="py-3 px-4 text-sm">
                        {request.userId?.name || "N/A"}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {request.venueId?.name || "N/A"}
                      </td>
                      <td className="py-3 px-4">${request.price.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded">
                          {request.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 space-x-2">
                        {request.status === "authorized" && (
                          <>
                            <button
                              onClick={() => approveRequest(request._id)}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => rejectRequest(request._id)}
                              className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Worker Status Info */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mt-8">
          <h3 className="text-lg font-semibold text-blue-300 mb-2">Worker Status</h3>
          <p className="text-gray-300">
            When you approve a request, it's automatically sent to the Beatsource worker queue 
            for processing. The worker will find the song on Beatsource and add it to the playlist.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-gray-300">
            <li>✓ Request approved → Status: processing</li>
            <li>✓ Worker finds song on Beatsource</li>
            <li>✓ Song added to playlist</li>
            <li>✓ Status updated: completed or failed</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
