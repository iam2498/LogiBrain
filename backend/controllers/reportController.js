const Trip = require("../models/Trip");
const Expense = require("../models/Expense");
const Truck = require("../models/Truck");
const { generateTripPdf } = require("../utils/tripPdfBuilder");
const Driver = require("../models/Driver");
const TripReport = require("../models/TripReport");

exports.getDashboardKPIs = async (req, res, next) => {
  try {
    const ownerId = req.user._id;

    const [totalTrucks, totalDrivers, trips] = await Promise.all([
      Truck.countDocuments({ ownerId }),
      Driver.countDocuments({ ownerId }),
      Trip.find({ ownerId }).select("_id status expectedRevenue actualRevenue").lean(),
    ]);

    const activeTrips = trips.filter((t) =>
      ["ON_TRIP", "ACTIVE", "DRIVER_ENDED"].includes(t.status)
    ).length;

    const existingTripIds = trips.map((t) => t._id);
    const completedTrips = trips.filter((t) => t.status === "COMPLETED");

    const expenses = existingTripIds.length
      ? await Expense.find({ ownerId, tripId: { $in: existingTripIds } })
          .select("amount")
          .lean()
      : [];

    const totalRevenue = completedTrips.reduce(
      (sum, t) => sum + (t.actualRevenue ?? t.expectedRevenue ?? 0),
      0
    );
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;

    res.json({
      success: true,
      data: {
        totalTrucks,
        totalDrivers,
        activeTrips,
        totalRevenue,
        totalExpenses,
        netProfit,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getTripReport = async (req, res, next) => {
  try {
    const report = await TripReport.findOne({ tripId: req.params.tripId, ...req.scopedQuery })
      .populate("truckId", "registrationNumber")
      .populate("driverId", "licenseNumber");
      
    if (!report) return res.status(404).json({ success: false, message: "Report not found" });

    res.json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

exports.getTruckReport = async (req, res, next) => {
  try {
    const truckId = req.params.truckId;
    const reports = await TripReport.find({ truckId, ownerId: req.user._id });

    const totalRevenue = reports.reduce((sum, r) => sum + (r.grossRevenue || 0), 0);
    const totalExpenses = reports.reduce((sum, r) => sum + (r.totalExpenses || 0), 0);
    
    res.json({
      success: true,
      data: {
        truckId,
        totalTrips: reports.length,
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        reports
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getDriverReport = async (req, res, next) => {
  try {
    const driverId = req.params.driverId;
    
    // Scoping check for driver role handled by route middleware + scoped query, 
    // but we can ensure driverId matches if it's a DRIVER
    if (req.user.role === "DRIVER" && String(req.driverId) !== driverId) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const ownerId = req.user.role === "OWNER" ? req.user._id : req.ownerId;
    const reports = await TripReport.find({ driverId, ownerId });

    const totalRevenue = reports.reduce((sum, r) => sum + (r.grossRevenue || 0), 0);
    const totalExpenses = reports.reduce((sum, r) => sum + (r.totalExpenses || 0), 0);

    res.json({
      success: true,
      data: {
        driverId,
        totalTrips: reports.length,
        totalRevenue,
        totalExpenses,
        reports
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getOverallReport = async (req, res, next) => {
  try {
    const ownerId = req.user._id;
    const trips = await Trip.find({ ownerId })
      .select("_id status expectedRevenue actualRevenue actualEndDate startDate")
      .lean();
    const existingTripIds = trips.map((t) => t._id);

    const reportQuery = { ownerId, tripId: { $in: existingTripIds } };
    const expenseQuery = { ownerId, tripId: { $in: existingTripIds } };

    if (req.query.startDate && req.query.endDate) {
      const dateRange = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      };
      reportQuery.generatedAt = dateRange;
      expenseQuery.date = dateRange;
    }

    const [reports, expenses] = await Promise.all([
      existingTripIds.length ? TripReport.find(reportQuery) : [],
      existingTripIds.length ? Expense.find(expenseQuery).select("category amount").lean() : [],
    ]);

    const completedTrips = trips.filter((t) => {
      if (t.status !== "COMPLETED") return false;
      if (req.query.startDate && req.query.endDate) {
        const refDate = new Date(t.actualEndDate || t.startDate);
        return (
          refDate >= new Date(req.query.startDate) &&
          refDate <= new Date(req.query.endDate)
        );
      }
      return true;
    });

    const totalRevenue =
      reports.length > 0 && !(req.query.startDate && req.query.endDate)
        ? completedTrips.reduce((sum, t) => sum + (t.actualRevenue ?? t.expectedRevenue ?? 0), 0)
        : reports.reduce((sum, r) => sum + (r.grossRevenue || 0), 0);
    let totalExpenses = 0;

    // Aggregate expenses directly from Expense collection so active trip expenses appear immediately
    const breakdownMap = {};
    expenses.forEach((exp) => {
      const amt = exp.amount || 0;
      totalExpenses += amt;
      breakdownMap[exp.category] = (breakdownMap[exp.category] || 0) + amt;
    });

    const expenseBreakdown = Object.keys(breakdownMap).map((category) => ({
      category,
      amount: breakdownMap[category],
    }));

    res.json({
      success: true,
      data: {
        totalTrips: completedTrips.length,
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        expenseBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getAnalytics = async (req, res, next) => {
  try {
    const ownerId = req.user._id;
    
    // 1. Build Trip query
    const tripQuery = { ownerId };
    
    if (req.query.tripId) tripQuery._id = req.query.tripId;
    if (req.query.truckId) {
      tripQuery.$or = [{ truckIds: req.query.truckId }, { truckId: req.query.truckId }];
    }
    if (req.query.driverId) {
      tripQuery.$or = [{ driverIds: req.query.driverId }, { driverId: req.query.driverId }];
    }
    if (req.query.status) tripQuery.status = req.query.status;
    
    // Date filtering based on trip startDate
    if (req.query.startDate && req.query.endDate) {
       tripQuery.startDate = {
         $gte: new Date(req.query.startDate),
         $lte: new Date(req.query.endDate)
       };
    } else if (req.query.date) {
       const startOfDay = new Date(req.query.date);
       startOfDay.setHours(0,0,0,0);
       const endOfDay = new Date(req.query.date);
       endOfDay.setHours(23,59,59,999);
       tripQuery.startDate = { $gte: startOfDay, $lte: endOfDay };
    }

    // 2. Fetch Trips
    const trips = await Trip.find(tripQuery)
      .populate("truckIds", "registrationNumber")
      .populate({
        path: "driverIds",
        select: "licenseNumber userId",
        populate: { path: "userId", select: "name" },
      })
      .populate("truckId", "registrationNumber")
      .populate({
        path: "driverId",
        select: "licenseNumber userId",
        populate: { path: "userId", select: "name" },
      });
      
    const tripIds = trips.map(t => t._id);

    // 3. Fetch Expenses for these trips
    const expenses = await Expense.find({ tripId: { $in: tripIds } });

    // 4. Calculate Analytics
    let totalRevenue = 0;
    let totalExpenses = 0;
    const breakdownMap = {};

    trips.forEach(trip => {
      // Only count realized revenue from completed trips (exclude cancelled & in-progress trips)
      if (trip.status === "COMPLETED") {
        totalRevenue += (trip.actualRevenue ?? trip.expectedRevenue ?? 0);
      }
    });

    expenses.forEach(exp => {
      totalExpenses += exp.amount;
      if (breakdownMap[exp.category]) {
        breakdownMap[exp.category] += exp.amount;
      } else {
        breakdownMap[exp.category] = exp.amount;
      }
    });

    const netProfit = totalRevenue - totalExpenses;
    const profitMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const expenseBreakdown = Object.keys(breakdownMap).map(category => ({
      category,
      amount: breakdownMap[category]
    }));

    // 5. Get recently completed trips for the table (up to 5)
    // Only from the filtered dataset, and only those that are completed
    const completedTrips = trips
      .filter(t => t.status === "COMPLETED")
      .sort((a, b) => new Date(b.actualEndDate || b.expectedEndDate || b.startDate) - new Date(a.actualEndDate || a.expectedEndDate || a.startDate))
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        totalTrips: trips.length,
        grossRevenue: totalRevenue,
        totalExpenses,
        netProfit,
        profitMarginPercent,
        expenseBreakdown,
        completedTrips
      }
    });

  } catch (error) {
    next(error);
  }
};

exports.getTripReportPdf = async (req, res, next) => {
  try {
    const ownerId = req.user._id;
    const tripId = req.params.tripId;
    
    // Fetch trip with population, scoped by owner
    const trip = await Trip.findOne({ _id: tripId, ownerId })
      .populate("truckIds")
      .populate({
        path: "driverIds",
        populate: { path: "userId", select: "name email phone" }
      })
      .populate("truckId")
      .populate({
        path: "driverId",
        populate: { path: "userId", select: "name email phone" }
      });

    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    // Fetch related expenses with truck, driver, and addedBy user details
    const expenses = await Expense.find({ tripId: trip._id })
      .populate("truckId", "registrationNumber truckType")
      .populate({
        path: "driverId",
        select: "licenseNumber userId",
        populate: { path: "userId", select: "name" },
      })
      .populate("addedByUserId", "name role")
      .sort({ date: -1 });
    
    // Delegate to builder
    generateTripPdf(trip, expenses, res);

  } catch (error) {
    console.error("PDF Gen Error:", error);
    if (!res.headersSent) {
      next(error);
    }
  }
};
