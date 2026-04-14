import React, { useState } from "react";
import {
  Music,
  User,
  Mail,
  Mic2,
  DollarSign,
  CheckCircle2,
  X
} from "lucide-react";
import StripePayment from "../components/payment/StripePayment.jsx";

const API = import.meta.env.VITE_API_URL;

/* --------- FORM COMPONENT --------- */
function RequestForm() {

  const [form, setForm] = useState({
    name: "",
    email: "",
    title: "",
    artist: "",
    price: 5
  });

  const [showPayment, setShowPayment] = useState(false);
  const [requestId, setRequestId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  function onChange(e) {
    setForm(s => ({ ...s, [e.target.name]: e.target.value }));
  }

  /* Step 1: Submit form to create request */
  async function handleFormSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const reqRes = await fetch(`${API}/api/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      if (!reqRes.ok) {
        const d = await reqRes.json();
        throw new Error(d.error || "Request creation failed");
      }

      const { id } = await reqRes.json();
      setRequestId(id);
      
      // Store user email in localStorage for use in ThankYou page
      localStorage.setItem("userEmail", form.email);
      
      setShowPayment(true);
    } catch (err) {
      setError(err.message || "Failed to create request");
    } finally {
      setLoading(false);
    }
  }

  /* Step 2: Handle payment success */
  async function handlePaymentSuccess(paymentData) {
    try {
      setLoading(true);
      
      /* Save payment to backend */
      const payRes = await fetch(`${API}/api/payments/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          requestId,
          transactionId: paymentData.transactionId,
          amount: paymentData.amount,
          currency: paymentData.currency
        })
      });

      if (!payRes.ok) {
        const d = await payRes.json();
        throw new Error(d.error || "Payment confirmation failed");
      }

      setShowPayment(false);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  /* Step 3: Handle payment error */
  function handlePaymentError(error) {
    setError(error.message || "Payment processing failed");
  }

  /* ---------------- SUCCESS ---------------- */
  if (success) {
    return (
      <div className="bg-white rounded-2xl p-10 shadow-xl text-center max-w-md mx-auto">
        <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Request Submitted</h2>
        <p className="text-gray-600">
          Your payment has been <b>authorized</b>.  
          You will be charged only after admin approval.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* ---------------- DETAILS FORM ---------------- */}
      <form
        onSubmit={handleFormSubmit}
        className="bg-white rounded-2xl shadow-xl p-8 space-y-6 max-w-xl w-full mx-auto"
      >
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Music /> Request a Song
        </h2>

        <Input label="Your Name" icon={<User />} name="name" value={form.name} onChange={onChange} />
        <Input label="Email" icon={<Mail />} type="email" name="email" value={form.email} onChange={onChange} />
        <Input label="Song Title" icon={<Music />} name="title" value={form.title} onChange={onChange} />
        <Input label="Artist" icon={<Mic2 />} name="artist" value={form.artist} onChange={onChange} />
        <Input label="Price (GBP)" icon={<DollarSign />} type="number" name="price" value={form.price} onChange={onChange} />

        {error && <div className="text-red-600 font-medium">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-4 rounded-xl disabled:opacity-50"
        >
          {loading ? "Creating request..." : "Continue to Payment"}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Card details will be collected securely in the next step.
        </p>
      </form>

      {/* PAYMENT MODAL */}
      {showPayment && requestId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl w-full max-w-md relative shadow-2xl border border-gray-100">
            <button
              type="button"
              onClick={() => setShowPayment(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 z-10 transition-colors"
            >
              <X size={28} />
            </button>

            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6 rounded-t-3xl">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                💳 Payment Details
              </h3>
              <p className="text-blue-100 text-sm mt-1">Complete your song request payment</p>
            </div>

            {/* Amount Summary */}
            <div className="px-8 py-4 bg-blue-50 border-b border-blue-100">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">Amount to Pay:</span>
                <span className="text-2xl font-bold text-blue-600">£{parseFloat(form.price).toFixed(2)}</span>
              </div>
            </div>

            {/* Stripe Payment Component */}
            <div className="p-8">
              <StripePayment 
                amount={form.price}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentError={handlePaymentError}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* --------- INPUT COMPONENT --------- */
function Input({ label, icon, ...props }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-3 text-gray-400">{icon}</div>
        <input
          {...props}
          required
          className="w-full pl-10 pr-4 py-3 border-2 rounded-xl"
        />
      </div>
    </div>
  );
}

/* --------- EXPORT --------- */
export default RequestForm;
