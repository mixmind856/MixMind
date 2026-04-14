/**
 * Validation Utilities
 */

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate admin key format
 * @param {string} adminKey - Admin key to validate
 * @returns {boolean} - True if valid
 */
export const isValidAdminKey = (adminKey) => {
  return adminKey && adminKey.trim().length > 0;
};

/**
 * Validate venue ID format
 * @param {string} venueId - Venue ID to validate
 * @returns {boolean} - True if valid
 */
export const isValidVenueId = (venueId) => {
  return venueId && venueId.trim().length > 0;
};

/**
 * Validate amount (positive number)
 * @param {number} amount - Amount to validate
 * @returns {boolean} - True if valid
 */
export const isValidAmount = (amount) => {
  return !isNaN(amount) && parseFloat(amount) > 0;
};

export default {
  isValidEmail,
  isValidAdminKey,
  isValidVenueId,
  isValidAmount
};
