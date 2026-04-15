const { Schema, model } = require("mongoose");

const CouponSchema = new Schema(
  {
    code: { 
      type: String, 
      required: true, 
      unique: true, 
      uppercase: true,
      index: true 
    },
    
    // Coupon details
    discount: { 
      type: Number, 
      required: true // In pounds (e.g., 1 = £1 off)
    },
    description: { type: String },
    
    // Generation & Usage
    generatedFor: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    email: { type: String, required: true }, // Email it was sent to
    
    // Status
    isUsed: { type: Boolean, default: false },
    usedBy: { type: Schema.Types.ObjectId, ref: "User" }, // User who redeemed it
    usedAt: { type: Date }, // When it was used
    usedOnRequest: { type: Schema.Types.ObjectId, ref: "Request" }, // Which request used it
    
    // Expiry
    expiresAt: { type: Date, required: true },
    isExpired: { type: Boolean, default: false },
    
    // Generation source
    sourcePayment: { type: Schema.Types.ObjectId, ref: "Payment" }, // Payment that generated this coupon
    sourceRequest: { type: Schema.Types.ObjectId, ref: "Request" }, // Request that generated this coupon
    
    // Tracking
    sentAt: { type: Date, default: Date.now },
    sentVia: { type: String, enum: ["email"], default: "email" }
  },
  { timestamps: true }
);

// Auto-set isExpired based on expiresAt
CouponSchema.pre("save", function() {
  if (this.expiresAt && new Date() > this.expiresAt) {
    this.isExpired = true;
  }
});

// Static method to generate coupon code
CouponSchema.statics.generateCode = function() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `MIXMIND${timestamp}${random}`;
};

// Method to check if coupon is valid for use
CouponSchema.methods.isValid = function() {
  return !this.isUsed && !this.isExpired && new Date() <= this.expiresAt;
};

// Method to redeem coupon
CouponSchema.methods.redeem = async function(userId, requestId) {
  if (!this.isValid()) {
    throw new Error("Coupon is no longer valid");
  }
  
  this.isUsed = true;
  this.usedBy = userId;
  this.usedAt = new Date();
  this.usedOnRequest = requestId;
  
  await this.save();
  return this;
};

module.exports = model("Coupon", CouponSchema);
