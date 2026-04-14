/**
 * useRevenue Hook
 * Custom hook for managing venue revenue data and operations
 * Handles fetching, loading, error states
 */

import { useState, useEffect, useCallback } from "react";
import revenueService from "../services/revenueService";

const useRevenue = (venueId, adminKey) => {
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Fetch revenue data from API
   */
  const fetchRevenue = useCallback(async () => {
    if (!venueId || !adminKey) return;

    try {
      setLoading(true);
      setError(null);
      const data = await revenueService.getVenueRevenue(venueId, adminKey);
      setRevenue(data);
    } catch (err) {
      console.error("❌ Fetch Revenue Error:", err);
      setError(err.message || "Failed to fetch revenue");
    } finally {
      setLoading(false);
    }
  }, [venueId, adminKey]);

  /**
   * Auto-fetch on mount and when dependencies change
   */
  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  /**
   * Manually refresh revenue data
   */
  const refreshRevenue = useCallback(async () => {
    await fetchRevenue();
  }, [fetchRevenue]);

  return {
    revenue,
    loading,
    error,
    refreshRevenue,
    isEmpty: !revenue || (revenue.totalRevenue === 0 && !revenue.payments?.captured?.count)
  };
};

export default useRevenue;
