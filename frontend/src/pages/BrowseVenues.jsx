import React, { useEffect, useState } from "react";

const BrowseVenues = () => {
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState("");
  const [song, setSong] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔥 Fetch venues directly from backend
  useEffect(() => {
    const fetchVenues = async () => {
      try {
        setLoading(true);

        const res = await fetch(
          "https://api-production-be9c0.up.railway.app/api/venue/active-venues"
        );

        const data = await res.json();

        console.log("VENUES FROM API:", data);

        setVenues(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("❌ Error fetching venues:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, []);

  // 🔥 Submit song request
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedVenue || !song) {
      alert("Please select a venue and enter a song");
      return;
    }

    try {
      const res = await fetch(
        "https://api-production-be9c0.up.railway.app/api/requests",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            venueId: selectedVenue,
            songName: song,
          }),
        }
      );

      const data = await res.json();

      console.log("REQUEST RESPONSE:", data);

      alert("Song requested successfully!");
      setSong("");
    } catch (err) {
      console.error("❌ Request failed:", err);
      alert("Failed to send request");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Request a Song</h2>

      {loading ? (
        <p>Loading venues...</p>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Venue Dropdown */}
          <select
            value={selectedVenue}
            onChange={(e) => setSelectedVenue(e.target.value)}
          >
            <option value="">Select Venue</option>

            {venues.map((venue) => (
              <option key={venue._id} value={venue._id}>
                {venue.name}
              </option>
            ))}
          </select>

          <br />
          <br />

          {/* Song Input */}
          <input
            type="text"
            placeholder="Enter song name"
            value={song}
            onChange={(e) => setSong(e.target.value)}
          />

          <br />
          <br />

          <button type="submit">Request Song</button>
        </form>
      )}
    </div>
  );
};

export default BrowseVenues;
