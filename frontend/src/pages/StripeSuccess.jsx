import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const API = import.meta.env.VITE_API_URL;

export default function StripeSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying"); // verifying, success, error
  const [message, setMessage] = useState("Verifying your payment...");
  const [error, setError] = useState(null);
  const [requestId, setRequestId] = useState(null);
  const [venueId, setVenueId] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const sessionId = searchParams.get("session_id");
        
        if (!sessionId) {
          setStatus("error");
          setError("No session ID found. Please try again.");
          return;
        }

        console.log(`🔐 Verifying Stripe session: ${sessionId}`);

        // Call backend to verify the checkout session
        const response = await fetch(`${API}/api/stripe/verify-checkout?sessionId=${sessionId}`);
        const data = await response.json();

        console.log("Verification response:", data);
        console.log("Response status:", response.status);
        console.log("Response headers:", {
          'content-type': response.headers.get('content-type')
        });

        if (!data.success) {
          setStatus("error");
          setError(data.message || "Payment verification failed");
          return;
        }

        console.log(`✅ Payment verified - Request: ${data.requestId}`);
        console.log(`   VenueId: ${data.venueId || "NOT PROVIDED"}`);
        console.log(`   Full response:`, data);
        
        setRequestId(data.requestId);
        if (data.venueId) {
          setVenueId(data.venueId);
        }
        setStatus("success");
        setMessage("✅ Payment successful! Redirecting...");

        // Redirect to thank you page after 2 seconds
        setTimeout(() => {
          if (data.venueId) {
            console.log(`Redirecting to: /thank-you/${data.venueId}`);
            navigate(`/thank-you/${data.venueId}`, { replace: true });
          } else {
            console.warn(`VenueId not available, redirecting to home`);
            navigate("/", { replace: true });
          }
        }, 2000);

      } catch (err) {
        console.error("Payment verification error:", err);
        setStatus("error");
        setError(err.message || "Something went wrong");
      }
    };

    verifyPayment();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-deep via-purple-900/20 to-bg-deep flex items-center justify-center p-4">
      <div className="bg-[#1a0f2e] border border-purple-500/30 rounded-lg p-8 w-full max-w-md text-center">
        {status === "verifying" && (
          <>
            <Loader2 size={64} className="text-purple-400 animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-white mb-2">
              Processing Payment
            </h1>
            <p className="text-gray-300 mb-4">
              {message}
            </p>
            <p className="text-xs text-gray-500">
              Please don't close this page...
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mb-6 flex justify-center">
              <CheckCircle2 size={64} className="text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Payment Successful!
            </h1>
            <p className="text-gray-300 mb-4">
              Your payment has been confirmed and your request is being processed.
            </p>
            <p className="text-xs text-gray-500">
              Redirecting to home page...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mb-6 flex justify-center">
              <AlertCircle size={64} className="text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Payment Verification Failed
            </h1>
            <p className="text-gray-300 mb-4">
              {error || "We couldn't verify your payment. Please try again."}
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-6 w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium"
            >
              Return to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
