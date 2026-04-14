const { Schema, model } = require("mongoose");
const bcrypt = require("bcryptjs");

const DJSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone: { type: String },
    bio: { type: String },
    profileImage: { type: String },
    
    // Payments - Stripe
    stripeId: { type: String }, // Stripe customer ID for processing payouts
    
    // DJ specialization
    genres: { type: [String], default: [] }, // Genres they specialize in
    yearsOfExperience: { type: Number },
    
    // Status
    isActive: { type: Boolean, default: true },
    verificationToken: { type: String },
    verificationTokenExpiry: { type: Date },
    isVerified: { type: Boolean, default: false },
    
    // Venue access
    approvedVenues: [{ type: Schema.Types.ObjectId, ref: "Venue" }],
    
    // Stats
    totalRequestsAccepted: { type: Number, default: 0 },
    totalRequestsRejected: { type: Number, default: 0 },
    totalEventsHosted: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Hash password before saving
DJSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    throw err;
  }
});

// Method to compare passwords
DJSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = model("DJ", DJSchema);
