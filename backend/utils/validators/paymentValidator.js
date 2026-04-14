/**
 * Payment Validators
 * Validation functions for payment and request operations
 */

const { PAYMENT_STATUS, REQUEST_STATUS, ERROR_MESSAGES } = require("../constants/paymentConstants");

/**
 * Validate payment status transition
 * Ensures payment can move from current status to target status
 * @param {string} currentStatus - Current payment status
 * @param {string} targetStatus - Target payment status
 * @returns {boolean} - True if transition is valid
 */
function isValidPaymentStatusTransition(currentStatus, targetStatus) {
  const validTransitions = {
    [PAYMENT_STATUS.PENDING]: [PAYMENT_STATUS.AUTHORIZED, PAYMENT_STATUS.FAILED],
    [PAYMENT_STATUS.AUTHORIZED]: [PAYMENT_STATUS.CAPTURED, PAYMENT_STATUS.CANCELLED, PAYMENT_STATUS.FAILED],
    [PAYMENT_STATUS.CAPTURED]: [],
    [PAYMENT_STATUS.CANCELLED]: [],
    [PAYMENT_STATUS.FAILED]: []
  };

  return validTransitions[currentStatus]?.includes(targetStatus) || false;
}

/**
 * Validate if payment can be captured
 * @param {Object} payment - Payment object
 * @returns {boolean} - True if payment can be captured
 */
function canCapturePayment(payment) {
  return payment && payment.status === PAYMENT_STATUS.AUTHORIZED;
}

/**
 * Validate if payment can be released
 * @param {Object} payment - Payment object
 * @returns {boolean} - True if payment can be released
 */
function canReleasePayment(payment) {
  return payment && [PAYMENT_STATUS.AUTHORIZED, PAYMENT_STATUS.PENDING].includes(payment.status);
}

/**
 * Validate request approval prerequisites
 * @param {Object} request - Request object
 * @param {Object} payment - Payment object
 * @returns {Object} - { isValid: boolean, error?: string }
 */
function validateRequestApproval(request, payment) {
  if (!request) {
    return { isValid: false, error: ERROR_MESSAGES.REQUEST_NOT_FOUND };
  }

  if (request.status !== REQUEST_STATUS.AUTHORIZED) {
    return { isValid: false, error: ERROR_MESSAGES.REQUEST_NOT_AUTHORIZED };
  }

  if (!request.paymentIntentId) {
    return { isValid: false, error: ERROR_MESSAGES.NO_PAYMENT_INTENT };
  }

  if (!payment || payment.status !== PAYMENT_STATUS.AUTHORIZED) {
    return { isValid: false, error: "Payment not authorized" };
  }

  return { isValid: true };
}

/**
 * Validate request rejection prerequisites
 * @param {Object} request - Request object
 * @param {Object} payment - Payment object
 * @returns {Object} - { isValid: boolean, error?: string }
 */
function validateRequestRejection(request, payment) {
  if (!request) {
    return { isValid: false, error: ERROR_MESSAGES.REQUEST_NOT_FOUND };
  }

  if (!request.paymentIntentId) {
    return { isValid: false, error: ERROR_MESSAGES.NO_PAYMENT_INTENT };
  }

  if (!payment) {
    return { isValid: false, error: ERROR_MESSAGES.PAYMENT_NOT_FOUND };
  }

  if (!canReleasePayment(payment)) {
    return { isValid: false, error: `Cannot reject payment with status: ${payment.status}` };
  }

  return { isValid: true };
}

module.exports = {
  isValidPaymentStatusTransition,
  canCapturePayment,
  canReleasePayment,
  validateRequestApproval,
  validateRequestRejection
};
