const VenueConfig = require('../../models/VenueConfig');
const JukeboxRequest = require('../../models/JukeboxRequest');
const spotifyService = require('../../services/spotify.service');
const stripeService = require('../../services/stripe.service');
const { evaluateTrack } = require('../../services/genreCheck.service');
const jwt = require('jsonwebtoken');

// ─────────────────────────────────────────────────────────────
// Spotify OAuth
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/jukebox/spotify/login?venueId=...
 * Redirects to Spotify authorisation page.
 * venueId is encoded in the OAuth `state` param so the callback
 * knows which venue to persist tokens to.
 */
async function spotifyLogin(req, res) {
  const { venueId } = req.query;
  if (!venueId) return res.status(400).json({ error: 'venueId required' });

  const state = Buffer.from(JSON.stringify({ venueId })).toString('base64url');
  const url = spotifyService.buildAuthUrl(state);
  res.redirect(url);
}

/**
 * GET /api/jukebox/spotify/callback
 * Spotify redirects here after user grants permission.
 * Exchanges the code for tokens and saves to the venue.
 */
async function spotifyCallback(req, res) {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`${process.env.FRONTEND_URL}/venue-setup?spotify=denied`);
  }

  let venueId;
  try {
    ({ venueId } = JSON.parse(Buffer.from(state, 'base64url').toString()));
  } catch {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }

  try {
    const tokens = await spotifyService.exchangeCode(code);
    await VenueConfig.findByIdAndUpdate(venueId, {
      spotifyAccessToken: tokens.accessToken,
      spotifyRefreshToken: tokens.refreshToken,
      spotifyTokenExpiresAt: tokens.expiresAt,
      spotifyConnected: true,
    });
    return res.redirect(`${process.env.FRONTEND_URL}/venue-setup?spotify=connected`);
  } catch (err) {
    console.error('[Spotify callback]', err.message);
    return res.redirect(`${process.env.FRONTEND_URL}/venue-setup?spotify=error`);
  }
}

// ─────────────────────────────────────────────────────────────
// Track search
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/jukebox/search?q=&venueSlug=
 */
async function searchTracks(req, res) {
  const { q, venueSlug } = req.query;
  if (!q || q.trim().length < 2) return res.status(400).json({ error: 'Query too short' });

  // Verify venue is active (optional – still allow search even without Spotify connected)
  if (venueSlug) {
    const venue = await VenueConfig.findOne({ slug: venueSlug });
    if (!venue || !venue.active) {
      return res.status(404).json({ error: 'Venue not found or inactive' });
    }
  }

  try {
    const tracks = await spotifyService.searchTracks(q.trim());
    res.json({ tracks });
    } catch (err) {
    console.error('[Search FULL ERROR]', {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });

    res.status(502).json({
      error: 'Spotify search failed',
      status: err.response?.status,
      details: err.response?.data || err.message,
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Venue public info (for jukebox page)
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/jukebox/venue/:slug
 */
async function getVenueInfo(req, res) {
  const venue = await VenueConfig.findOne(
    { slug: req.params.slug, active: true },
    'name slug allowedGenres spotifyConnected priceOverridePence'
  );
  if (!venue) return res.status(404).json({ error: 'Venue not found' });
  res.json({ venue });
}

// ─────────────────────────────────────────────────────────────
// Payment: create pre-auth
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/jukebox/create-payment
 * Body: { venueSlug, trackId, trackName, artistName, albumName, albumArtUrl, durationMs, spotifyUri, requesterName?, requesterEmail? }
 *
 * Creates a Stripe PaymentIntent in `manual` capture mode and a JukeboxRequest
 * record in `pending_payment` status.
 */
async function createPayment(req, res) {
  const {
    venueSlug, trackId, trackName, artistName,
    albumName, albumArtUrl, durationMs, spotifyUri,
    requesterName, requesterEmail,
  } = req.body;

  if (!venueSlug || !trackId || !trackName || !artistName || !spotifyUri) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const venue = await VenueConfig.findOne({ slug: venueSlug, active: true });
  if (!venue) return res.status(404).json({ error: 'Venue not found or inactive' });
  if (!venue.spotifyConnected) {
    return res.status(400).json({ error: 'Venue Spotify account not connected' });
  }

  const amountPence = venue.priceOverridePence || stripeService.DEFAULT_AMOUNT_PENCE;

  try {
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
      albumName: albumName || '',
      albumArtUrl: albumArtUrl || '',
      durationMs: durationMs || 0,
      spotifyUri,
      venueAllowedGenres: venue.allowedGenres,
      stripePaymentIntentId: intent.paymentIntentId,
      amountPence,
      status: 'pending_payment',
      requesterName: requesterName || '',
      requesterEmail: requesterEmail || '',
    });

    res.json({
      clientSecret: intent.clientSecret,
      requestId: jukeboxReq._id,
      amount: intent.amount,
    });
  } catch (err) {
    console.error('[create-payment]', err.message);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
}

// ─────────────────────────────────────────────────────────────
// Payment: confirm → genre check → capture or cancel
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/jukebox/confirm
 * Body: { requestId, paymentIntentId }
 *
 * Called by the frontend after the user has completed card entry and Stripe
 * has confirmed the PaymentIntent (status: requires_capture).
 *
 * Flow:
 *  1. Verify Stripe payment is in `requires_capture` state.
 *  2. Run genre check via Last.fm + internal map.
 *  3a. Genre matches → capture payment → add to Spotify queue.
 *  3b. Genre doesn't match → cancel payment intent (auto-release hold) → update record.
 */
async function confirmAndProcess(req, res) {
  const { requestId, paymentIntentId } = req.body;
  if (!requestId || !paymentIntentId) {
    return res.status(400).json({ error: 'requestId and paymentIntentId required' });
  }

  const jukeboxReq = await JukeboxRequest.findById(requestId);
  if (!jukeboxReq) return res.status(404).json({ error: 'Request not found' });
  if (jukeboxReq.stripePaymentIntentId !== paymentIntentId) {
    return res.status(400).json({ error: 'PaymentIntent mismatch' });
  }
  if (jukeboxReq.status !== 'pending_payment') {
    return res.status(409).json({ error: `Request already in status: ${jukeboxReq.status}` });
  }

  try {
    // Step 1: verify payment is authorised (card hold placed)
    const intent = await stripeService.getPaymentIntent(paymentIntentId);
    if (intent.status !== 'requires_capture') {
      return res.status(402).json({
        error: `Payment not authorised. Stripe status: ${intent.status}`,
      });
    }

    jukeboxReq.status = 'paid_pending_genre';
    jukeboxReq.paymentStatus = 'requires_capture';
    await jukeboxReq.save();

    // Step 2: genre check
    const { match, matched, detected } = await evaluateTrack(
      jukeboxReq.artistName,
      jukeboxReq.trackName,
      jukeboxReq.venueAllowedGenres
    );

    jukeboxReq.detectedGenres = detected;
    jukeboxReq.genreMatch = match;

    if (!match) {
      // Cancel payment – no charge
      await stripeService.cancelPayment(paymentIntentId);
      jukeboxReq.status = 'genre_rejected';
      jukeboxReq.paymentStatus = 'canceled';
      jukeboxReq.rejectionReason = `Genre mismatch. Detected: [${detected.join(', ') || 'unknown'}]. Venue allows: [${jukeboxReq.venueAllowedGenres.join(', ')}]`;
      jukeboxReq.processedAt = new Date();
      await jukeboxReq.save();

      return res.status(422).json({
        approved: false,
        reason: jukeboxReq.rejectionReason,
        detectedGenres: detected,
        allowedGenres: jukeboxReq.venueAllowedGenres,
      });
    }

        // Step 3a: add to Spotify queue FIRST
await spotifyService.addToQueue(jukeboxReq.venueId, jukeboxReq.spotifyUri);

jukeboxReq.status = 'genre_approved';
await jukeboxReq.save();

// Step 4: capture payment AFTER queue succeeds
await stripeService.capturePayment(paymentIntentId);

jukeboxReq.status = 'queued';
jukeboxReq.paymentStatus = 'succeeded';
jukeboxReq.processedAt = new Date();
await jukeboxReq.save();

    return res.json({
      approved: true,
      status: 'queued',
      matched,
      detectedGenres: detected,
      trackName: jukeboxReq.trackName,
      artistName: jukeboxReq.artistName,
    });
    } catch (err) {
    console.error('[confirm full error]', err);
    console.error('[confirm stripe data]', err.raw || err.response?.data || null);

    // Attempt to cancel the hold if something went wrong after authorisation
    try {
      await stripeService.cancelPayment(paymentIntentId);
    } catch (cancelErr) {
      console.error('[confirm cancel failed]', cancelErr.message);
    }

    jukeboxReq.status = 'failed';
    jukeboxReq.rejectionReason = err.message;
    await jukeboxReq.save().catch(() => {});

    return res.status(500).json({
      error: 'Processing failed. Payment hold released.',
      message: err.message,
      stripe: err.raw?.message || null,
      details: err.response?.data || null,
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Request status
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/jukebox/status/:requestId
 */
async function getRequestStatus(req, res) {
  const jukeboxReq = await JukeboxRequest.findById(req.params.requestId)
    .select(
      'status genreMatch detectedGenres trackName artistName albumArtUrl rejectionReason processedAt amountPence venueId createdAt'
    )
    .populate('venueId', 'slug');
  if (!jukeboxReq) return res.status(404).json({ error: 'Request not found' });

  let queuePosition = null;
  if (['queued', 'genre_approved'].includes(jukeboxReq.status)) {
    try {
      queuePosition = await JukeboxRequest.countDocuments({
        venueId: jukeboxReq.venueId?._id || jukeboxReq.venueId,
        status: { $in: ['queued', 'genre_approved'] },
        createdAt: { $lte: jukeboxReq.createdAt },
      });
    } catch {
      queuePosition = null;
    }
  }

  const payload = {
    requestId: jukeboxReq._id,
    status: jukeboxReq.status,
    trackName: jukeboxReq.trackName,
    artistName: jukeboxReq.artistName,
    albumArtUrl: jukeboxReq.albumArtUrl || '',
    detectedGenres: jukeboxReq.detectedGenres || [],
    rejectionReason: jukeboxReq.rejectionReason || '',
    processedAt: jukeboxReq.processedAt || null,
    amountPence: jukeboxReq.amountPence || stripeService.DEFAULT_AMOUNT_PENCE,
    venueId: jukeboxReq.venueId?._id || jukeboxReq.venueId || null,
    venueSlug: jukeboxReq.venueId?.slug || null,
    queuePosition,
  };

  res.json(payload);
}

// ─────────────────────────────────────────────────────────────
// Venue management (simple password-auth admin actions)
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/jukebox/venue/register
 * Body: { name, slug, password, allowedGenres[] }
 */
async function registerVenue(req, res) {
  const { name, slug, password, allowedGenres } = req.body;
  if (!name || !slug || !password) {
    return res.status(400).json({ error: 'name, slug, password required' });
  }
  const exists = await VenueConfig.findOne({ slug });
  if (exists) return res.status(409).json({ error: 'Slug already taken' });

  const passwordHash = await VenueConfig.hashPassword(password);
  const venue = await VenueConfig.create({ name, slug, passwordHash, allowedGenres: allowedGenres || [] });
  res.status(201).json({ venueId: venue._id, slug: venue.slug });
}

/**
 * POST /api/jukebox/venue/login
 * Body: { slug, password }
 */
async function venueLogin(req, res) {
  const { slug, password } = req.body;
  const venue = await VenueConfig.findOne({ slug });
  if (!venue) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await venue.verifyPassword(password);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { venueId: venue._id, slug: venue.slug },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '7d' }
  );
  res.json({ token, venueId: venue._id, slug: venue.slug, name: venue.name });
}

/**
 * PUT /api/jukebox/venue/genres  (requires venue JWT)
 * Body: { allowedGenres[] }
 */
async function updateGenres(req, res) {
  const { allowedGenres } = req.body;
  if (!Array.isArray(allowedGenres)) return res.status(400).json({ error: 'allowedGenres must be an array' });

  await VenueConfig.findByIdAndUpdate(req.venueId, { allowedGenres });
  res.json({ ok: true, allowedGenres });
}

module.exports = {
  spotifyLogin,
  spotifyCallback,
  searchTracks,
  getVenueInfo,
  createPayment,
  confirmAndProcess,
  getRequestStatus,
  registerVenue,
  venueLogin,
  updateGenres,
};
