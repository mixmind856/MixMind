import React, { useEffect, useState } from "react";

const BrowseVenues = () => {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const res = await fetch(
          "https://api-production-be9c0.up.railway.app/api/venue/active-venues"
        );

        const data = await res.json();

        console.log("VENUES FROM API:", data);

        if (Array.isArray(data)) {
          setVenues(data);
        } else {
          setVenues([]);
          setError("Response was not an array");
        }
      } catch (err) {
        console.error("FETCH ERROR:", err);
        setError("Failed to fetch venues");
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1 style={{ color: "red" }}>BROWSE VENUES LIVE TEST</h1>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      <pre style={{ whiteSpace: "pre-wrap", fontSize: "12px" }}>
        {JSON.stringify(venues, null, 2)}
      </pre>

      <select>
        <option value="">Select Venue</option>
        {Array.isArray(venues) &&
          venues.map((venue) => (
            <option key={venue._id} value={venue._id}>
              {venue.name}
            </option>
          ))}
      </select>
    </div>
  );
};

export default BrowseVenues;
