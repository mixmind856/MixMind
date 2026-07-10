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

/**
 * Venue money & request stats (database-only, London date ranges)
 */
export const getMoneyVenues = async (queryString = "") => {
  try {
    const adminKey = requireAdminKey();
    const qs =
      queryString && queryString.startsWith("?")
        ? queryString
        : queryString
          ? `?${queryString}`
          : "";
    const response = await fetch(`${API_BASE_URL}/admin/money/venues${qs}`, {
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
    console.error("Error fetching money venues:", error);
    throw error;
  }
};

/**
 * Per-venue money deep dive + export rows
 */
export const getMoneyVenue = async (venueId, queryString = "") => {
  try {
    const adminKey = requireAdminKey();
    const qs =
      queryString && queryString.startsWith("?")
        ? queryString
        : queryString
          ? `?${queryString}`
          : "";
    const response = await fetch(
      `${API_BASE_URL}/admin/money/venue/${encodeURIComponent(venueId)}${qs}`,
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
    console.error("Error fetching money venue:", error);
    throw error;
  }
};

export const updateVenuePricing = async (venueId, prices) => {
  try {
    const adminKey = requireAdminKey();

    const response = await fetch(
      `${API_BASE_URL}/admin/venues/${encodeURIComponent(venueId)}/pricing`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify(prices),
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating venue pricing:", error);
    throw error;
  }
};

export const getAnalyticsVenue = async (venueId, queryString = "") => {
  try {
    const adminKey = requireAdminKey();
    const qs =
      queryString && queryString.startsWith("?")
        ? queryString
        : queryString
          ? `?${queryString}`
          : "";
    const response = await fetch(
      `${API_BASE_URL}/admin/analytics/venue/${encodeURIComponent(venueId)}${qs}`,
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
    console.error("Error fetching venue analytics:", error);
    throw error;
  }
};

export const getPlatformPowers = async () => {
  const adminKey = requireAdminKey();
  const response = await fetch(`${API_BASE_URL}/admin/powers`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
    },
  });
  if (!response.ok) {
    throw new Error(`Error: ${response.statusText}`);
  }
  return response.json();
};

export const updatePlatformPowers = async (globalPricing) => {
  const adminKey = requireAdminKey();
  const response = await fetch(`${API_BASE_URL}/admin/powers`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
    },
    body: JSON.stringify(globalPricing),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Error: ${response.statusText}`);
  }
  return response.json();
};

export const setVenueUseGlobalPricing = async (venueId, useGlobalPricing) => {
  const adminKey = requireAdminKey();
  const response = await fetch(
    `${API_BASE_URL}/admin/venues/${encodeURIComponent(venueId)}/use-global-pricing`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
      },
      body: JSON.stringify({ useGlobalPricing }),
    }
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Error: ${response.statusText}`);
  }
  return response.json();
};

export const setVenueActive = async (venueId, active) => {
  const adminKey = requireAdminKey();
  const response = await fetch(
    `${API_BASE_URL}/admin/venues/${encodeURIComponent(venueId)}/active`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
      },
      body: JSON.stringify({ active }),
    }
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Error: ${response.statusText}`);
  }
  return response.json();
};

export const downloadVenuePayoutInvoice = async (venueId, queryString = "") => {
  const adminKey = requireAdminKey();
  const qs =
    queryString && queryString.startsWith("?")
      ? queryString
      : queryString
        ? `?${queryString}`
        : "";
  const response = await fetch(
    `${API_BASE_URL}/admin/payout-invoice/${encodeURIComponent(venueId)}${qs}`,
    {
      method: "GET",
      headers: {
        "x-admin-key": adminKey,
      },
    }
  );
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Error: ${response.statusText}`);
  }
  return response.blob();
};

export const getVenuesSpotifyDeviceStatus = async (venueIds) => {
  const adminKey = requireAdminKey();
  const response = await fetch(`${API_BASE_URL}/admin/venues/spotify-device-status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
    },
    body: JSON.stringify({ venueIds }),
  });
  if (!response.ok) {
    throw new Error(`Error: ${response.statusText}`);
  }
  return response.json();
};
