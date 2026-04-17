import React, { useEffect } from "react";

const BrowseVenues = () => {
  useEffect(() => {
    console.log("BROWSE VENUES TEST PAGE LOADED");

    fetch("https://api-production-be9c0.up.railway.app/api/venue/active-venues")
      .then((res) => res.json())
      .then((data) => {
        console.log("ACTIVE VENUES TEST:", data);
      })
      .catch((err) => {
        console.error("ACTIVE VENUES TEST ERROR:", err);
      });
  }, []);

  return (
    <div style={{ padding: "30px", color: "red", fontSize: "28px" }}>
      BROWSE VENUES TEST PAGE
    </div>
  );
};

export default BrowseVenues;
