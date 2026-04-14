/**
 * Revenue Service
 * Handles all revenue-related API calls
 */

import { API_CONFIG, HEADERS } from "./apiConfig";

const revenueService = {
  /**
   * Get complete revenue breakdown for a venue
   * @param {string} venueId - Venue ID
   * @param {string} adminKey - Admin authentication key
   * @returns {Promise<Object>} - Revenue data with breakdown
   */
  getVenueRevenue: async (venueId, adminKey) => {
    try {
      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REVENUE}/venue/${venueId}`;
      const response = await fetch(url, {
        method: "GET",
        headers: HEADERS.WITH_ADMIN_KEY(adminKey)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch revenue: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("❌ Revenue Service Error:", error);
      throw error;
    }
  },

  /**
   * Get revenue summary (quick stats)
   * @param {string} venueId - Venue ID
   * @param {string} adminKey - Admin authentication key
   * @returns {Promise<Object>} - Revenue summary statistics
   */
  getRevenueSummary: async (venueId, adminKey) => {
    try {
      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REVENUE}/venue/${venueId}/summary`;
      const response = await fetch(url, {
        method: "GET",
        headers: HEADERS.WITH_ADMIN_KEY(adminKey)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch revenue summary: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("❌ Revenue Summary Error:", error);
      throw error;
    }
  }
};

export default revenueService;
