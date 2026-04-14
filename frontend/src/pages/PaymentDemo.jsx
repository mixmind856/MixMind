import { useState } from "react";
import StripePayment from "../components/payment/StripePayment";

export default function PaymentDemo() {
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [transactionId, setTransactionId] = useState(null);

  const handlePaymentSuccess = (id) => {
    setPaymentCompleted(true);
    setTransactionId(id);
    setTimeout(() => {
      setPaymentCompleted(false);
      setTransactionId(null);
    }, 5000);
  };

  const handlePaymentError = (error) => {
    console.error("Payment error:", error);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#140822] to-[#0a0712] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Payment Test</h1>
          <p className="text-gray-400">Try our secure payment system with test card</p>
        </div>

        {paymentCompleted && (
          <div className="mb-6 p-4 bg-green-900/30 border border-green-500 rounded-lg">
            <p className="text-green-400 font-semibold">
              ✅ Payment Successful! Transaction ID: {transactionId}
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-8">
          <StripePayment 
            amount={99.99}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
          />
        </div>

        <div className="mt-8 p-6 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <h2 className="text-xl font-bold text-white mb-4">Test Card Details</h2>
          <div className="space-y-2 text-gray-300">
            <p><span className="font-semibold">Card Number:</span> 4242 4242 4242 4242</p>
            <p><span className="font-semibold">Expiry:</span> Any future date (e.g., 12/25)</p>
            <p><span className="font-semibold">CVV:</span> Any 3-4 digits (e.g., 123)</p>
            <p><span className="font-semibold">Name:</span> Any name</p>
          </div>
        </div>

        <div className="mt-8">
          <a 
            href="/"
            className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
