/**
 * useAdminAuth Hook
 * Custom hook for managing admin authentication (admin key)
 * Handles credential storage and validation
 */

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "adminCredentials";
const STORAGE_KEYS = {
  ADMIN_KEY: "adminKey",
  VENUE_ID: "venueId"
};

const useAdminAuth = () => {
  const [adminKey, setAdminKey] = useState("");
  const [venueId, setVenueId] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  /**
   * Load credentials from localStorage on mount
   */
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { adminKey: savedKey, venueId: savedVenue } = JSON.parse(saved);
        setAdminKey(savedKey || "");
        setVenueId(savedVenue || "");
        setIsAuthenticated(!!(savedKey && savedVenue));
      } catch (err) {
        console.error("❌ Failed to load credentials:", err);
      }
    }
  }, []);

  /**
   * Login with admin credentials
   */
  const login = useCallback((key, venue) => {
    if (!key || !venue) {
      return { success: false, error: "Admin key and venue ID are required" };
    }

    setAdminKey(key);
    setVenueId(venue);
    setIsAuthenticated(true);

    // Save to localStorage
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ adminKey: key, venueId: venue })
    );

    return { success: true };
  }, []);

  /**
   * Logout and clear credentials
   */
  const logout = useCallback(() => {
    setAdminKey("");
    setVenueId("");
    setIsAuthenticated(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  /**
   * Update admin key
   */
  const updateAdminKey = useCallback((key) => {
    if (key && venueId) {
      setAdminKey(key);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ adminKey: key, venueId })
      );
    }
  }, [venueId]);

  /**
   * Update venue ID
   */
  const updateVenueId = useCallback((venue) => {
    if (venue && adminKey) {
      setVenueId(venue);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ adminKey, venueId: venue })
      );
    }
  }, [adminKey]);

  return {
    adminKey,
    venueId,
    isAuthenticated,
    login,
    logout,
    updateAdminKey,
    updateVenueId
  };
};

export default useAdminAuth;
