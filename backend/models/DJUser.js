const { Schema, model } = require("mongoose");
const bcrypt = require("bcryptjs");

const DJUserSchema = new Schema(
  {
    // Personal info
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    stageName: { type: String, required: true },
    bio: { type: String },
    profileImage: { type: String },
    
    // DJ specialization
    genres: { type: [String], default: [] }, // Genres they specialize in
    yearsOfExperience: { type: Number },
    
    // Status
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    verificationTokenExpiry: { type: Date },
    
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
DJUserSchema.pre("save", async function () {
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
DJUserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = model("DJUser", DJUserSchema);
