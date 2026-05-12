import { API_BASE_URL } from "./apiConfig";

function getStoredAdminKey() {
  if (typeof localStorage === "undefined") return null;
  const k = localStorage.getItem("adminKey");
  return k?.trim() || null;
}

function requireAdminKey() {
  const key = getStoredAdminKey();
  if (!key) {
    throw new Error("Admin key required");
  }
  return key;
}

/**
 * Get comprehensive dashboard summary
 */
export const getDashboardSummary = async () => {
  try {
    const adminKey = requireAdminKey();

    const response = await fetch(`${API_BASE_URL}/admin/dashboard/summary`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
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
    const adminKey = requireAdminKey();

    const response = await fetch(`${API_BASE_URL}/admin/venues/stats`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
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
    const adminKey = requireAdminKey();

    const response = await fetch(`${API_BASE_URL}/admin/revenue/breakdown`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
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
    const adminKey = requireAdminKey();

    const response = await fetch(`${API_BASE_URL}/admin/requests/details/all`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
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
    const adminKey = requireAdminKey();

    const response = await fetch(
      `${API_BASE_URL}/admin/venues/top?limit=${limit}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
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

/**
 * QR landing & funnel analytics (defaults to today, Europe/London on server)
 */
export const getAnalyticsFunnel = async (queryString = "") => {
  try {
    const adminKey = requireAdminKey();

    const qs = queryString && queryString.startsWith("?") ? queryString : queryString ? `?${queryString}` : "";
    const response = await fetch(`${API_BASE_URL}/admin/analytics/funnel${qs}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey
      }
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching analytics funnel:", error);
    throw error;
  }
};
