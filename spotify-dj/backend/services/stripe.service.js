const Stripe = require('stripe');

let _stripe;
function getStripe() {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set');
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });
  }
  return _stripe;
}

const DEFAULT_AMOUNT_PENCE = 169; // £1.69

/**
 * Create a PaymentIntent in manual capture mode (pre-auth / hold).
 * Money is only captured after genre check passes.
 * If genre check fails, the intent is cancelled → automatic release.
 */
async function createPreAuthPaymentIntent({ amountPence, venueId, trackId, trackName, artistName }) {
  const stripe = getStripe();
  const intent = await stripe.paymentIntents.create({
    amount: amountPence || DEFAULT_AMOUNT_PENCE,
    currency: 'gbp',
    capture_method: 'manual',          // pre-auth: hold funds, do not capture yet
    metadata: {
      service: 'spotify-dj',
      venueId: venueId?.toString() || '',
      trackId,
      trackName,
      artistName,
    },
  });

  return {
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    amount: intent.amount,
  };
}

/**
 * Confirm the payment is authorised (card hold placed).
 * Stripe status after card confirmation will be `requires_capture`.
 */
async function getPaymentIntent(paymentIntentId) {
  const stripe = getStripe();
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

/**
 * Capture the pre-authorised payment after genre check passes.
 */
async function capturePayment(paymentIntentId) {
  const stripe = getStripe();
  return stripe.paymentIntents.capture(paymentIntentId);
}

/**
 * Cancel (void) the pre-authorised payment if genre check fails.
 * Automatically releases the hold – user is NOT charged.
 */
async function cancelPayment(paymentIntentId) {
  const stripe = getStripe();
  return stripe.paymentIntents.cancel(paymentIntentId);
}

module.exports = {
  createPreAuthPaymentIntent,
  getPaymentIntent,
  capturePayment,
  cancelPayment,
  DEFAULT_AMOUNT_PENCE,
};
