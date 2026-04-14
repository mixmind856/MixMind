/**
 * Currency Formatting Utilities
 */

import { CURRENCY } from "../constants/paymentConstants";

/**
 * Format number as currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (amount, currency = CURRENCY.CODE) => {
  return new Intl.NumberFormat(CURRENCY.LOCALE, {
    style: "currency",
    currency: currency
  }).format(amount);
};

/**
 * Format currency without symbol
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted number
 */
export const formatAmount = (amount) => {
  return parseFloat(amount).toFixed(2);
};

/**
 * Calculate percentage
 * @param {number} value - Value
 * @param {number} total - Total
 * @returns {number} - Percentage
 */
export const calculatePercentage = (value, total) => {
  return total === 0 ? 0 : ((value / total) * 100).toFixed(2);
};

export default {
  formatCurrency,
  formatAmount,
  calculatePercentage
};
