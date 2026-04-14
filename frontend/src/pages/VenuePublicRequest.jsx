import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import VenuePaymentModalWrapper from "../componentsRequest/VenuePaymentModal";
import logo from "../assets/Mixmind.jpeg";

export default function VenuePublicRequest() {
  const { venueId } = useParams();
  const [venue, setVenue] = useState(null);
  const [isVenueActive, setIsVenueActive] = useState(true);
  
  // Demo mode - prefill with test data
  const DEMO_MODE = true;
  
  const [formData, setFormData] = useState({
    songTitle: DEMO_MODE ? "Blinding Lights" : "",
    artistName: DEMO_MODE ? "The Weeknd" : "",
    userName: DEMO_MODE ? "Alex Johnson" : "",
    email: DEMO_MODE ? "alex@example.com" : "",
    phone: DEMO_MODE ? "07911123456" : "",
    countryCode: "+44",
    price: 2.99  // Will be updated based on DJ mode
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

  useEffect(() => {
    fetchVenueData();
  }, [venueId]);

  const fetchVenueData = async () => {
    try {
      setLoading(true);
      
      // Fetch venue details
      const venueRes = await fetch(
        `${import.meta.env.VITE_API_URL}/api/venue/public/${venueId}`
      );

      if (!venueRes.ok) {
        throw new Error("Venue not found");
      }

      const venueData = await venueRes.json();
      setVenue(venueData);
      setIsVenueActive(venueData.isActive || false);

      // ===== SET PRICE BASED ON DJ MODE =====
      // DJ Mode ON: £9 | DJ Mode OFF: £3
      const dynamicPrice = venueData.djMode ? 8.99 : 2.99;
      setFormData(prev => ({
        ...prev,
        price: dynamicPrice
      }));

      // Only fetch requests if venue is active
      if (venueData.isActive) {
        // Fetch recent approved requests for this venue (public view)
        const requestsRes = await fetch(
          `${import.meta.env.VITE_API_URL}/api/requests/venue/${venueId}/public`
        );

        if (requestsRes.ok) {
          const requestsData = await requestsRes.json();
          setRecentRequests(requestsData.slice(0, 10)); // Show last 10
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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      // Step 1: Create the request
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/requests/create`,
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
            price: parseFloat(formData.price),
            venueId: venueId
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit request");
      }

      const responseData = await response.json();
      const { requestId, checkoutUrl: url, checkoutSessionId: sessionId } = responseData;
      
      console.log("✅ Song request created");
      console.log(`   Request ID: ${requestId}`);
      console.log(`   Checkout URL: ${url}`);
      console.log(`   Session ID: ${sessionId}`);
      
      // Step 2: Show payment modal with request details
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

  const handlePaymentSuccess = async () => {
    // Payment authorized successfully - reset form but keep modal open to show thank you page
    // The modal handles closing when user clicks "Done" or "Request Another Song"
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
    setPendingRequestId(null);
    setSubmitting(false);

    // Refresh recent requests after a short delay
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

  // Venue offline check
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
      {/* Main Content */}
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="inline-flex items-center justify-center w-18 h-18 rounded-lg mb-4 glow-purple md:ml-45 ml-40" 
                       style={{ background: "linear-gradient(135deg, #A855F7, #7C3AED)" }}>
                   <img src={logo} alt="MixMind Logo" className="w-17 h-17" />
                  </div>
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Request Your Song</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.72)' }}>Enter your details and we'll handle the rest</p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl p-8" style={{ background: 'linear-gradient(135deg, rgba(18,18,34,0.92) 0%, rgba(18,18,34,0.55) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {error && (
            <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Song Title */}
            <div>
              <label className="block text-xs font-600 mb-2" style={{ color: 'rgba(255,255,255,0.72)' }}>Song Title</label>
              <input
                type="text"
                name="songTitle"
                value={formData.songTitle}
                onChange={handleChange}
                required
                placeholder="Enter song title"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all"
                style={{
                  background: 'rgba(168,85,247,0.1)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#FFFFFF'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#A855F7';
                  e.target.style.boxShadow = '0 0 20px rgba(168,85,247,0.3)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.target.style.boxShadow = 'none';
                }}
                disabled={submitting}
              />
            </div>

            {/* Artist Name */}
            <div>
              <label className="block text-xs font-600 mb-2" style={{ color: 'rgba(255,255,255,0.72)' }}>Artist Name</label>
              <input
                type="text"
                name="artistName"
                value={formData.artistName}
                onChange={handleChange}
                required
                placeholder="Enter artist name"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all"
                style={{
                  background: 'rgba(168,85,247,0.1)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#FFFFFF'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#A855F7';
                  e.target.style.boxShadow = '0 0 20px rgba(168,85,247,0.3)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.target.style.boxShadow = 'none';
                }}
                disabled={submitting}
              />
            </div>

            {/* Your Name */}
            <div>
              <label className="block text-xs font-600 mb-2" style={{ color: 'rgba(255,255,255,0.72)' }}>Your Name</label>
              <input
                type="text"
                name="userName"
                value={formData.userName}
                onChange={handleChange}
                required
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all"
                style={{
                  background: 'rgba(168,85,247,0.1)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#FFFFFF'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#A855F7';
                  e.target.style.boxShadow = '0 0 20px rgba(168,85,247,0.3)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.target.style.boxShadow = 'none';
                }}
                disabled={submitting}
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-600 mb-2" style={{ color: 'rgba(255,255,255,0.72)' }}>Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="Enter phone number"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all"
                style={{
                  background: 'rgba(168,85,247,0.1)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#FFFFFF'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#A855F7';
                  e.target.style.boxShadow = '0 0 20px rgba(168,85,247,0.3)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.target.style.boxShadow = 'none';
                }}
                disabled={submitting}
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-600 mb-2" style={{ color: 'rgba(255,255,255,0.72)' }}>Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Enter email address"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all"
                style={{
                  background: 'rgba(168,85,247,0.1)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#FFFFFF'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#A855F7';
                  e.target.style.boxShadow = '0 0 20px rgba(168,85,247,0.3)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                  e.target.style.boxShadow = 'none';
                }}
                disabled={submitting}
              />
            </div>

            {/* Request Fee */}
            <div className="mt-6 p-4 rounded-xl" style={{ background: 'rgba(34,227,161,0.1)', border: '1px solid rgba(34,227,161,0.2)' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.72)' }}>Request Fee</p>
              <p className="font-bold text-2xl" style={{ color: '#22E3A1' }}>£{formData.price}</p>
            </div>

            {/* CTA Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full text-white font-bold py-4 rounded-2xl text-lg mt-6 flex items-center justify-center gap-2 transition-all transform hover:scale-105 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)',
                boxShadow: '0 8px 50px rgba(168,85,247,0.6)'
              }}>
              {submitting ? "Processing..." : <>Request Song <span>→</span></>}
            </button>
          </form>

          {/* Footer note */}
          <p className="text-xs text-center mt-6" style={{ color: 'rgba(255,255,255,0.4)' }}>Amount will be charged only after your request is accepted</p>
        </div>
      </div>

      {/* Payment Modal */}
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
        amount={parseFloat(formData.price)}
        venueId={venueId}
        checkoutUrl={checkoutUrl}
        checkoutSessionId={checkoutSessionId}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
