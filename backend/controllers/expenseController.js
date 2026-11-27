const Expense = require("../models/Expense");
const Trip = require("../models/Trip");
const TripReport = require("../models/TripReport");
const Truck = require("../models/Truck");
const User = require("../models/User");
const Driver = require("../models/Driver");
const { createExpenseSchema, updateExpenseSchema } = require("../validators/expenseValidator");
const { generateTripReport } = require("../services/tripReportService");
const { AppError, withTransaction, sessionOptions } = require("../utils/withTransaction");

async function enrichExpenses(expenseDocs) {
  if (!expenseDocs || expenseDocs.length === 0) return [];
  const plainExpenses = expenseDocs.map((e) => (e.toObject ? e.toObject() : e));

  const tripIds = [...new Set(plainExpenses.map((e) => e.tripId?.toString()).filter(Boolean))];
  const truckIds = [...new Set(plainExpenses.map((e) => e.truckId?.toString()).filter(Boolean))];
  const userIds = [
    ...new Set(
      plainExpenses
        .flatMap((e) => [e.addedByUserId?.toString(), e.ownerId?.toString()])
        .filter(Boolean)
    ),
  ];
  const driverIds = [...new Set(plainExpenses.map((e) => e.driverId?.toString()).filter(Boolean))];

  const [trips, trucks, users, drivers] = await Promise.all([
    tripIds.length
      ? Trip.find({ _id: { $in: tripIds } }).select("source destination status").lean()
      : [],
    truckIds.length
      ? Truck.find({ _id: { $in: truckIds } }).select("registrationNumber truckType").lean()
      : [],
    userIds.length
      ? User.find({ _id: { $in: userIds } }).select("name role").lean()
      : [],
    driverIds.length
      ? Driver.find({ _id: { $in: driverIds } })
          .select("userId licenseNumber")
          .populate("userId", "name")
          .lean()
      : [],
  ]);

  const tripMap = new Map(trips.map((t) => [t._id.toString(), t]));
  const truckMap = new Map(trucks.map((t) => [t._id.toString(), t]));
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));
  const driverMap = new Map(drivers.map((d) => [d._id.toString(), d]));

  return plainExpenses.map((exp) => {
    const addedByUser = exp.addedByUserId ? userMap.get(exp.addedByUserId.toString()) : null;
    const ownerUser = exp.ownerId ? userMap.get(exp.ownerId.toString()) : null;
    const driverDoc = exp.driverId ? driverMap.get(exp.driverId.toString()) : null;

    let addedByName = addedByUser?.name || null;
    if (!addedByName && exp.addedBy === "DRIVER") {
      addedByName = driverDoc?.userId?.name || driverDoc?.licenseNumber || null;
    }
    if (!addedByName && exp.addedBy === "OWNER") {
      addedByName = ownerUser?.name || null;
    }

    return {
      ...exp,
      trip: exp.tripId ? tripMap.get(exp.tripId.toString()) || null : null,
      truck: exp.truckId ? truckMap.get(exp.truckId.toString()) || null : null,
      driver: driverDoc
        ? {
            _id: driverDoc._id,
            name: driverDoc.userId?.name || driverDoc.licenseNumber,
            licenseNumber: driverDoc.licenseNumber,
          }
        : null,
      addedByName: addedByName || exp.addedBy,
    };
  });
}

async function syncTripReportIfNeeded(tripId, session) {
  if (!tripId) return null;
  const tripQuery = Trip.findById(tripId).select("source destination status");
  if (session) tripQuery.session(session);
  const trip = await tripQuery.lean();

  if (trip && trip.status === "COMPLETED") {
    await generateTripReport(tripId, session);
  } else {
    const reportQuery = TripReport.exists({ tripId });
    if (session) reportQuery.session(session);
    const hasReport = await reportQuery;
    if (hasReport && trip) {
      await generateTripReport(tripId, session);
    }
  }

  return trip;
}

exports.createExpense = async (req, res, next) => {
  try {
    const parsedData = createExpenseSchema.parse(req.body);

    const trip = await Trip.findOne({
      _id: parsedData.tripId,
      ...req.scopedQuery,
    });
    if (!trip)
      return res
        .status(404)
        .json({ success: false, message: "Trip not found or access denied" });

    if (trip.status !== "ON_TRIP" && trip.status !== "ACTIVE") {
      return res
        .status(400)
        .json({
          success: false,
          message: "Expenses can only be added to trips in progress",
        });
    }

    const tripTruckIds =
      trip.truckIds && trip.truckIds.length > 0
        ? trip.truckIds.map((id) => id.toString())
        : trip.truckId
        ? [trip.truckId.toString()]
        : [];
    const tripDriverIds =
      trip.driverIds && trip.driverIds.length > 0
        ? trip.driverIds.map((id) => id.toString())
        : trip.driverId
        ? [trip.driverId.toString()]
        : [];

    let resolvedTruckId = tripTruckIds[0] || null;
    let resolvedDriverId = tripDriverIds[0] || null;

    if (req.user.role === "DRIVER") {
      const driverIdStr = req.driverId.toString();
      const assignment = (trip.assignments || []).find(
        (a) => a.driverId?.toString() === driverIdStr
      );
      if (assignment && assignment.status !== "ON_TRIP") {
        return res.status(400).json({
          success: false,
          message: "You have already requested to end your leg of this trip",
        });
      }

      const driverIdx = tripDriverIds.findIndex((id) => id === driverIdStr);
      resolvedDriverId = req.driverId;
      resolvedTruckId =
        assignment?.truckId ||
        (driverIdx !== -1 && tripTruckIds[driverIdx]) ||
        tripTruckIds[0] ||
        null;
    } else if (parsedData.truckId) {
      const truckIdx = tripTruckIds.findIndex((id) => id === parsedData.truckId.toString());
      if (truckIdx === -1) {
        return res.status(400).json({
          success: false,
          message: "Selected truck is not assigned to this trip",
        });
      }
      resolvedTruckId = tripTruckIds[truckIdx];
      resolvedDriverId = tripDriverIds[truckIdx] || tripDriverIds[0] || null;
    }

    let receiptUrl = null;
    if (req.file) {
      receiptUrl = `/uploads/${req.file.filename}`;
    }

    const expense = await Expense.create({
      ...parsedData,
      truckId: resolvedTruckId,
      driverId: resolvedDriverId,
      ownerId: trip.ownerId,
      receiptUrl,
      addedBy: req.user.role,
      addedByUserId: req.user._id,
    });

    const [enriched] = await enrichExpenses([expense]);
    res.status(201).json({ success: true, data: enriched });
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

    const expenses = await Expense.find(query).sort({ date: -1 }).lean();
    const enrichedExpenses = await enrichExpenses(expenses);

    res.json({ success: true, data: enrichedExpenses });
  } catch (error) {
    next(error);
  }
};

exports.getExpenseById = async (req, res, next) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      ...req.scopedQuery,
    }).lean();
    if (!expense)
      return res
        .status(404)
        .json({ success: false, message: "Expense not found" });

    const [enriched] = await enrichExpenses([expense]);
    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
};

exports.updateExpense = async (req, res, next) => {
  try {
    const parsedData = updateExpenseSchema.parse(req.body);

    const { result } = await withTransaction(async (session) => {
      const opts = sessionOptions(session);
      const expenseQuery = Expense.findOne({ _id: req.params.id, ownerId: req.user._id });
      if (session) expenseQuery.session(session);
      const expense = await expenseQuery;
      if (!expense) throw new AppError("Expense not found", 404);

      const prevState = !session
        ? {
            category: expense.category,
            amount: expense.amount,
            date: expense.date,
            description: expense.description,
            receiptUrl: expense.receiptUrl,
          }
        : null;

      try {
        if (parsedData.category !== undefined) expense.category = parsedData.category;
        if (parsedData.amount !== undefined) expense.amount = parsedData.amount;
        if (parsedData.date !== undefined) expense.date = new Date(parsedData.date);
        if (parsedData.description !== undefined) expense.description = parsedData.description;
        if (req.file) {
          expense.receiptUrl = `/uploads/${req.file.filename}`;
        }

        await expense.save(opts);
        const trip = await syncTripReportIfNeeded(expense.tripId, session);

        return { expense, trip };
      } catch (err) {
        if (!session && prevState) {
          await Expense.findByIdAndUpdate(expense._id, prevState).catch(() => {});
        }
        throw err;
      }
    });

    const [enriched] = await enrichExpenses([result.expense]);
    res.json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    // Only owners can delete (enforced by route)
    await withTransaction(async (session) => {
      const opts = sessionOptions(session);
      const expense = await Expense.findOneAndDelete(
        { _id: req.params.id, ownerId: req.user._id },
        opts
      );
      if (!expense) throw new AppError("Expense not found", 404);

      try {
        await syncTripReportIfNeeded(expense.tripId, session);
      } catch (err) {
        if (!session) {
          await Expense.create(expense.toObject()).catch(() => {});
        }
        throw err;
      }
    });

    res.json({ success: true, message: "Expense deleted successfully" });
  } catch (error) {
    next(error);
  }
};
