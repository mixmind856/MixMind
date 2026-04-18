import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { venueService } from "../services";
import { CheckCircle, ArrowRight } from "lucide-react";
import "./BrowseVenues.css";
import logo from "../assets/Mixmind.jpeg";

/**
 * Browse Venues Page
 * Customers can select a venue from a dropdown to access that venue's request page
 */
export default function BrowseVenues() {
  const navigate = useNavigate();
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      setLoading(true);
      const data = await venueService.getActiveVenues();
      setVenues(data || []);
      setError(null);
    } catch (err) {
      console.error("❌ Error fetching venues:", err.message);
      setError("Failed to load venues. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleVenueSelect = () => {
    if (!selectedVenue) {
      setError("Please select a venue");
      return;
    }
    navigate(`/venue-request/${selectedVenue}`);
  };

  return (
    <div className="browse-venues-wrapper">
      <div className="browse-venues-container">
        <section className="browse-venues-section">
          <div className="browse-venues-content">
            {/* TOP HEADING SECTION */}
            <div className="browse-venues-heading">
              <div className="inline-flex items-center justify-center w-18 h-18 rounded-lg mb-4 glow-purple" 
                             style={{ background: "linear-gradient(135deg, #A855F7, #7C3AED)" }}>
                         <img src={logo} alt="MixMind Logo" className="w-17 h-17" />
                        </div>
              <h1 className="browse-venues-title">🎧 Control the Music Tonight</h1>
              <p className="browse-venues-subtitle">Request your song in seconds</p>
            </div>

            {loading ? (
              <div className="browse-venues-loading">
                <div className="spinner"></div>
                <p>Loading venues...</p>
              </div>
            ) : venues.length === 0 ? (
              <div className="browse-venues-empty">
                <p>😞 No active venues available at the moment</p>
                <p>Please try again later</p>
              </div>
            ) : (
              <>
                {/* HOW IT WORKS CARD */}
                <div className="browse-venues-card glass-card">
                  <h3 className="card-title">How it works</h3>
                  <div className="steps-container">
                    {/* Step 1 */}
                    <div className="step-item">
                      <div className="step-number">1</div>
                      <div className="step-content">
                        <h4>Choose your venue</h4>
                        <p>Select from available venues nearby</p>
                      </div>
                    </div>
                    {/* Step 2 */}
                    <div className="step-item">
                      <div className="step-number">2</div>
                      <div className="step-content">
                        <h4>Search your song</h4>
                        <p>Find and request any track you want to hear</p>
                      </div>
                    </div>
                    {/* Step 3 */}
                    <div className="step-item">
                      <div className="step-number">3</div>
                      <div className="step-content">
                        <h4>Boost it (optional)</h4>
                        <p>Pay extra to play it sooner in the queue</p>
                      </div>
                    </div>
                    {/* Step 4 */}
                    <div className="step-item">
                      <div className="step-number">4</div>
                      <div className="step-content">
                        <h4>Enjoy the moment</h4>
                        <p>Your song plays in ~5–10 mins if approved</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* TRUST SECTION */}
                <div className="trust-section">
                  <div className="trust-item">
                    <CheckCircle size={16} className="trust-icon" />
                    <span>Only pay if your song is accepted</span>
                  </div>
                  <div className="trust-item">
                    <CheckCircle size={16} className="trust-icon" />
                    <span>Songs are accepted/rejected according to venue's music policy</span>
                  </div>
                  <div className="trust-item">
                    <CheckCircle size={16} className="trust-icon" />
                    <span>Keep an eye on your email for updates 👀</span>
                  </div>
                </div>

                {/* ERROR MESSAGE */}
                {error && <div className="error-message">⚠️ {error}</div>}

                {/* ACTION SECTION */}
                <div className="action-section">
                  {/* Dropdown */}
                  <div className="select-group">
                    <label className="select-label">Select your venue</label>
                    <select
                      className="app-select"
                      value={selectedVenue}
                      onChange={(e) => {
                        setSelectedVenue(e.target.value);
                        setError(null);
                      }}
                    >
                      <option value="">Choose a venue...</option>
                      {venues.map((venue) => (
                        <option key={venue._id} value={venue._id}>
                          {venue.name}
                          {venue.city && ` - ${venue.city}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selected Venue Details */}
                  {selectedVenue && (
                    <div className="venue-details-display">
                      {venues
                        .filter((v) => v._id === selectedVenue)
                        .map((venue) => (
                          <div key={venue._id} className="venue-detail-card">
                            <h4>{venue.name}</h4>
                            {venue.description && (
                              <p className="venue-description">{venue.description}</p>
                            )}
                            <div className="venue-meta">
                              {venue.city && (
                                <span>📍 {venue.city}, {venue.state}</span>
                              )}
                              {venue.phone && (
                                <span>📞 {venue.phone}</span>
                              )}
                              {venue.websiteUrl && (
                                <span>
                                  <a
                                    href={venue.websiteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    🌐 Website
                                  </a>
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Continue Button */}
                  <button
                    onClick={handleVenueSelect}
                    disabled={!selectedVenue}
                    className="glow-button continue-btn"
                  >
                    Continue <ArrowRight size={20} />
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* FOOTER */}
        <div className="browse-venues-footer">
          <p>© 2026 MixMind. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
