import React, { useEffect, useState } from "react";

const BrowseVenues = () => {
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState("");
  const [song, setSong] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        setLoading(true);

        const res = await fetch(
          "https://api-production-be9c0.up.railway.app/api/venue/active-venues"
        );

        const data = await res.json();

        console.log("VENUES FROM API:", data);

        // ✅ SAFE CHECK
        if (Array.isArray(data)) {
          setVenues(data);
        } else {
          console.error("❌ Data is not array:", data);
          setVenues([]);
        }
      } catch (err) {
        console.error("❌ Error fetching venues:", err);
        setVenues([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedVenue || !song) {
      alert("Select venue + enter song");
      return;
    }

    try {
      await fetch(
        "https://api-production-be9c0.up.railway.app/api/requests",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            venueId: selectedVenue,
            songName: song,
          }),
        }
      );

      alert("Request sent!");
      setSong("");
    } catch (err) {
      console.error(err);
      alert("Request failed");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Request a Song</h2>

      {loading && <p>Loading venues...</p>}

      <form onSubmit={handleSubmit}>
        <select
          value={selectedVenue}
          onChange={(e) => setSelectedVenue(e.target.value)}
        >
          <option value="">Select Venue</option>

          {/* ✅ SAFE MAP */}
          {Array.isArray(venues) &&
            venues.map((venue) => {
              if (!venue || !venue._id) return null;

              return (
                <option key={venue._id} value={venue._id}>
                  {venue.name || "Unnamed Venue"}
                </option>
              );
            })}
        </select>

        <br />
        <br />

        <input
          type="text"
          placeholder="Enter song"
          value={song}
          onChange={(e) => setSong(e.target.value)}
        />

        <br />
        <br />

        <button type="submit">Request Song</button>
      </form>
    </div>
  );
};

export default BrowseVenues;
