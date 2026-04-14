/**
 * Request Service
 * Handles all request-related API calls
 */

import { API_CONFIG, HEADERS } from "./apiConfig";

const requestService = {
  /**
   * List all requests
   * @param {Object} filters - Filter criteria (status, venueId)
   * @param {string} adminKey - Admin authentication key
   * @returns {Promise<Array>} - List of requests
   */
  listRequests: async (filters = {}, adminKey) => {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REQUESTS}${
        queryParams ? `?${queryParams}` : ""
      }`;

      const response = await fetch(url, {
        method: "GET",
        headers: HEADERS.WITH_ADMIN_KEY(adminKey)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch requests: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("❌ Request Service Error:", error);
      throw error;
    }
  },

  /**
   * List requests for a specific venue
   * @param {string} venueId - Venue ID
   * @param {Object} filters - Filter criteria (status)
   * @param {string} adminKey - Admin authentication key
   * @returns {Promise<Array>} - List of venue requests
   */
  listVenueRequests: async (venueId, filters = {}, adminKey) => {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REQUESTS}/venue/${venueId}${
        queryParams ? `?${queryParams}` : ""
      }`;

      const response = await fetch(url, {
        method: "GET",
        headers: HEADERS.WITH_ADMIN_KEY(adminKey)
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch venue requests: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("❌ Venue Request Service Error:", error);
      throw error;
    }
  },

  /**
   * Approve a request
   * @param {string} requestId - Request ID to approve
   * @param {string} adminKey - Admin authentication key
   * @returns {Promise<Object>} - Approval result
   */
  approveRequest: async (requestId, adminKey) => {
    try {
      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REQUESTS}/${requestId}/approve`;

      const response = await fetch(url, {
        method: "POST",
        headers: HEADERS.WITH_ADMIN_KEY(adminKey)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to approve request");
      }

      return await response.json();
    } catch (error) {
      console.error("❌ Approve Request Error:", error);
      throw error;
    }
  },

  /**
   * Reject a request
   * @param {string} requestId - Request ID to reject
   * @param {string} reason - Rejection reason
   * @param {string} adminKey - Admin authentication key
   * @returns {Promise<Object>} - Rejection result
   */
  rejectRequest: async (requestId, reason, adminKey) => {
    try {
      const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REQUESTS}/${requestId}/reject`;

      const response = await fetch(url, {
        method: "POST",
        headers: HEADERS.WITH_ADMIN_KEY(adminKey),
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to reject request");
      }

      return await response.json();
    } catch (error) {
      console.error("❌ Reject Request Error:", error);
      throw error;
    }
  }
};

export default requestService;
