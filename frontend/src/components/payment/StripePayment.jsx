import React, { useState, useEffect } from "react";
import "./StripePayment.css";

const StripePayment = ({ amount = 99.99, onPaymentSuccess, onPaymentError }) => {
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    cardName: "",
    expiryDate: "",
    cvv: ""
  });

  const [currency, setCurrency] = useState("GBP");
  const [convertedAmount, setConvertedAmount] = useState(amount);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);

  // USD to GBP conversion rate (in real app, fetch from API)
  const exchangeRates = {
    USD: 1,
    GBP: 0.79, // 1 USD = 0.79 GBP (approximate)
    EUR: 0.92,
    INR: 83.12
  };

  // Update converted amount when currency changes
  useEffect(() => {
    const converted = (amount * exchangeRates[currency]).toFixed(2);
    setConvertedAmount(converted);
  }, [currency, amount]);

  // Format card number with spaces
  const handleCardNumberChange = (e) => {
    let value = e.target.value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    let formattedValue = "";
    for (let i = 0; i < value.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formattedValue += " ";
      }
      formattedValue += value[i];
    }
    setCardDetails({ ...cardDetails, cardNumber: formattedValue });
  };

  // Format expiry date
  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length >= 2) {
      value = value.slice(0, 2) + "/" + value.slice(2, 4);
    }
    setCardDetails({ ...cardDetails, expiryDate: value });
  };

  // Format CVV (numbers only)
  const handleCVVChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setCardDetails({ ...cardDetails, cvv: value });
  };

  // Validate card details
  const validateCardDetails = () => {
    const errors = [];

    if (!cardDetails.cardName.trim()) {
      errors.push("Card holder name is required");
    }

    if (cardDetails.cardNumber.replace(/\s+/g, "").length !== 16) {
      errors.push("Card number must be 16 digits");
    }

    if (!cardDetails.expiryDate.match(/^\d{2}\/\d{2}$/)) {
      errors.push("Expiry date must be MM/YY format");
    }

    if (cardDetails.cvv.length < 3) {
      errors.push("CVV must be at least 3 digits");
    }

    return errors;
  };

  // Handle payment
  const handlePayment = async (e) => {
    e.preventDefault();

    const errors = validateCardDetails();
    if (errors.length > 0) {
      setPaymentStatus({
        type: "error",
        message: errors.join(", ")
      });
      return;
    }

    setIsProcessing(true);
    setPaymentStatus(null);

    try {
      // Simulate payment processing
      // In production, this would call your backend Stripe API
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock payment response
      const paymentData = {
        success: true,
        transactionId: `TXN_${Date.now()}`,
        amount: convertedAmount,
        currency: currency,
        cardLast4: cardDetails.cardNumber.slice(-4),
        timestamp: new Date().toISOString()
      };

      setPaymentStatus({
        type: "success",
        message: "Payment successful!",
        data: paymentData
      });

      // Reset form
      setCardDetails({
        cardNumber: "",
        cardName: "",
        expiryDate: "",
        cvv: ""
      });

      if (onPaymentSuccess) {
        onPaymentSuccess(paymentData);
      }
    } catch (error) {
      setPaymentStatus({
        type: "error",
        message: "Payment failed. Please try again."
      });

      if (onPaymentError) {
        onPaymentError(error);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="stripe-payment-container">
      <div className="payment-card">
        <div className="payment-header">
          <h2>💳 Payment</h2>
          <div className="currency-selector">
            <label>Currency:</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
              <option value="EUR">EUR (€)</option>
              <option value="INR">INR (₹)</option>
            </select>
          </div>
        </div>

        <div className="amount-display">
          <div className="original-amount">
            <span className="label">Amount:</span>
            <span className="value">${amount.toFixed(2)}</span>
          </div>
          <div className="converted-amount">
            <span className="label">{currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : "₹"} {convertedAmount}</span>
          </div>
        </div>

        <form onSubmit={handlePayment} className="payment-form">
          {/* Card Number */}
          <div className="form-group">
            <label htmlFor="cardNumber">Card Number</label>
            <input
              type="text"
              id="cardNumber"
              placeholder="1234 5678 9012 3456"
              value={cardDetails.cardNumber}
              onChange={handleCardNumberChange}
              maxLength="19"
              disabled={isProcessing}
              className="form-input"
            />
            <small className="test-info">💡 Test: 4242 4242 4242 4242</small>
          </div>

          {/* Card Name */}
          <div className="form-group">
            <label htmlFor="cardName">Card Holder Name</label>
            <input
              type="text"
              id="cardName"
              placeholder="John Doe"
              value={cardDetails.cardName}
              onChange={(e) => setCardDetails({ ...cardDetails, cardName: e.target.value })}
              disabled={isProcessing}
              className="form-input"
            />
          </div>

          {/* Expiry and CVV */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="expiryDate">Expiry Date</label>
              <input
                type="text"
                id="expiryDate"
                placeholder="MM/YY"
                value={cardDetails.expiryDate}
                onChange={handleExpiryChange}
                maxLength="5"
                disabled={isProcessing}
                className="form-input"
              />
              <small className="test-info">💡 Any future date</small>
            </div>

            <div className="form-group">
              <label htmlFor="cvv">CVV</label>
              <input
                type="password"
                id="cvv"
                placeholder="123"
                value={cardDetails.cvv}
                onChange={handleCVVChange}
                maxLength="4"
                disabled={isProcessing}
                className="form-input"
              />
              <small className="test-info">💡 Any 3-4 digits</small>
            </div>
          </div>

          {/* Status Messages */}
          {paymentStatus && (
            <div className={`status-message ${paymentStatus.type}`}>
              {paymentStatus.type === "success" && (
                <>
                  <span className="success-icon">✅</span>
                  <div>
                    <p className="status-title">{paymentStatus.message}</p>
                    {paymentStatus.data && (
                      <p className="transaction-id">
                        Transaction ID: {paymentStatus.data.transactionId}
                      </p>
                    )}
                  </div>
                </>
              )}
              {paymentStatus.type === "error" && (
                <>
                  <span className="error-icon">❌</span>
                  <p className="status-title">{paymentStatus.message}</p>
                </>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isProcessing}
            className={`submit-button ${isProcessing ? "loading" : ""}`}
          >
            {isProcessing ? (
              <>
                <span className="spinner"></span>
                Processing...
              </>
            ) : (
              `Pay ${currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : "₹"} ${convertedAmount}`
            )}
          </button>

          <p className="disclaimer">
            💳 This is a demo payment form. No real charges will be made.
          </p>
        </form>

        {/* Info Box */}
        <div className="info-box">
          <h4>🧪 Test Card Details:</h4>
          <ul>
            <li><strong>Card Number:</strong> 4242 4242 4242 4242</li>
            <li><strong>Expiry:</strong> Any future date (MM/YY)</li>
            <li><strong>CVV:</strong> Any 3-4 digits</li>
            <li><strong>Name:</strong> Any name</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StripePayment;
