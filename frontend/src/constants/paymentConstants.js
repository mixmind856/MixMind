/**
 * Payment Status Constants
 */

export const PAYMENT_STATUS = {
  PENDING: "pending",
  AUTHORIZED: "authorized",
  CAPTURED: "captured",
  CANCELLED: "cancelled",
  FAILED: "failed"
};

/**
 * Request Status Constants
 */
export const REQUEST_STATUS = {
  PENDING: "pending",
  AUTHORIZED: "authorized",
  PROCESSING: "processing",
  APPROVED: "approved",
  REJECTED: "rejected",
  COMPLETED: "completed",
  FAILED: "failed"
};

/**
 * Status Display Configuration
 * Maps internal status to display colors and labels
 */
export const STATUS_DISPLAY = {
  [PAYMENT_STATUS.PENDING]: { color: "#3b82f6", label: "Pending", icon: "⏳" },
  [PAYMENT_STATUS.AUTHORIZED]: { color: "#f59e0b", label: "Authorized", icon: "✓" },
  [PAYMENT_STATUS.CAPTURED]: { color: "#10b981", label: "Captured", icon: "✅" },
  [PAYMENT_STATUS.CANCELLED]: { color: "#6b7280", label: "Cancelled", icon: "✗" },
  [PAYMENT_STATUS.FAILED]: { color: "#ef4444", label: "Failed", icon: "❌" }
};

/**
 * Currency Configuration
 */
export const CURRENCY = {
  CODE: "USD",
  SYMBOL: "$",
  LOCALE: "en-US"
};

/**
 * API Error Messages
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Network error. Please check your connection.",
  INVALID_CREDENTIALS: "Invalid admin credentials.",
  UNAUTHORIZED: "You are not authorized to perform this action.",
  SERVER_ERROR: "Server error. Please try again later.",
  REQUEST_NOT_FOUND: "Request not found.",
  VENUE_NOT_FOUND: "Venue not found."
};

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  APPROVAL_SUCCESS: "Request approved successfully",
  REJECTION_SUCCESS: "Request rejected successfully",
  LOGIN_SUCCESS: "Logged in successfully",
  LOGOUT_SUCCESS: "Logged out successfully"
};

export default {
  PAYMENT_STATUS,
  REQUEST_STATUS,
  STATUS_DISPLAY,
  CURRENCY,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
};
