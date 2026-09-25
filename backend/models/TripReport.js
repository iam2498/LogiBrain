const mongoose = require("mongoose");

const tripReportSchema = new mongoose.Schema(
  {
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true, unique: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    truckId: { type: mongoose.Schema.Types.ObjectId, ref: "Truck" },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },
    grossRevenue: { type: Number },
    totalExpenses: { type: Number },
    netProfit: { type: Number },
    profitMarginPercent: { type: Number },
    expenseBreakdown: [
      {
        category: { type: String },
        amount: { type: Number },
      },
    ],
    generatedAt: { type: Date, default: Date.now },
  }
);

module.exports = mongoose.model("TripReport", tripReportSchema);
