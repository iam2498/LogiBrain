const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    licenseNumber: { type: String, required: true },
    licenseExpiry: { type: Date },
    address: { type: String },
    emergencyContact: { type: String },
    imageUrl: { type: String },
    status: { type: String, enum: ["ACTIVE", "INACTIVE", "ON_TRIP"], default: "ACTIVE" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("Driver", driverSchema);
