const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["ADMIN", "OWNER", "DRIVER"], required: true },
    businessName: { type: String }, // only for OWNER
    businessAddress: { type: String }, // only for OWNER
    gstNumber: { type: String }, // optional, OWNER only
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // only for DRIVER
    isActive: { type: Boolean, default: true },
    accountStatus: { type: String, enum: ["ACTIVE", "SUSPENDED"], default: "ACTIVE" },
    lastLoginAt: { type: Date },
    suspendedAt: { type: Date },
    suspensionReason: { type: String },
    suspendedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resetPasswordOtp: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
