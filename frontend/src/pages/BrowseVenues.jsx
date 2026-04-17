import React, { useEffect } from "react";

const BrowseVenues = () => {
  useEffect(() => {
    console.log("PAGE LOADED");

    fetch("https://api-production-be9c0.up.railway.app/api/venue/active-venues")
      .then(res => res.json())
      .then(data => {
        console.log("FETCH SUCCESS:", data);
      })
      .catch(err => {
        console.error("FETCH ERROR:", err);
      });

  }, []);

  return <h1 style={{color: "red"}}>TEST PAGE</h1>;
};

export default BrowseVenues;
