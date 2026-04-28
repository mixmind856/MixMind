import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import VenuePaymentModalWrapper from "../componentsRequest/VenuePaymentModal";
import SpotifyPaymentModal from "../componentsRequest/SpotifyPaymentModal";
import logo from "../assets/Mixmind.jpeg";
import { Gift, Check } from "lucide-react";

export default function VenuePublicRequest() {
  const navigate = useNavigate();
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
const [acceptedGenres, setAcceptedGenres] = useState([]);
const [spotifyMode, setSpotifyMode] = useState(false);
const [spotifyQuery, setSpotifyQuery] = useState("");
const [spotifyResults, setSpotifyResults] = useState([]);
const [spotifySearching, setSpotifySearching] = useState(false);
const [spotifySearched, setSpotifySearched] = useState(false);
const [spotifySearchError, setSpotifySearchError] = useState("");
const [selectedSpotifyTrack, setSelectedSpotifyTrack] = useState(null);
const [spotifyPrecheckLoading, setSpotifyPrecheckLoading] = useState(false);
const [spotifyPaymentLoading, setSpotifyPaymentLoading] = useState(false);
const [spotifyPaymentData, setSpotifyPaymentData] = useState(null);
const suppressNextSpotifySearchRef = useRef(false);

  useEffect(() => {
    fetchVenueData();
  }, [venueId]);

  useEffect(() => {
    if (spotifyMode) {
      console.log("SPOTIFY MODE FLOW ACTIVE");
    }
  }, [spotifyMode]);

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
      setSpotifyMode(!!venueData.spotifyMode);

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

  useEffect(() => {
    if (!spotifyMode) return;
    if (suppressNextSpotifySearchRef.current) {
      suppressNextSpotifySearchRef.current = false;
      return;
    }
    const q = spotifyQuery.trim();
    if (q.length < 2) {
      setSpotifyResults([]);
      setSpotifySearched(false);
      setSpotifySearchError("");
      return;
    }

    const timer = setTimeout(async () => {
      setSpotifySearching(true);
      setSpotifySearchError("");
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/jukebox/search?q=${encodeURIComponent(q)}&venueId=${encodeURIComponent(venueId)}`
        );
        const data = await response.json();
        if (!response.ok) {
          const isSpotifyGateway = response.status === 502;
          const backendMessage = data?.error;
          throw new Error(
            isSpotifyGateway
              ? `${backendMessage || "Spotify search failed"}. Spotify is temporarily unavailable. Please retry.`
              : backendMessage || "Search failed. Please try again."
          );
        }
        const tracks = (data.tracks || []).map((t) => ({
          trackId: t.id,
          trackName: t.name,
          artistName: t.artists,
          albumName: t.album || "",
          albumArtUrl: t.albumArt || "",
          spotifyUri: t.uri,
          durationMs: t.durationMs || 0
        }));
        setSpotifyResults(tracks);
        setSpotifySearched(true);
      } catch (err) {
        setSpotifyResults([]);
        setSpotifySearched(true);
        setSpotifySearchError(err.message || "Search failed. Please try again.");
      } finally {
        setSpotifySearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [spotifyMode, spotifyQuery, venueId]);

  const handleSpotifyTrackSelect = (track) => {
    if (!spotifyMode || submitting) return;

    setError("");
    setSpotifyPaymentData(null);
    setSelectedSpotifyTrack(track);
    setFormData((prev) => ({
      ...prev,
      songTitle: track.trackName,
      artistName: track.artistName
    }));
    suppressNextSpotifySearchRef.current = true;
    setSpotifyQuery(`${track.trackName} - ${track.artistName}`);
    setSpotifyResults([]);
    setSpotifySearched(false);
    setSpotifySearchError("");
  };

  const handleChange = (e) => {
  const { name, value } = e.target;
  setFormData((prev) => ({
    ...prev,
    [name]: value
  }));

  if (acceptedGenres.length > 0) {
    setAcceptedGenres([]);
  }

  if (error) {
    setError("");
  }
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

  const submitRequest = async (selectedPriority = priorityRequest, selectedPrice = formData.price) => {
  if (spotifyMode) {
    console.warn("SPOTIFY MODE FLOW ACTIVE");
    console.warn("Blocked legacy /requests/create in Spotify mode");
    setError("Spotify mode uses secure Spotify payment flow only. Select a Spotify track above.");
    return;
  }
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
          price: couponData ? couponData.finalPrice : parseFloat(selectedPrice),
          couponCode: couponData?.couponCode || null,
          venueId: venueId,
          priorityRequest: selectedPriority,
          priorityType: selectedPriority ? "play_next" : "normal"
        })
      }
    );

      if (!response.ok) {
        const errorData = await response.json();

        if (errorData?.venueCanAccept && Array.isArray(errorData.venueCanAccept)) {
  setAcceptedGenres(errorData.venueCanAccept);
  throw new Error("This song doesn’t match this venue’s vibe right now.");
}

        throw new Error(errorData.message || errorData.error || "Failed to submit request");
      }

      const responseData = await response.json();
const { requestId, checkoutUrl: url, checkoutSessionId: sessionId } = responseData;

if (formData.email) {
  localStorage.setItem("userEmail", formData.email);
}

localStorage.setItem("lastRequestId", requestId);
localStorage.setItem("lastSongTitle", formData.songTitle);
localStorage.setItem("lastArtistName", formData.artistName);

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

    if (spotifyMode) {
      if (!selectedSpotifyTrack) {
        setError("Please select a Spotify track before continuing.");
        return;
      }
      if (!formData.userName?.trim()) {
        setError("Please enter your name.");
        return;
      }
      if (!formData.phone?.trim()) {
        setError("Please enter your phone number.");
        return;
      }

      setError("");
      setSpotifyPrecheckLoading(true);
      setSpotifyPaymentLoading(true);

      try {
        const precheckRes = await fetch(`${import.meta.env.VITE_API_URL}/jukebox/precheck-genre`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            venueId,
            trackName: selectedSpotifyTrack.trackName,
            artistName: selectedSpotifyTrack.artistName
          })
        });
        const precheckData = await precheckRes.json();
        if (!precheckRes.ok) {
          throw new Error(precheckData.error || precheckData.reason || "Genre precheck failed");
        }
        if (!precheckData.allowed) {
          setAcceptedGenres(precheckData.allowedGenres || []);
          setError(precheckData.reason || "This song doesn't fit tonight's music policy.");
          return;
        }

        console.log("SPOTIFY MODE FLOW ACTIVE");
        console.log("Calling /api/jukebox/create-payment");
        const paymentRes = await fetch(`${import.meta.env.VITE_API_URL}/jukebox/create-payment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            venueId,
            trackId: selectedSpotifyTrack.trackId,
            trackName: selectedSpotifyTrack.trackName,
            artistName: selectedSpotifyTrack.artistName,
            albumName: selectedSpotifyTrack.albumName,
            albumArtUrl: selectedSpotifyTrack.albumArtUrl,
            spotifyUri: selectedSpotifyTrack.spotifyUri,
            durationMs: selectedSpotifyTrack.durationMs,
            requesterName: formData.userName.trim(),
            requesterEmail: formData.email?.trim() || ""
          })
        });
        const paymentData = await paymentRes.json();
        if (!paymentRes.ok) {
          throw new Error(paymentData.error || "Failed to start payment.");
        }
        setSpotifyPaymentData(paymentData);
      } catch (err) {
        setSpotifyPaymentData(null);
        setError(err.message || "Failed to start payment.");
      } finally {
        setSpotifyPrecheckLoading(false);
        setSpotifyPaymentLoading(false);
      }
      return;
    }

    if (venue?.djMode) {
      setShowPriorityChoice(true);
      return;
    }

    await submitRequest();
  };

  const handlePriorityChoice = async (isPriority) => {
  if (spotifyMode) {
    console.warn("SPOTIFY MODE FLOW ACTIVE");
    console.warn("Blocked DJ priority modal route in Spotify mode");
    setShowPriorityChoice(false);
    return;
  }
  setPriorityRequest(isPriority);
  setShowPriorityChoice(false);

  const basePrice = venue?.djMode ? 5.99 : 1.69;
  const priorityPrice = venue?.djMode ? 8.99 : 2.99;
  const selectedPrice = isPriority ? priorityPrice : basePrice;

  setFormData((prev) => ({
    ...prev,
    price: selectedPrice
  }));

  await submitRequest(isPriority, selectedPrice);
};

  const handlePaymentSuccess = async () => {
    // Keep your current pricing reset logic here
    const resetPrice = venue && venue.djMode ? 5.99 : 1.69;

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

  const handleSpotifyPaymentSuccess = (data) => {
    const requestId = data?.requestId || spotifyPaymentData?.requestId;
    if (requestId) {
      localStorage.setItem("lastRequestId", requestId);
      localStorage.setItem("lastSongTitle", selectedSpotifyTrack?.trackName || "");
      localStorage.setItem("lastArtistName", selectedSpotifyTrack?.artistName || "");
      if (formData.email?.trim()) {
        localStorage.setItem("userEmail", formData.email.trim());
      }
    }
    setSpotifyPaymentData(null);
    setSelectedSpotifyTrack(null);
    setSpotifyResults([]);
    setSpotifyQuery("");
    setFormData((prev) => ({
      ...prev,
      songTitle: "",
      artistName: ""
    }));
    navigate(`/thank-you/${venueId}`);
  };

  const handleSpotifyGenreReject = (data) => {
    setSpotifyPaymentData(null);
    setSelectedSpotifyTrack(null);
    setAcceptedGenres(data?.allowedGenres || []);
    setError(data?.reason || "This song doesn't fit tonight's music policy.");
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
  {acceptedGenres.length > 0 && (
    <div
      className="mb-6 p-4 rounded-xl"
      style={{
        background: "rgba(168,85,247,0.12)",
        border: "1px solid rgba(168,85,247,0.28)"
      }}
    >
      <p className="text-sm font-semibold mb-3 text-white">
        🎧 This venue is currently accepting:
      </p>

      <div className="flex flex-wrap gap-2">
        {acceptedGenres.map((genre, index) => (
          <span
            key={index}
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{
              background: "rgba(168,85,247,0.18)",
              border: "1px solid rgba(168,85,247,0.3)",
              color: "#D8B4FE"
            }}
          >
            {genre}
          </span>
        ))}
      </div>

      <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.6)" }}>
        Try another song that fits the venue vibe.
      </p>
    </div>
  )}

  {error && (
    <div
      className="mb-6 p-4 rounded-xl"
      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
    >
      <p className="text-red-300 text-sm">{error}</p>
    </div>
  )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {spotifyMode ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-600 mb-2" style={{ color: "rgba(255,255,255,0.72)" }}>
                    Search Spotify Song
                  </label>
                  <input
                    type="text"
                    value={spotifyQuery}
                    onChange={(e) => setSpotifyQuery(e.target.value)}
                    placeholder="Type song or artist name"
                    className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none transition-all"
                    style={{
                      background: "rgba(168,85,247,0.1)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#FFFFFF"
                    }}
                    disabled={submitting}
                  />
                </div>

                {spotifySearching && (
                  <p className="text-xs text-purple-300">Searching Spotify...</p>
                )}
                {spotifySearchError && (
                  <div
                    className="p-3 rounded-xl"
                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
                  >
                    <p className="text-red-300 text-sm">{spotifySearchError}</p>
                  </div>
                )}
                {spotifyPrecheckLoading && (
                  <p className="text-xs animate-pulse" style={{ color: "#A855F7" }}>
                    Checking if this fits the venue...
                  </p>
                )}
                {spotifyPaymentLoading && (
                  <p className="text-xs animate-pulse" style={{ color: "#A855F7" }}>
                    Starting secure payment...
                  </p>
                )}

                {spotifyResults.length > 0 && (
                  <div className="max-h-72 overflow-auto rounded-xl border border-white/10 p-2 space-y-2">
                    {spotifyResults.map((r, idx) => (
                      <button
                        key={`${r.trackId || r.trackName}-${idx}`}
                        type="button"
                        onClick={() => handleSpotifyTrackSelect(r)}
                        className={`w-full text-left p-3 rounded-xl transition-colors border ${
                          selectedSpotifyTrack?.trackId === r.trackId
                            ? "bg-purple-500/20 border-purple-400/40"
                            : "hover:bg-white/10 border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {r.albumArtUrl ? (
                            <img src={r.albumArtUrl} alt={r.albumName} className="w-14 h-14 rounded-lg object-cover" />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-white/10" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-white font-semibold truncate">{r.trackName}</p>
                            <p className="text-xs text-gray-300 truncate">{r.artistName}</p>
                            <p className="text-xs text-gray-500 truncate">{r.albumName}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {spotifySearched && !spotifySearching && spotifyResults.length === 0 && !spotifySearchError && (
                  <p className="text-center text-gray-500 py-2 text-sm">No tracks found. Try another search.</p>
                )}

                {selectedSpotifyTrack && (
                  <div className="rounded-xl p-3" style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.28)" }}>
                    <p className="text-xs text-gray-400">Selected track</p>
                    <div className="flex items-center gap-3 mt-1">
                      {selectedSpotifyTrack.albumArtUrl ? (
                        <img
                          src={selectedSpotifyTrack.albumArtUrl}
                          alt={selectedSpotifyTrack.albumName}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-white/10" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm text-white font-semibold truncate">{selectedSpotifyTrack.trackName}</p>
                        <p className="text-xs text-gray-300 truncate">{selectedSpotifyTrack.artistName}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
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
              </>
            )}

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
                required={!spotifyMode}
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
              disabled={spotifyMode ? spotifyPaymentLoading || spotifyPrecheckLoading : submitting}
              className="w-full text-white font-bold py-4 rounded-2xl text-lg mt-6 flex items-center justify-center gap-2 transition-all transform hover:scale-105 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)",
                boxShadow: "0 8px 50px rgba(168,85,247,0.6)"
              }}
            >
              {spotifyMode
                ? spotifyPaymentLoading || spotifyPrecheckLoading
                  ? "Processing..."
                  : "Request Song →"
                : submitting ? "Processing..." : <>Request Song <span>→</span></>}
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

      {spotifyMode && spotifyPaymentData && selectedSpotifyTrack && (
        <SpotifyPaymentModal
          track={selectedSpotifyTrack}
          clientSecret={spotifyPaymentData.clientSecret}
          requestId={spotifyPaymentData.requestId}
          amountPence={spotifyPaymentData.amount}
          onClose={() => {
            setSpotifyPaymentData(null);
            setSelectedSpotifyTrack(null);
          }}
          onSuccess={handleSpotifyPaymentSuccess}
          onGenreReject={handleSpotifyGenreReject}
        />
      )}

      {showPriorityChoice && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
    <div
      className="w-full max-w-md rounded-[24px] px-5 py-5"
      style={{
  background:
    "radial-gradient(circle at top, rgba(45,16,74,0.35) 0%, rgba(10,10,24,0.96) 40%, rgba(5,6,14,0.98) 100%)",
  border: "1px solid rgba(214,170,255,0.28)",
  boxShadow:
    "0 0 0 1px rgba(214,170,255,0.08), 0 20px 60px rgba(0,0,0,0.55), 0 0 45px rgba(168,85,247,0.16)"
}}
    >
      {/* HEADER */}
      <div className="text-center mb-5">
        <h3 className="text-2xl font-bold mb-1 text-white">
          Move Up In the Queue? ✨
        </h3>

        <p className="text-sm" style={{ color: "rgba(196,181,253,0.72)" }}>
          Pick how soon you want it herd.
        </p>
      </div>

      {/* CARDS */}
      <div className="space-y-4">

        {/* NORMAL */}
        <button
          type="button"
          onClick={() => handlePriorityChoice(false)}
          className="w-full rounded-2xl px-4 py-4 text-left transition-all"
          style={{
  background:
    "linear-gradient(180deg, rgba(24,10,40,0.9) 0%, rgba(11,8,26,0.98) 100%)",
  border: "1px solid rgba(168,85,247,0.65)",
  boxShadow:
    "0 0 0 1px rgba(168,85,247,0.12), 0 0 28px rgba(168,85,247,0.26), inset 0 0 18px rgba(168,85,247,0.06)"
}}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
              style={{
  background: "rgba(168,85,247,0.12)",
  border: "1px solid rgba(168,85,247,0.4)",
  boxShadow: "0 0 18px rgba(168,85,247,0.18)"
}}
            >
              <span className="text-xl">🎧</span>
            </div>

            <div>
              <div className="text-lg font-semibold text-white">
                Lock My Spot 🎵
              </div>

              <div className="text-xl font-bold text-white mt-1">
                £5.99
              </div>

              <div className="text-sm mt-1 text-gray-400">
                👉 Your turn is coming
              </div>
            </div>
          </div>
        </button>

        {/* PRIORITY */}
        <button
          type="button"
          onClick={() => handlePriorityChoice(true)}
          className="w-full rounded-2xl px-4 py-4 text-left relative transition-all"
          style={{
  background:
    "linear-gradient(180deg, rgba(3,33,28,0.95) 0%, rgba(2,19,17,0.98) 100%)",
  border: "1px solid rgba(34,227,161,0.8)",
  boxShadow:
    "0 0 0 1px rgba(34,227,161,0.14), 0 0 34px rgba(34,227,161,0.32), inset 0 0 18px rgba(34,227,161,0.06)"
}}
        >
          {/* BADGE */}
          <div
            className="absolute -top-2 right-3 px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
            style={{
              background: "#3BF2B5",
              color: "#08110E"
            }}
          >
            <span style={{ color: "#FFD700" }}>⭐</span>
            MOST POPULAR
          </div>

          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
              style={{
  background: 'rgba(34,227,161,0.12)',
  border: '1px solid rgba(34,227,161,0.45)',
  animationDelay: '0.2s',
  boxShadow: '0 0 34px rgba(34,227,161,0.42), 0 0 70px rgba(34,227,161,0.18)'
}}
            >
              <span className="text-xl">🔥</span>
            </div>

            <div className="flex-1">
              <div className="text-lg font-semibold text-white">
                🔥 Priority Placement 🔥
              </div>

              <div className="mt-2">
                <div className="text-sm font-semibold text-green-300">
                  Only <span className="text-2xl font-bold">£2.99</span> more
                </div>

                <div className="text-lg font-semibold text-white mt-1">
                  £8.99 total
                </div>

                <div className="text-sm text-gray-400 mt-1">
                  👉 Be heard sooner
                </div>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* CANCEL */}
      <button
        type="button"
        onClick={() => setShowPriorityChoice(false)}
        className="w-full mt-5 text-sm font-medium"
        style={{ color: "rgba(210,190,255,0.6)" }}
      >
        Cancel
      </button>
    </div>
  </div>
)}
    </div>
  );
}