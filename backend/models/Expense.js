const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
    truckId: { type: mongoose.Schema.Types.ObjectId, ref: "Truck", required: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: {
      type: String,
      enum: ["Fuel", "Toll", "Food", "Parking", "Repair", "Loading/Unloading", "Insurance/Permit", "Other"],
      required: true,
    },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    description: { type: String },
    receiptUrl: { type: String },
    addedBy: { type: String, enum: ["OWNER", "DRIVER"], required: true },
    addedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

expenseSchema.index({ tripId: 1 });
expenseSchema.index({ ownerId: 1, date: 1 });

module.exports = mongoose.model("Expense", expenseSchema);
