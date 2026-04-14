import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Building2, ArrowRight, Loader } from "lucide-react";

export default function DJVenueSelection() {
  const navigate = useNavigate();
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchVenuesWithDJMode();
  }, []);

  const fetchVenuesWithDJMode = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/dj/venues-with-dj-mode`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch venues");
      }

      const data = await response.json();
      setVenues(data.venues || []);
    } catch (err) {
      setError(err.message || "Failed to load venues");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedVenue) {
      setError("Please select a venue");
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem("djToken");

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/dj/request-access`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ venueId: selectedVenue._id })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Handle DJ account requirement
        if (data.requiresDJAccount) {
          setError("Please sign up or log in with your DJ account to request venue access. Venue password login is for existing venue DJs only.");
          setSubmitting(false);
          // Optionally redirect to signup/login after a delay
          setTimeout(() => {
            localStorage.clear();
            window.location.href = "/dj/auth";
          }, 3000);
          return;
        }
        
        setError(data.error || data.message || "Failed to request access");
        setSubmitting(false);
        return;
      }

      // Redirect to waiting screen
      navigate(`/dj/waiting-approval/${selectedVenue._id}`);
    } catch (err) {
      setError(err.message || "An error occurred");
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("djToken");
    localStorage.removeItem("djInfo");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#07070B] text-white px-4 py-8">
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
          transition: all 0.3s ease;
        }

        .glass-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(168,85,247,0.2);
          border-color: rgba(168,85,247,0.4);
        }

        .venue-card {
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .venue-card.selected {
          border-color: #A855F7 !important;
          background: linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(168,85,247,0.05) 100%) !important;
        }

        .glow-button {
          background: linear-gradient(135deg, var(--neon-purple) 0%, var(--electric-violet) 100%);
          box-shadow: 0 8px 50px rgba(168,85,247,0.6), 0 0 80px rgba(168,85,247,0.3), 0 4px 20px rgba(0,0,0,0.3);
          transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1);
        }

        .glow-button:hover:not(:disabled) {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 12px 60px rgba(168,85,247,0.55), 0 0 100px rgba(168,85,247,0.3), 0 8px 30px rgba(0,0,0,0.4);
        }

        .glow-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Select a Venue</h1>
            <p style={{ color: "rgba(255,255,255,0.72)" }}>Choose a venue with DJ Mode enabled</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-2 rounded-lg font-medium transition-all"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}
          >
            Logout
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <p className="text-sm" style={{ color: "#FCA5A5" }}>{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin mr-2" />
            <span>Loading venues...</span>
          </div>
        ) : venues.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Building2 size={48} className="mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-bold mb-2">No Venues Available</h2>
            <p style={{ color: "rgba(255,255,255,0.72)" }}>
              No venues have DJ Mode enabled at the moment. Please try again later.
            </p>
          </div>
        ) : (
          <>
            {/* Venues Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {venues.map((venue) => (
                <div
                  key={venue._id}
                  onClick={() => setSelectedVenue(venue)}
                  className={`glass-card venue-card rounded-xl p-6 border-2 ${
                    selectedVenue?._id === venue._id ? "selected" : ""
                  }`}
                  style={{
                    borderColor: selectedVenue?._id === venue._id ? "#A855F7" : "rgba(255,255,255,0.08)",
                    background: selectedVenue?._id === venue._id 
                      ? "linear-gradient(135deg, rgba(168,85,247,0.15) 0%, rgba(168,85,247,0.05) 100%)"
                      : "linear-gradient(135deg, rgba(18,18,34,0.92) 0%, rgba(18,18,34,0.55) 100%)"
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-bold">{venue.name}</h3>
                    {selectedVenue?._id === venue._id && (
                      <div
                        className="w-5 h-5 rounded-full"
                        style={{
                          background: "#A855F7",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: "12px"
                        }}
                      >
                        ✓
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.72)" }}>
                      <MapPin size={16} />
                      <span>{venue.city}, {venue.state}</span>
                    </div>
                  </div>

                  {venue.description && (
                    <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.6)" }}>
                      {venue.description}
                    </p>
                  )}

                  <div className="pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                      {venue.currentDJ ? `Current DJ: ${venue.currentDJ}` : "No DJ currently"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => navigate("/")}
                className="flex-1 px-6 py-3 rounded-lg font-bold transition-all"
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}
              >
                Back
              </button>
              <button
                onClick={handleContinue}
                disabled={!selectedVenue || submitting}
                className="flex-1 glow-button text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Requesting...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
