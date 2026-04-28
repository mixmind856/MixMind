const Venue = require("../../models/Venue");
const JukeboxRequest = require("../../models/JukeboxRequest");
const spotifyService = require("../../services/spotifyJukebox.service");
const stripeService = require("../../services/stripeJukebox.service");
const { getTrackGenreTags } = require("../../services/lastfmGenreService");
const { mapVenueGenresToTags, normalizeTag } = require("./genreMap");

async function spotifyLogin(req, res) {
  const { venueId, returnTo } = req.query;
  if (!venueId) return res.status(400).json({ error: "venueId required" });

  const venue = await Venue.findById(venueId).select("_id");
  if (!venue) return res.status(404).json({ error: "Venue not found" });

  try {
    const state = Buffer.from(
      JSON.stringify({
        venueId,
        returnTo: returnTo || "",
      })
    ).toString("base64url");
    const url = spotifyService.buildAuthUrl(state);
    return res.redirect(url);
  } catch (err) {
    if (err.code === "SPOTIFY_CONFIG_MISSING") {
      return res.status(500).json({ error: err.message });
    }
    return res.status(500).json({ error: "Failed to start Spotify OAuth" });
  }
}

async function spotifyCallback(req, res) {
  const { code, state, error } = req.query;
  const frontendBase = process.env.CLIENT_URL || process.env.FRONTEND_URL || "http://localhost:5173";
  const defaultDashboardUrl = `${frontendBase}/venue/dashboard`;
  const withSpotifyParam = (baseUrl, value) => {
    const separator = String(baseUrl).includes("?") ? "&" : "?";
    return `${baseUrl}${separator}spotify=${value}`;
  };

  if (error) return res.redirect(withSpotifyParam(defaultDashboardUrl, "error"));

  let venueId;
  let returnTo = "";
  try {
    ({ venueId, returnTo } = JSON.parse(Buffer.from(state, "base64url").toString()));
  } catch {
    return res.redirect(withSpotifyParam(defaultDashboardUrl, "error"));
  }
  const dashboardUrl = returnTo || defaultDashboardUrl;
  console.log("[Spotify OAuth returnTo]", returnTo);

  try {
    console.log("[Spotify OAuth] Saving tokens for venueId:", venueId);
    const tokens = await spotifyService.exchangeCode(code);
    await Venue.findByIdAndUpdate(
      venueId,
      {
      spotifyAccessToken: tokens.accessToken,
      spotifyRefreshToken: tokens.refreshToken,
      spotifyTokenExpiresAt: tokens.expiresAt,
      spotifyConnected: true,
      },
      { new: true }
    ).select("_id spotifyConnected");
    const venue = await Venue.findById(venueId).select("_id spotifyConnected");
    console.log("[Spotify Saved Venue]", {
      venueId,
      spotifyConnected: venue?.spotifyConnected,
    });
    console.log("[Spotify OAuth] Updated venue spotifyConnected:", venue?.spotifyConnected);
    const finalRedirectUrl = withSpotifyParam(dashboardUrl, "connected");
    console.log("[Spotify OAuth redirecting to]", finalRedirectUrl);
    return res.redirect(finalRedirectUrl);
  } catch (err) {
    console.error("[Spotify OAuth] Callback error:", err.message);
    const finalRedirectUrl = withSpotifyParam(dashboardUrl, "error");
    console.log("[Spotify OAuth redirecting to]", finalRedirectUrl);
    return res.redirect(finalRedirectUrl);
  }
}

function evaluateAgainstVenueGenres(venue, rawTags = []) {
  if (!venue) return { allowed: false, detectedGenres: [], allowedGenres: [] };
  if (venue.genreCheckBypass) {
    return { allowed: true, detectedGenres: [], allowedGenres: venue.preferredGenres || [] };
  }
  const allowedGenres = venue.preferredGenres || [];
  if (!allowedGenres.length) {
    return { allowed: true, detectedGenres: [], allowedGenres };
  }

  const mappedAllowedTags = mapVenueGenresToTags(allowedGenres);
  const detectedGenres = [...new Set((rawTags || []).map((t) => normalizeTag(t)).filter(Boolean))];
  const allowed = detectedGenres.some((tag) => mappedAllowedTags.has(tag));

  return { allowed, detectedGenres, allowedGenres };
}

async function searchTracks(req, res) {
  const { q, venueId } = req.query;
  if (!q || q.trim().length < 2) return res.status(400).json({ error: "Query too short" });
  if (!venueId) return res.status(400).json({ error: "venueId required" });

  const venue = await Venue.findById(venueId).select("isActive spotifyMode");
  if (!venue || !venue.isActive) return res.status(404).json({ error: "Venue not found or inactive" });
  if (!venue.spotifyMode) return res.status(400).json({ error: "Spotify mode is disabled for this venue" });

  try {
    const tracks = await spotifyService.searchTracks(q.trim());
    res.json({ tracks });
  } catch (err) {
    if (err.code === "SPOTIFY_CONFIG_MISSING") {
      return res.status(500).json({ error: err.message });
    }
    res.status(502).json({
      error: "Spotify search failed",
      status: err.response?.status,
      details: err.response?.data || err.message,
    });
  }
}

async function precheckGenre(req, res) {
  const { venueId, trackName, artistName } = req.body;
  if (!venueId || !trackName || !artistName) {
    return res.status(400).json({ error: "venueId, trackName, artistName required" });
  }

  const venue = await Venue.findById(venueId).select("isActive spotifyMode preferredGenres genreCheckBypass");
  if (!venue || !venue.isActive) return res.status(404).json({ error: "Venue not found or inactive" });
  if (!venue.spotifyMode) return res.status(400).json({ error: "Spotify mode is disabled for this venue" });

  try {
    const lastfm = await getTrackGenreTags(trackName, artistName);
    const rawTags = lastfm.success ? lastfm.tags || [] : [];
    const result = evaluateAgainstVenueGenres(venue, rawTags);

    return res.json({
      allowed: result.allowed,
      detectedGenres: result.detectedGenres,
      allowedGenres: result.allowedGenres,
      reason: result.allowed
        ? ""
        : "This song doesn't fit tonight's music policy — try another track.",
    });
  } catch (err) {
    return res.status(500).json({
      error: "Genre precheck failed",
      reason: "Could not validate this track right now. Please try again.",
    });
  }
}

async function createPayment(req, res) {
  const {
    venueId,
    trackId,
    trackName,
    artistName,
    albumName,
    albumArtUrl,
    durationMs,
    spotifyUri,
    requesterName,
    requesterEmail,
  } = req.body;

  if (!venueId || !trackId || !trackName || !artistName || !spotifyUri) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const venue = await Venue.findById(venueId).select(
    "isActive spotifyMode spotifyConnected preferredGenres genreCheckBypass"
  );
  console.log("[Jukebox create-payment] venue spotifyConnected:", !!venue?.spotifyConnected);
  if (!venue || !venue.isActive) return res.status(404).json({ error: "Venue not found or inactive" });
  if (!venue.spotifyMode) return res.status(400).json({ error: "Spotify mode is disabled for this venue" });
  if (!venue.spotifyConnected) return res.status(400).json({ error: "Venue Spotify account not connected" });

  const amountPence = stripeService.DEFAULT_AMOUNT_PENCE;

  try {
    console.log("SPOTIFY MODE FLOW ACTIVE");
    console.log("Calling /api/jukebox/create-payment");
    const intent = await stripeService.createPreAuthPaymentIntent({
      amountPence,
      venueId: venue._id,
      trackId,
      trackName,
      artistName,
    });

    const jukeboxReq = await JukeboxRequest.create({
      venueId: venue._id,
      trackId,
      trackName,
      artistName,
      albumName: albumName || "",
      albumArtUrl: albumArtUrl || "",
      durationMs: durationMs || 0,
      spotifyUri,
      venueAllowedGenres: venue.preferredGenres || [],
      stripePaymentIntentId: intent.paymentIntentId,
      amountPence,
      status: "pending_payment",
      requesterName: requesterName || "",
      requesterEmail: requesterEmail || "",
    });

    return res.json({
      clientSecret: intent.clientSecret,
      requestId: jukeboxReq._id,
      amount: intent.amount,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to create payment intent" });
  }
}

async function confirmAndProcess(req, res) {
  const { requestId, paymentIntentId } = req.body;
  if (!requestId || !paymentIntentId) {
    return res.status(400).json({ error: "requestId and paymentIntentId required" });
  }

  const jukeboxReq = await JukeboxRequest.findById(requestId);
  if (!jukeboxReq) return res.status(404).json({ error: "Request not found" });
  if (jukeboxReq.stripePaymentIntentId !== paymentIntentId) {
    return res.status(400).json({ error: "PaymentIntent mismatch" });
  }
  if (jukeboxReq.status !== "pending_payment") {
    return res.status(409).json({ error: `Request already in status: ${jukeboxReq.status}` });
  }

  try {
    console.log("SPOTIFY MODE FLOW ACTIVE");
    console.log("Calling /api/jukebox/confirm");
    const intent = await stripeService.getPaymentIntent(paymentIntentId);
    if (intent.status !== "requires_capture") {
      return res.status(402).json({ error: `Payment not authorised. Stripe status: ${intent.status}` });
    }

    jukeboxReq.status = "paid_pending_genre";
    jukeboxReq.paymentStatus = "requires_capture";
    await jukeboxReq.save();

    const venue = await Venue.findById(jukeboxReq.venueId).select(
      "preferredGenres genreCheckBypass spotifyConnected spotifyMode isActive"
    );
    if (!venue || !venue.isActive || !venue.spotifyMode || !venue.spotifyConnected) {
      throw new Error("Venue Spotify mode is not fully configured");
    }

    const lastfm = await getTrackGenreTags(jukeboxReq.trackName, jukeboxReq.artistName);
    const rawTags = lastfm.success ? lastfm.tags || [] : [];
    const result = evaluateAgainstVenueGenres(venue, rawTags);
    jukeboxReq.detectedGenres = result.detectedGenres;
    jukeboxReq.genreMatch = result.allowed;

    if (!result.allowed) {
      await stripeService.cancelPayment(paymentIntentId);
      jukeboxReq.status = "genre_rejected";
      jukeboxReq.paymentStatus = "canceled";
      jukeboxReq.rejectionReason = "Genre mismatch with venue policy";
      jukeboxReq.processedAt = new Date();
      await jukeboxReq.save();

      return res.status(422).json({
        approved: false,
        reason: jukeboxReq.rejectionReason,
        detectedGenres: result.detectedGenres,
        allowedGenres: result.allowedGenres,
      });
    }

    await spotifyService.addToQueue(jukeboxReq.venueId, jukeboxReq.spotifyUri);
    jukeboxReq.status = "genre_approved";
    await jukeboxReq.save();

    await stripeService.capturePayment(paymentIntentId);
    jukeboxReq.status = "queued";
    jukeboxReq.paymentStatus = "succeeded";
    jukeboxReq.processedAt = new Date();
    await jukeboxReq.save();

    return res.json({
      approved: true,
      status: "queued",
      detectedGenres: result.detectedGenres,
      trackName: jukeboxReq.trackName,
      artistName: jukeboxReq.artistName,
    });
  } catch (err) {
    try {
      await stripeService.cancelPayment(paymentIntentId);
    } catch (_) {
      // ignore secondary cancel failures
    }

    jukeboxReq.status = "failed";
    jukeboxReq.rejectionReason = err.message;
    await jukeboxReq.save().catch(() => {});

    return res.status(500).json({
      error: "Processing failed. Payment hold released.",
      message: err.message,
    });
  }
}

module.exports = {
  spotifyLogin,
  spotifyCallback,
  searchTracks,
  precheckGenre,
  createPayment,
  confirmAndProcess,
};
