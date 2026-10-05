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
    status: { type: String, enum: ["AVAILABLE", "ON_TRIP", "ON_LEAVE"], default: "AVAILABLE" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("Driver", driverSchema);
