/**
 * Payment Constants
 * Centralized constants for payment-related operations
 */

const PAYMENT_STATUS = {
  PENDING: "pending",
  AUTHORIZED: "authorized",
  CAPTURED: "captured",
  CANCELLED: "cancelled",
  FAILED: "failed"
};

const REQUEST_STATUS = {
  PENDING: "pending",
  AUTHORIZED: "authorized",
  PROCESSING: "processing",
  APPROVED: "approved",
  REJECTED: "rejected",
  COMPLETED: "completed",
  FAILED: "failed"
};

const PAYMENT_LIFECYCLE = {
  INIT: "Payment initialized",
  AUTHORIZED: "Payment authorized - funds held",
  CAPTURED: "Payment captured - revenue added",
  CANCELLED: "Payment cancelled - funds released",
  FAILED: "Payment failed"
};

const STRIPE_CONFIG = {
  DEMO_MODE: process.env.DEMO_MODE === "true" || !process.env.STRIPE_SECRET_KEY,
  API_VERSION: "2024-04-10"
};

const ERROR_MESSAGES = {
  REQUEST_NOT_FOUND: "Request not found",
  PAYMENT_NOT_FOUND: "Payment not found",
  VENUE_NOT_FOUND: "Venue not found",
  INVALID_PAYMENT_STATUS: "Invalid payment status for this operation",
  REQUEST_NOT_AUTHORIZED: "Request not authorized yet",
  NO_PAYMENT_INTENT: "No payment intent found",
  CAPTURE_FAILED: "Failed to capture payment",
  RELEASE_FAILED: "Failed to release payment"
};

module.exports = {
  PAYMENT_STATUS,
  REQUEST_STATUS,
  PAYMENT_LIFECYCLE,
  STRIPE_CONFIG,
  ERROR_MESSAGES
};
