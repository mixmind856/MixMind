/**
 * Date/Time Utilities
 */

/**
 * Format date to readable string
 * @param {Date|string} date - Date to format
 * @param {object} options - Intl format options
 * @returns {string} - Formatted date
 */
export const formatDate = (date, options = {}) => {
  const defaultOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options
  };

  return new Intl.DateTimeFormat("en-US", defaultOptions).format(new Date(date));
};

/**
 * Format date and time
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date and time
 */
export const formatDateTime = (date) => {
  return formatDate(date, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

/**
 * Get relative time string (e.g., "2 hours ago")
 * @param {Date|string} date - Date to format
 * @returns {string} - Relative time
 */
export const getRelativeTime = (date) => {
  const now = new Date();
  const time = new Date(date);
  const diffMs = now - time;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDate(date);
};

export default {
  formatDate,
  formatDateTime,
  getRelativeTime
};
