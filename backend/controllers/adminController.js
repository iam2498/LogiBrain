const User = require("../models/User");
const Driver = require("../models/Driver");
const Truck = require("../models/Truck");
const Trip = require("../models/Trip");
const Expense = require("../models/Expense");
const mongoose = require("mongoose");

// 1. Get High-Level Dashboard Statistics
exports.getAdminDashboardStats = async (req, res, next) => {
  try {
    const [
      totalOwners,
      totalDrivers,
      totalTrucks,
      totalTrips,
      activeTrips,
      completedTrips,
      cancelledTrips,
      financialAgg,
      expenseAgg,
      recentUsers,
      recentTrips,
    ] = await Promise.all([
      User.countDocuments({ role: "OWNER" }),
      User.countDocuments({ role: "DRIVER" }),
      Truck.countDocuments(),
      Trip.countDocuments(),
      Trip.countDocuments({ status: "ON_TRIP" }),
      Trip.countDocuments({ status: "COMPLETED" }),
      Trip.countDocuments({ status: "CANCELLED" }),
      Trip.aggregate([
        {
          $group: {
            _id: null,
            totalExpectedRevenue: { $sum: "$expectedRevenue" },
            totalActualRevenue: { $sum: { $ifNull: ["$actualRevenue", "$expectedRevenue"] } },
          },
        },
      ]),
      Expense.aggregate([
        {
          $group: {
            _id: null,
            totalExpenses: { $sum: "$amount" },
          },
        },
      ]),
      User.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .select("-passwordHash")
        .populate("ownerId", "name businessName"),
      Trip.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .populate("ownerId", "name businessName")
        .populate("truckIds truckId", "registrationNumber")
        .populate({
          path: "driverIds driverId",
          populate: { path: "userId", select: "name phone" },
        }),
    ]);

    const totalRevenue = financialAgg[0]?.totalActualRevenue || 0;
    const totalExpenses = expenseAgg[0]?.totalExpenses || 0;
    const netProfit = totalRevenue - totalExpenses;

    res.json({
      success: true,
      data: {
        counts: {
          totalOwners,
          totalDrivers,
          totalTrucks,
          totalTrips,
          activeTrips,
          completedTrips,
          cancelledTrips,
        },
        financials: {
          totalRevenue,
          totalExpectedRevenue: financialAgg[0]?.totalExpectedRevenue || 0,
          totalExpenses,
          netProfit,
        },
        recentUsers,
        recentTrips,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 2. Get All Users with Filtering and Pagination
exports.getAllUsers = async (req, res, next) => {
  try {
    const { search, role, status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (role && role !== "ALL") {
      query.role = role.toUpperCase();
    }

    if (status && status !== "ALL") {
      query.isActive = status === "ACTIVE";
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { businessName: searchRegex },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select("-passwordHash")
        .populate("ownerId", "name businessName email")
        .lean(),
      User.countDocuments(query),
    ]);

    // Enhance users with related entity counts
    const enhancedUsers = await Promise.all(
      users.map(async (u) => {
        if (u.role === "OWNER") {
          const [truckCount, driverCount, tripCount] = await Promise.all([
            Truck.countDocuments({ ownerId: u._id }),
            Driver.countDocuments({ ownerId: u._id }),
            Trip.countDocuments({ ownerId: u._id }),
          ]);
          return { ...u, truckCount, driverCount, tripCount };
        } else if (u.role === "DRIVER") {
          const driverProfile = await Driver.findOne({ userId: u._id }).lean();
          return { ...u, driverProfile };
        }
        return u;
      })
    );

    res.json({
      success: true,
      data: {
        users: enhancedUsers,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// 3. Toggle User Active Status
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (String(req.user._id) === id) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own admin account",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.isActive = typeof isActive === "boolean" ? isActive : !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.name} has been ${user.isActive ? "activated" : "deactivated"}`,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 4. Get Fleet Owners Directory
exports.getAllOwners = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = { role: "OWNER" };

    if (search) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { businessName: searchRegex },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [owners, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select("-passwordHash")
        .lean(),
      User.countDocuments(query),
    ]);

    // Aggregate fleet stats for each owner
    const ownersWithStats = await Promise.all(
      owners.map(async (owner) => {
        const [truckCount, driverCount, activeTripsCount, completedTripsCount, revenueAgg] =
          await Promise.all([
            Truck.countDocuments({ ownerId: owner._id }),
            Driver.countDocuments({ ownerId: owner._id }),
            Trip.countDocuments({ ownerId: owner._id, status: "ON_TRIP" }),
            Trip.countDocuments({ ownerId: owner._id, status: "COMPLETED" }),
            Trip.aggregate([
              { $match: { ownerId: owner._id } },
              {
                $group: {
                  _id: null,
                  totalRevenue: { $sum: { $ifNull: ["$actualRevenue", "$expectedRevenue"] } },
                },
              },
            ]),
          ]);

        return {
          ...owner,
          stats: {
            truckCount,
            driverCount,
            activeTripsCount,
            completedTripsCount,
            totalTrips: activeTripsCount + completedTripsCount,
            totalRevenue: revenueAgg[0]?.totalRevenue || 0,
          },
        };
      })
    );

    res.json({
      success: true,
      data: {
        owners: ownersWithStats,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// 5. Get Single Owner Fleet Details
exports.getOwnerDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const owner = await User.findOne({ _id: id, role: "OWNER" }).select("-passwordHash");
    if (!owner) {
      return res.status(404).json({ success: false, message: "Fleet owner not found" });
    }

    const [trucks, drivers, recentTrips, expensesAgg] = await Promise.all([
      Truck.find({ ownerId: id }).populate({
        path: "currentDriverId",
        populate: { path: "userId", select: "name phone" },
      }),
      Driver.find({ ownerId: id }).populate("userId", "name email phone isActive"),
      Trip.find({ ownerId: id })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("truckIds truckId", "registrationNumber")
        .populate({
          path: "driverIds driverId",
          populate: { path: "userId", select: "name phone" },
        }),
      Expense.aggregate([
        { $match: { ownerId: new mongoose.Types.ObjectId(id) } },
        { $group: { _id: null, totalExpenses: { $sum: "$amount" } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        owner,
        trucks,
        drivers,
        recentTrips,
        totalExpenses: expensesAgg[0]?.totalExpenses || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 6. Get All Trips System-Wide
exports.getAllTrips = async (req, res, next) => {
  try {
    const { ownerId, status, search, startDate, endDate, page = 1, limit = 20 } = req.query;
    const query = {};

    if (ownerId && ownerId !== "ALL") {
      query.ownerId = ownerId;
    }

    if (status && status !== "ALL") {
      query.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { source: searchRegex },
        { destination: searchRegex },
        { customer: searchRegex },
        { material: searchRegex },
      ];
    }

    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [trips, total] = await Promise.all([
      Trip.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("ownerId", "name businessName email phone")
        .populate("truckIds truckId", "registrationNumber truckType model capacity status")
        .populate({
          path: "driverIds driverId",
          select: "licenseNumber status",
          populate: { path: "userId", select: "name phone email" },
        })
        .lean(),
      Trip.countDocuments(query),
    ]);

    // Attach expense summary to each trip
    const tripIds = trips.map((t) => t._id);
    const expensesPerTrip = await Expense.aggregate([
      { $match: { tripId: { $in: tripIds } } },
      { $group: { _id: "$tripId", totalExpense: { $sum: "$amount" }, expenseCount: { $sum: 1 } } },
    ]);

    const expenseMap = new Map();
    expensesPerTrip.forEach((item) => {
      expenseMap.set(String(item._id), {
        totalExpense: item.totalExpense,
        expenseCount: item.expenseCount,
      });
    });

    const enhancedTrips = trips.map((t) => {
      const exp = expenseMap.get(String(t._id)) || { totalExpense: 0, expenseCount: 0 };
      const effectiveRevenue = t.actualRevenue != null ? t.actualRevenue : t.expectedRevenue;
      const netProfit = effectiveRevenue - exp.totalExpense;
      return {
        ...t,
        totalExpense: exp.totalExpense,
        expenseCount: exp.expenseCount,
        netProfit,
      };
    });

    res.json({
      success: true,
      data: {
        trips: enhancedTrips,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// 7. Get Platform Aggregate Reports & Trends
exports.getAdminReports = async (req, res, next) => {
  try {
    // 1. Monthly Trends (Last 6 Months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const [monthlyRevenue, monthlyExpenses, tripsByStatus, expensesByCategory, topOwners] =
      await Promise.all([
        Trip.aggregate([
          { $match: { createdAt: { $gte: sixMonthsAgo } } },
          {
            $group: {
              _id: {
                year: { $year: "$createdAt" },
                month: { $month: "$createdAt" },
              },
              tripCount: { $sum: 1 },
              revenue: { $sum: { $ifNull: ["$actualRevenue", "$expectedRevenue"] } },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]),
        Expense.aggregate([
          { $match: { date: { $gte: sixMonthsAgo } } },
          {
            $group: {
              _id: {
                year: { $year: "$date" },
                month: { $month: "$date" },
              },
              expenses: { $sum: "$amount" },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]),
        Trip.aggregate([
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]),
        Expense.aggregate([
          {
            $group: {
              _id: "$category",
              totalAmount: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { totalAmount: -1 } },
        ]),
        Trip.aggregate([
          {
            $group: {
              _id: "$ownerId",
              totalTrips: { $sum: 1 },
              completedTrips: {
                $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] },
              },
              revenue: { $sum: { $ifNull: ["$actualRevenue", "$expectedRevenue"] } },
            },
          },
          { $sort: { revenue: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "ownerDetails",
            },
          },
          { $unwind: "$ownerDetails" },
          {
            $project: {
              _id: 1,
              name: "$ownerDetails.name",
              businessName: "$ownerDetails.businessName",
              email: "$ownerDetails.email",
              totalTrips: 1,
              completedTrips: 1,
              revenue: 1,
            },
          },
        ]),
      ]);

    // Format monthly trend data
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const trendMap = new Map();

    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      trendMap.set(key, { name: label, trips: 0, revenue: 0, expenses: 0, profit: 0 });
    }

    monthlyRevenue.forEach((item) => {
      const key = `${item._id.year}-${item._id.month}`;
      if (trendMap.has(key)) {
        const entry = trendMap.get(key);
        entry.trips = item.tripCount;
        entry.revenue = item.revenue;
        entry.profit = entry.revenue - entry.expenses;
      }
    });

    monthlyExpenses.forEach((item) => {
      const key = `${item._id.year}-${item._id.month}`;
      if (trendMap.has(key)) {
        const entry = trendMap.get(key);
        entry.expenses = item.expenses;
        entry.profit = entry.revenue - entry.expenses;
      }
    });

    const monthlyTrends = Array.from(trendMap.values());

    res.json({
      success: true,
      data: {
        monthlyTrends,
        tripsByStatus,
        expensesByCategory,
        topOwners,
      },
    });
  } catch (error) {
    next(error);
  }
};
