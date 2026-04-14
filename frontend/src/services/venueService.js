/**
 * Venue Service
 * Handles all venue-related API calls
 */

import { API_CONFIG } from "./apiConfig";

/**
 * Get all active venues
 */
export async function getActiveVenues() {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/venue/active-venues`);
    if (!response.ok) throw new Error("Failed to fetch venues");
    return await response.json();
  } catch (error) {
    console.error("❌ Get Active Venues Error:", error.message);
    throw error;
  }
}

/**
 * Get venue by ID
 */
export async function getVenueById(venueId) {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/venue/${venueId}`);
    if (!response.ok) throw new Error("Failed to fetch venue");
    return await response.json();
  } catch (error) {
    console.error("❌ Get Venue Error:", error.message);
    throw error;
  }
}

/**
 * Toggle venue active status (admin)
 */
export async function toggleVenueStatus(venueId, adminKey) {
  try {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}/api/venue/${venueId}/toggle-status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey
        }
      }
    );
    if (!response.ok) throw new Error("Failed to toggle venue status");
    return await response.json();
  } catch (error) {
    console.error("❌ Toggle Venue Status Error:", error.message);
    throw error;
  }
}

/**
 * Update venue profile (venue owner)
 */
export async function updateVenueProfile(venueId, updates, venueToken) {
  try {
    const response = await fetch(
      `${API_CONFIG.BASE_URL}/api/venue/${venueId}/profile`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${venueToken}`
        },
        body: JSON.stringify(updates)
      }
    );
    if (!response.ok) throw new Error("Failed to update venue profile");
    return await response.json();
  } catch (error) {
    console.error("❌ Update Venue Profile Error:", error.message);
    throw error;
  }
}
