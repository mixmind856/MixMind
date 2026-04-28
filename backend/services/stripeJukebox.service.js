const Stripe = require("stripe");

let _stripe;
function getStripe() {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });
  }
  return _stripe;
}

const DEFAULT_AMOUNT_PENCE = 169;

async function createPreAuthPaymentIntent({ amountPence, venueId, trackId, trackName, artistName }) {
  const stripe = getStripe();
  const intent = await stripe.paymentIntents.create({
    amount: amountPence || DEFAULT_AMOUNT_PENCE,
    currency: "gbp",
    capture_method: "manual",
    metadata: {
      service: "mixmind-spotify",
      venueId: venueId?.toString() || "",
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

async function getPaymentIntent(paymentIntentId) {
  const stripe = getStripe();
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

async function capturePayment(paymentIntentId) {
  const stripe = getStripe();
  return stripe.paymentIntents.capture(paymentIntentId);
}

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
