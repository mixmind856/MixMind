import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Clock, CheckCircle, XCircle, ArrowLeft } from "lucide-react";

export default function DJWaitingApproval() {
  const navigate = useNavigate();
  const { venueId } = useParams();
  const [venue, setVenue] = useState(null);
  const [status, setStatus] = useState("pending"); // pending, approved, rejected
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const checkApprovalStatus = async () => {
      try {
        const token = localStorage.getItem("djToken");
        
        // Get access status
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/dj/access-status`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (!response.ok) throw new Error("Failed to fetch status");

        const accessRequests = await response.json();
        // Handle both array and organized object responses
        const requestsList = Array.isArray(accessRequests) 
          ? accessRequests 
          : accessRequests.all || [];
        const currentRequest = requestsList.find(req => req.venueId._id === venueId);

        if (currentRequest) {
          setVenue(currentRequest.venueId);
          setStatus(currentRequest.status);

          if (currentRequest.status === "approved" && currentRequest.currentlyActive) {
            // For DJ user account DJs, redirect to their dashboard instead of the old venue DJ panel
            // The DJ dashboard will fetch requests for this approved venue
            setTimeout(() => {
              navigate(`/dj/dashboard/${venueId}`);
            }, 2000);
          } else if (currentRequest.status === "rejected") {
            setMessage(currentRequest.rejectionReason || "Your request was rejected");
          }
        }

        setLoading(false);
      } catch (err) {
        console.error("Error checking status:", err);
        setLoading(false);
      }
    };

    // Initial check
    checkApprovalStatus();

    // Poll every 3 seconds
    const interval = setInterval(checkApprovalStatus, 3000);

    return () => clearInterval(interval);
  }, [venueId, navigate]);

  const handleGoBack = () => {
    navigate("/dj/select-venue");
  };

  return (
    <div className="min-h-screen bg-[#07070B] text-white flex items-center justify-center px-4">
      <style>{`
        :root {
          --bg-deep: #07070B;
          --surface: #121222;
          --border: rgba(255,255,255,0.08);
          --text-primary: #FFFFFF;
          --text-secondary: rgba(255,255,255,0.72);
          --neon-purple: #A855F7;
          --electric-violet: #7C3AED;
          --revenue-green: #22E3A1;
        }

        .glass-card {
          background: linear-gradient(135deg, rgba(18,18,34,0.92) 0%, rgba(18,18,34,0.55) 100%);
          backdrop-filter: blur(24px);
          border: 1px solid var(--border);
          box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);
        }

        @keyframes pulse-ring {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        .pulse-ring {
          animation: pulse-ring 2s infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .spinner {
          animation: spin 3s linear infinite;
        }
      `}</style>

      <div className="w-full max-w-md">
        <div className="glass-card rounded-2xl p-8 text-center">
          {/* Status Icon */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            {status === "pending" && (
              <>
                <div
                  className="absolute inset-0 rounded-full spinner"
                  style={{
                    border: "4px solid transparent",
                    borderTopColor: "#A855F7",
                    borderRightColor: "#22E3A1"
                  }}
                />
                <Clock size={48} className="absolute inset-0 m-auto" style={{ color: "#A855F7" }} />
              </>
            )}

            {status === "approved" && (
              <div className="animate-bounce">
                <CheckCircle size={48} style={{ color: "#22E3A1" }} />
              </div>
            )}

            {status === "rejected" && (
              <XCircle size={48} style={{ color: "#EF4444" }} />
            )}
          </div>

          {/* Venue Info */}
          {venue && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">{venue.name}</h2>
              <p style={{ color: "rgba(255,255,255,0.72)" }}>
                {venue.city}, {venue.state}
              </p>
            </div>
          )}

          {/* Status Message */}
          {status === "pending" && (
            <>
              <h3 className="text-xl font-bold mb-2">Waiting for Approval</h3>
              <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.72)" }}>
                We're waiting for the venue manager to approve your request.
                This may take a few moments.
              </p>
              <div className="p-4 rounded-lg mb-6" style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)" }}>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                  Checking status every 3 seconds...
                </p>
              </div>
            </>
          )}

          {status === "approved" && (
            <>
              <h3 className="text-xl font-bold mb-2" style={{ color: "#22E3A1" }}>
                🎉 Approved!
              </h3>
              <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.72)" }}>
                Your request has been approved! Redirecting to DJ panel...
              </p>
            </>
          )}

          {status === "rejected" && (
            <>
              <h3 className="text-xl font-bold mb-2" style={{ color: "#EF4444" }}>
                Request Rejected
              </h3>
              <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.72)" }}>
                {message || "Your request was rejected by the venue."}
              </p>
            </>
          )}

          {/* Back Button */}
          <button
            onClick={handleGoBack}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold transition-all"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}
          >
            <ArrowLeft size={18} />
            Back to Venues
          </button>

          {/* Loading indicator */}
          {loading && (
            <p className="text-xs mt-4" style={{ color: "rgba(255,255,255,0.5)" }}>
              Loading...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
