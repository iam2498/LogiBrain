const Expense = require("../models/Expense");
const Trip = require("../models/Trip");
const { createExpenseSchema } = require("../validators/expenseValidator");

exports.createExpense = async (req, res, next) => {
  try {
    const parsedData = createExpenseSchema.parse(req.body);

    const trip = await Trip.findOne({ _id: parsedData.tripId, ...req.scopedQuery });
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found or access denied" });

    if (trip.status !== "ON_TRIP" && trip.status !== "ACTIVE") {
      return res.status(400).json({ success: false, message: "Expenses can only be added to trips in progress" });
    }

    let receiptUrl = null;
    if (req.file) {
      receiptUrl = `/uploads/${req.file.filename}`;
    }

    const expense = await Expense.create({
      ...parsedData,
      truckId: trip.truckId,
      driverId: trip.driverId,
      ownerId: trip.ownerId,
      receiptUrl,
      addedBy: req.user.role,
      addedByUserId: req.user._id,
    });

    res.status(201).json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
};

exports.getExpenses = async (req, res, next) => {
  try {
    const query = { ...req.scopedQuery };
    if (req.query.tripId) {
      query.tripId = req.query.tripId;
    }

    const expenses = await Expense.find(query).sort({ date: -1 });
    res.json({ success: true, data: expenses });
  } catch (error) {
    next(error);
  }
};

exports.getExpenseById = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({ _id: req.params.id, ...req.scopedQuery });
    if (!expense) return res.status(404).json({ success: false, message: "Expense not found" });

    res.json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    // Only owners can delete (enforced by route)
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, ownerId: req.user._id });
    if (!expense) return res.status(404).json({ success: false, message: "Expense not found" });

    res.json({ success: true, message: "Expense deleted successfully" });
  } catch (error) {
    next(error);
  }
};
