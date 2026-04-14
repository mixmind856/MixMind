const express = require("express");
const Stripe = require("stripe");
const Payment = require("../../../models/Payment");
const Request = require("../../../models/Request");

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16"
});

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Stripe signature error:", err.message);
      return res.status(400).send("Invalid signature");
    }

    try {
      const obj = event.data.object;

      /* -------------------- AUTHORIZED -------------------- */
      if (event.type === "payment_intent.amount_capturable_updated") {
        const requestId = obj.metadata?.requestId;
        if (!requestId) return res.json({ received: true });

        await Payment.findOneAndUpdate(
          { stripePaymentIntentId: obj.id },
          {
            status: "authorized",
            lastStripeEventId: event.id,
            rawWebhook: obj
          }
        );

        await Request.findByIdAndUpdate(requestId, {
          status: "authorized"
        });

        console.log("✅ Payment authorized:", requestId);
      }

      /* -------------------- CAPTURED -------------------- */
      if (event.type === "payment_intent.succeeded") {
        const requestId = obj.metadata?.requestId;
        if (!requestId) return res.json({ received: true });

        await Payment.findOneAndUpdate(
          { stripePaymentIntentId: obj.id },
          {
            status: "captured",
            lastStripeEventId: event.id,
            rawWebhook: obj
          }
        );

        await Request.findByIdAndUpdate(requestId, {
          status: "paid"
        });

        console.log("💰 Payment captured:", requestId);
      }

      /* -------------------- FAILED / CANCELED -------------------- */
      if (
        event.type === "payment_intent.payment_failed" ||
        event.type === "payment_intent.canceled"
      ) {
        const requestId = obj.metadata?.requestId;

        await Payment.findOneAndUpdate(
          { stripePaymentIntentId: obj.id },
          {
            status: "failed",
            lastStripeEventId: event.id,
            rawWebhook: obj
          }
        );

        if (requestId) {
          await Request.findByIdAndUpdate(requestId, {
            status: "failed"
          });
        }

        console.log("❌ Payment failed or released:", requestId);
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Webhook error:", err);
      res.status(500).send("Webhook error");
    }
  }
);

module.exports = router;
