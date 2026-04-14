/**
 * API Configuration
 * Centralized API base URL and default settings
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || "";

const API_CONFIG = {
  API_BASE_URL,
  ADMIN_KEY,
  BASE_URL: API_BASE_URL,
  ENDPOINTS: {
    // Admin endpoints
    REQUESTS: "/admin/requests",
    REVENUE: "/admin/revenue",
    PAYMENTS: "/admin/payments",
    LIVE_PLAYLIST: "/admin/live-playlist",

    // Venue endpoints
    VENUE_SIGNIN: "/venue/signin",
    VENUE_SIGNUP: "/venue/signup",
    VENUE_REQUESTS: "/venue/requests",
    VENUE_DASHBOARD: "/venue/dashboard",

    // Payment endpoints
    CREATE_PAYMENT_INTENT: "/stripe/create-payment-intent",
    PAYMENT_INTENTS: "/stripe/payment-intents"
  },
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3
};

const HTTP_METHODS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
  PATCH: "PATCH"
};

const HEADERS = {
  DEFAULT: {
    "Content-Type": "application/json"
  },
  WITH_AUTH: (token) => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  }),
  WITH_ADMIN_KEY: (adminKey) => ({
    "Content-Type": "application/json",
    "x-admin-key": adminKey
  })
};

export {
  API_BASE_URL,
  ADMIN_KEY,
  API_CONFIG,
  HTTP_METHODS,
  HEADERS
};
