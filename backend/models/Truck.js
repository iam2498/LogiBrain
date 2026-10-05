const mongoose = require("mongoose");

const truckSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    registrationNumber: { type: String, required: true, unique: true },
    truckType: { type: String }, // e.g. "10 Wheeler"
    model: { type: String },
    capacity: { type: String }, // e.g. "25 Ton"
    purchaseDate: { type: Date },
    status: { type: String, enum: ["AVAILABLE", "ON_TRIP", "MAINTENANCE"], default: "AVAILABLE" },
    currentDriverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },
    imageUrl: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Truck", truckSchema);
