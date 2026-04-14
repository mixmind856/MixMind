const { Schema, model } = require("mongoose");

const WaitlistSchema = new Schema(
  {
    name: {
      type: String,
      required: true
    },
    venueName: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: true
    },
    venueType: {
      type: String,
      enum: ["bar", "club", "student", "lounge", "event", "other"],
      required: true
    },
    emailSent: {
      type: Boolean,
      default: false
    },
    emailError: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: ["pending", "contacted", "onboarded"],
      default: "pending"
    }
  },
  { timestamps: true }
);

module.exports = model("Waitlist", WaitlistSchema);
