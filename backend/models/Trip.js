const mongoose = require("mongoose");

const tripSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    truckId: { type: mongoose.Schema.Types.ObjectId, ref: "Truck", required: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver", required: true },
    source: { type: String, required: true },
    destination: { type: String, required: true },
    customer: { type: String },
    material: { type: String },
    quantity: { type: String },
    expectedRevenue: { type: Number, required: true },
    actualRevenue: { type: Number },
    advanceAmount: { type: Number, default: 0 },
    startDate: { type: Date, required: true },
    expectedEndDate: { type: Date },
    actualEndDate: { type: Date },
    status: {
      type: String,
      enum: ["ON_TRIP", "COMPLETED", "CANCELLED"],
      default: "ON_TRIP",
    },
  },
  { timestamps: true }
);

tripSchema.index({ ownerId: 1, status: 1 });
tripSchema.index({ driverId: 1 });
tripSchema.index({ truckId: 1 });

module.exports = mongoose.model("Trip", tripSchema);
