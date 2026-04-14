import { API_BASE_URL, ADMIN_KEY } from "./apiConfig";

/**
 * Get comprehensive dashboard summary
 */
export const getDashboardSummary = async () => {
  try {
    if (!ADMIN_KEY) {
      throw new Error("Admin key not configured. Please check your .env file.");
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/dashboard/summary`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": ADMIN_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    throw error;
  }
};

/**
 * Get all venues with their stats
 */
export const getAllVenuesStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/venues/stats`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": ADMIN_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching venues stats:", error);
    throw error;
  }
};

/**
 * Get revenue breakdown by venue
 */
export const getRevenueBreakdown = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/revenue/breakdown`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": ADMIN_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching revenue breakdown:", error);
    throw error;
  }
};

/**
 * Get song request details
 */
export const getSongRequestDetails = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/requests/details/all`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": ADMIN_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching song request details:", error);
    throw error;
  }
};

/**
 * Get top performing venues
 */
export const getTopVenues = async (limit = 10) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/admin/venues/top?limit=${limit}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": ADMIN_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching top venues:", error);
    throw error;
  }
};
