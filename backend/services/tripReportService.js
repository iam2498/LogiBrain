const Trip = require("../models/Trip");
const Expense = require("../models/Expense");
const TripReport = require("../models/TripReport");

const generateTripReport = async (tripId) => {
  try {
    const trip = await Trip.findById(tripId);
    if (!trip) throw new Error("Trip not found");

    const expenses = await Expense.find({ tripId });
    
    let totalExpenses = 0;
    const expenseBreakdownMap = {};

    expenses.forEach((exp) => {
      totalExpenses += exp.amount;
      if (expenseBreakdownMap[exp.category]) {
        expenseBreakdownMap[exp.category] += exp.amount;
      } else {
        expenseBreakdownMap[exp.category] = exp.amount;
      }
    });

    const expenseBreakdown = Object.keys(expenseBreakdownMap).map(category => ({
      category,
      amount: expenseBreakdownMap[category]
    }));

    const grossRevenue = trip.actualRevenue || trip.expectedRevenue;
    const netProfit = grossRevenue - totalExpenses;
    const profitMarginPercent = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

    await TripReport.findOneAndUpdate(
      { tripId },
      {
        ownerId: trip.ownerId,
        truckId: (trip.truckIds && trip.truckIds[0]) || trip.truckId,
        driverId: (trip.driverIds && trip.driverIds[0]) || trip.driverId,
        grossRevenue,
        totalExpenses,
        netProfit,
        profitMarginPercent,
        expenseBreakdown,
        generatedAt: new Date()
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error("Error generating trip report:", error);
  }
};

module.exports = { generateTripReport };
