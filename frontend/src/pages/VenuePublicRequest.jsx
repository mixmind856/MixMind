import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import VenuePaymentModalWrapper from "../componentsRequest/VenuePaymentModal";
import logo from "../assets/Mixmind.jpeg";
import { Gift, Check } from "lucide-react";

export default function VenuePublicRequest() {
  const { venueId } = useParams();
  const [venue, setVenue] = useState(null);
  const [isVenueActive, setIsVenueActive] = useState(true);

  const [formData, setFormData] = useState({
    songTitle: "",
    artistName: "",
    userName: "",
    email: "",
    phone: "",
    countryCode: "+44",
    price: 1.69 // Will be updated based on DJ mode
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [recentRequests, setRecentRequests] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponData, setCouponData] = useState(null);
  const [couponValidating, setCouponValidating] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [showPriorityChoice, setShowPriorityChoice] = useState(false);
  const [priorityRequest, setPriorityRequest] = useState(false);
  const [priorityChoiceLoading, setPriorityChoiceLoading] = useState(null);

  useEffect(() => {
    fetchVenueData();
  }, [venueId]);

  const fetchVenueData = async () => {
    try {
      setLoading(true);

      const venueRes = await fetch(
        `${import.meta.env.VITE_API_URL}/venue/public/${venueId}`
      );

      if (!venueRes.ok) {
        throw new Error("Venue not found");
      }

      const venueData = await venueRes.json();
      setVenue(venueData);
      setIsVenueActive(venueData.isActive || false);

      // Keep your current pricing logic here
      const dynamicPrice = venueData.djMode ? 5.99 : 1.69;
      setFormData((prev) => ({
        ...prev,
        price: dynamicPrice
      }));

      if (venueData.isActive) {
        const requestsRes = await fetch(
          `${import.meta.env.VITE_API_URL}/requests/venue/${venueId}/public`
        );

        if (requestsRes.ok) {
          const requestsData = await requestsRes.json();
          setRecentRequests(requestsData.slice(0, 10));
        }
      }
    } catch (err) {
      setError(err.message || "Failed to load venue");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code");
      return;
    }

    setCouponValidating(true);
    setCouponError("");

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/coupons/validate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            couponCode: couponCode,
            originalPrice: formData.price
          })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setCouponError(data.error || "Invalid coupon code");
        setCouponData(null);
        return;
      }

      setCouponData({
        discount: data.discount,
        finalPrice: data.finalPrice,
        couponCode: data.couponCode
      });
      setCouponError("");
    } catch (err) {
      setCouponError("Failed to validate coupon");
    } finally {
      setCouponValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponData(null);
    setCouponCode("");
    setCouponError("");
  };

  const submitRequest = async () => {
    setSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/requests/create`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.userName,
            email: formData.email,
            title: formData.songTitle,
            artist: formData.artistName,
            phone: formData.phone,
            countryCode: formData.countryCode,
            price: couponData ? couponData.finalPrice : parseFloat(formData.price),
            couponCode: couponData?.couponCode || null,
            venueId: venueId,
            priorityRequest: priorityRequest,
            priorityType: priorityRequest ? "play_next" : "normal"
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();

        if (errorData?.venueCanAccept && Array.isArray(errorData.venueCanAccept)) {
          throw new Error(
            `This venue currently accepts: ${errorData.venueCanAccept.join(", ")}`
          );
        }

        throw new Error(errorData.message || errorData.error || "Failed to submit request");
      }

      const responseData = await response.json();
      const { requestId, checkoutUrl: url, checkoutSessionId: sessionId } = responseData;

      if (formData.email) {
        localStorage.setItem("userEmail", formData.email);
      }

      console.log("✅ Song request created");
      console.log(`   Request ID: ${requestId}`);
      console.log(`   Checkout URL: ${url}`);
      console.log(`   Session ID: ${sessionId}`);

      setPendingRequestId(requestId);
      setCheckoutUrl(url);
      setCheckoutSessionId(sessionId);
      setShowPaymentModal(true);

      console.log("🔔 Payment modal opened with checkout data");
    } catch (err) {
      setError(err.message || "An error occurred");
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (venue?.djMode) {
      setShowPriorityChoice(true);
      return;
    }

    await submitRequest();
  };

  const handlePriorityChoice = async (isPriority) => {
    setPriorityChoiceLoading(isPriority ? "priority" : "normal");
    setPriorityRequest(isPriority);

    const basePrice = venue?.djMode ? 5.99 : 1.69;
    const priorityFee = venue?.djMode && isPriority ? 2.99 : 0;

    setFormData((prev) => ({
      ...prev,
      price: basePrice + priorityFee
    }));

    await new Promise((resolve) => setTimeout(resolve, 350));

    setShowPriorityChoice(false);
    await submitRequest();
    setPriorityChoiceLoading(null);
  };

  const handlePaymentSuccess = async () => {
    // Keep your current pricing reset logic here
    const resetPrice = venue && venue.djMode ? 9 : 3;

    setFormData({
      songTitle: "",
      artistName: "",
      userName: "",
      email: "",
      phone: "",
      countryCode: "+44",
      price: resetPrice
    });

    setCouponCode("");
    setCouponData(null);
    setCouponError("");
    setPriorityRequest(false);
    setPendingRequestId(null);
    setSubmitting(false);

    setTimeout(async () => {
      await fetchVenueData();
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#140822] to-[#0a0712] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          <p className="text-gray-400 mt-4">Loading venue...</p>
        </div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#140822] to-[#0a0712] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg">{error || "Venue not found"}</p>
        </div>
      </div>
    );
  }

  if (!isVenueActive) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#140822] to-[#0a0712] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔴</div>
          <h1 className="text-3xl font-bold text-white mb-4">Venue Offline</h1>
          <p className="text-gray-300 text-lg mb-6">
            {venue.name} is currently offline and not accepting requests.
          </p>
          <p className="text-gray-400 mb-8">
            Please check back later or visit another venue.
          </p>
          <a
            href="/browse-venues"
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-lg transition duration-200"
          >
            Browse Other Venues
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07070B] text-white px-6 py-16">
      <div className="max-w-md mx-auto">
        <div
          className="inline-flex items-center justify-center w-18 h-18 rounded-lg mb-4 glow-purple md:ml-45 ml-40"
          style={{ background: "linear-gradient(135deg, #A855F7, #7C3AED)" }}
        >
          <img src={logo} alt="MixMind Logo" className="w-17 h-17" />
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
            Request Your Song
          </h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.72)" }}>
            Enter your details and we'll handle the rest
          </p>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{
            background: "linear-gradient(135deg, rgba(18,18,34,0.92) 0%, rgba(18,18,34,0.55) 100%)",
            border: "1px solid rgba(255,255,255,0.08)"
          }}
        >
          {error && (
            <div
              className="mb-6 p-4 rounded-xl"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-600 mb-2" style={{ color: "rgba(255,255,255,0.72)" }}>
                Song Title
              </label>
              <input
                type="text"
                name="songTitle"
                value={formData.songTitle}
                onChange={handleChange}
                required
                placeholder="Enter song title"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all"
                style={{
                  background: "rgba(168,85,247,0.1)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#FFFFFF"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#A855F7";
                  e.target.style.boxShadow = "0 0 20px rgba(168,85,247,0.3)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.08)";
                  e.target.style.boxShadow = "none";
                }}
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-xs font-600 mb-2" style={{ color: "rgba(255,255,255,0.72)" }}>
                Artist Name
              </label>
              <input
                type="text"
                name="artistName"
                value={formData.artistName}
                onChange={handleChange}
                required
                placeholder="Enter artist name"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all"
                style={{
                  background: "rgba(168,85,247,0.1)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#FFFFFF"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#A855F7";
                  e.target.style.boxShadow = "0 0 20px rgba(168,85,247,0.3)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.08)";
                  e.target.style.boxShadow = "none";
                }}
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-xs font-600 mb-2" style={{ color: "rgba(255,255,255,0.72)" }}>
                Your Name
              </label>
              <input
                type="text"
                name="userName"
                value={formData.userName}
                onChange={handleChange}
                required
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all"
                style={{
                  background: "rgba(168,85,247,0.1)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#FFFFFF"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#A855F7";
                  e.target.style.boxShadow = "0 0 20px rgba(168,85,247,0.3)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.08)";
                  e.target.style.boxShadow = "none";
                }}
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-xs font-600 mb-2" style={{ color: "rgba(255,255,255,0.72)" }}>
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="Enter phone number"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all"
                style={{
                  background: "rgba(168,85,247,0.1)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#FFFFFF"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#A855F7";
                  e.target.style.boxShadow = "0 0 20px rgba(168,85,247,0.3)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.08)";
                  e.target.style.boxShadow = "none";
                }}
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-xs font-600 mb-2" style={{ color: "rgba(255,255,255,0.72)" }}>
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Enter email address"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all"
                style={{
                  background: "rgba(168,85,247,0.1)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#FFFFFF"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#A855F7";
                  e.target.style.boxShadow = "0 0 20px rgba(168,85,247,0.3)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(255,255,255,0.08)";
                  e.target.style.boxShadow = "none";
                }}
                disabled={submitting}
              />
            </div>

            <div
              className="mt-6 p-4 rounded-xl"
              style={{ background: "rgba(34,227,161,0.1)", border: "1px solid rgba(34,227,161,0.2)" }}
            >
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.72)" }}>Base Price</p>
                <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.72)" }}>
                  £{formData.price.toFixed(2)}
                </p>
              </div>

              {couponData && (
                <>
                  <div
                    className="h-px"
                    style={{ background: "rgba(34,227,161,0.3)", margin: "8px 0" }}
                  ></div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs font-medium" style={{ color: "#22E3A1" }}>✨ Discount</p>
                    <p className="text-sm font-semibold" style={{ color: "#22E3A1" }}>
                      -£{couponData.discount.toFixed(2)}
                    </p>
                  </div>
                </>
              )}

              <div
                className="flex justify-between items-center pt-2"
                style={{ borderTop: "1px solid rgba(34,227,161,0.3)" }}
              >
                <p className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.72)" }}>
                  Total to Pay
                </p>
                <p className="font-bold text-xl" style={{ color: "#22E3A1" }}>
                  £{(couponData ? couponData.finalPrice : formData.price).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <label className="flex items-center gap-2 text-xs font-600 mb-2" style={{ color: "rgba(255,255,255,0.72)" }}>
                <Gift size={14} /> Have a Coupon? (Optional)
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  disabled={couponData !== null}
                  placeholder="Enter coupon code"
                  className="flex-1 px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all"
                  style={{
                    background: "rgba(168,85,247,0.1)",
                    border: couponData
                      ? "1px solid rgba(34,227,161,0.3)"
                      : "1px solid rgba(255,255,255,0.08)",
                    color: "#FFFFFF"
                  }}
                  onFocus={(e) => {
                    if (!couponData) {
                      e.target.style.borderColor = "#A855F7";
                      e.target.style.boxShadow = "0 0 20px rgba(168,85,247,0.3)";
                    }
                  }}
                  onBlur={(e) => {
                    if (!couponData) {
                      e.target.style.borderColor = "rgba(255,255,255,0.08)";
                      e.target.style.boxShadow = "none";
                    }
                  }}
                />

                {!couponData && (
                  <button
                    type="button"
                    onClick={handleValidateCoupon}
                    disabled={couponValidating || !couponCode.trim()}
                    className="px-4 py-3 rounded-xl font-medium transition-all"
                    style={{
                      background:
                        couponValidating || !couponCode.trim()
                          ? "rgba(168,85,247,0.3)"
                          : "linear-gradient(135deg, #22E3A1 0%, #10B981 100%)",
                      color: "#FFFFFF",
                      opacity: couponValidating || !couponCode.trim() ? 0.5 : 1
                    }}
                  >
                    {couponValidating ? "Checking..." : "Apply"}
                  </button>
                )}

                {couponData && (
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="px-4 py-3 rounded-xl font-medium transition-all"
                    style={{
                      background: "rgba(168,85,247,0.2)",
                      color: "#A855F7",
                      border: "1px solid rgba(168,85,247,0.3)"
                    }}
                  >
                    ✕ Remove
                  </button>
                )}
              </div>

              {couponError && (
                <p className="text-red-300 text-xs mt-2">❌ {couponError}</p>
              )}

              {couponData && (
                <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "#22E3A1" }}>
                  <Check size={14} /> Coupon applied! Save £{couponData.discount.toFixed(2)}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full text-white font-bold py-4 rounded-2xl text-lg mt-6 flex items-center justify-center gap-2 transition-all transform hover:scale-105 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)",
                boxShadow: "0 8px 50px rgba(168,85,247,0.6)"
              }}
            >
              {submitting ? "Processing..." : <>Request Song <span>→</span></>}
            </button>
          </form>

          <p className="text-xs text-center mt-6" style={{ color: "rgba(255,255,255,0.4)" }}>
            Amount will be charged only after your request is accepted
          </p>
        </div>
      </div>

      <VenuePaymentModalWrapper
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setPendingRequestId(null);
          setCheckoutUrl(null);
          setCheckoutSessionId(null);
          setSubmitting(false);
        }}
        requestId={pendingRequestId}
        amount={couponData ? couponData.finalPrice : parseFloat(formData.price)}
        venueId={venueId}
        checkoutUrl={checkoutUrl}
        checkoutSessionId={checkoutSessionId}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {showPriorityChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div
            className="w-full max-w-md rounded-3xl p-6"
            style={{
              background: "linear-gradient(180deg, rgba(18,18,34,0.98) 0%, rgba(10,10,18,0.98) 100%)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 20px 80px rgba(0,0,0,0.45)"
            }}
          >
            <h3 className="text-2xl font-bold mb-2 text-center">Choose your spot in the queue</h3>
            <p className="text-sm mb-6 text-center" style={{ color: "rgba(255,255,255,0.72)" }}>
              Pick the option that feels right for tonight.
            </p>

            <div className="space-y-4">
              <button
                type="button"
                onClick={() => handlePriorityChoice(false)}
                disabled={priorityChoiceLoading !== null}
                className="w-full rounded-2xl p-5 text-left transition-all duration-200 disabled:opacity-70"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  transform: priorityChoiceLoading === "normal" ? "scale(0.985)" : "scale(1)"
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-white">🎧 Lock My Spot 🎵</div>
                    <div className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                      👉 Your turn is coming
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-2xl font-bold text-white">£5.99</div>
                  </div>
                </div>

                <div className="mt-3 min-h-[20px] text-sm font-medium" style={{ color: "#C084FC" }}>
                  {priorityChoiceLoading === "normal" ? "🎵 You’re in, we’ll play it soon!" : ""}
                </div>
              </button>

              <button
                type="button"
                onClick={() => handlePriorityChoice(true)}
                disabled={priorityChoiceLoading !== null}
                className="w-full rounded-2xl p-5 text-left transition-all duration-200 disabled:opacity-70"
                style={{
                  background: "linear-gradient(135deg, rgba(34,227,161,0.18) 0%, rgba(16,185,129,0.12) 100%)",
                  border: "1px solid rgba(34,227,161,0.42)",
                  boxShadow: "0 0 26px rgba(34,227,161,0.24)",
                  transform: priorityChoiceLoading === "priority" ? "scale(0.99)" : "scale(1.02)"
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div
                      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold mb-3"
                      style={{
                        background: "rgba(34,227,161,0.16)",
                        border: "1px solid rgba(34,227,161,0.3)",
                        color: "#6EE7B7"
                      }}
                    >
                      🔥 Most Popular
                    </div>

                    <div className="text-lg font-semibold text-white">🔥 Priority Placement 🔥</div>
                    <div className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.82)" }}>
                      👉 Be heard sooner
                    </div>
                    <div className="mt-3 text-2xl font-extrabold" style={{ color: "#6EE7B7" }}>
                      Only £2.99 more
                    </div>
                  </div>

                  <div className="text-right shrink-0 pt-10">
                    <div className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.65)" }}>
                      £8.98 total
                    </div>
                  </div>
                </div>

                <div className="mt-3 min-h-[20px] text-sm font-medium" style={{ color: "#6EE7B7" }}>
                  {priorityChoiceLoading === "priority" ? "🔥 Nice, moving you up the queue!" : ""}
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowPriorityChoice(false)}
              disabled={priorityChoiceLoading !== null}
              className="mt-5 w-full text-sm underline disabled:opacity-50"
              style={{ color: "rgba(255,255,255,0.72)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}