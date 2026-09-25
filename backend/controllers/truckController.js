const Truck = require("../models/Truck");
const Trip = require("../models/Trip");
const Expense = require("../models/Expense");
const { createTruckSchema, updateTruckSchema, updateTruckStatusSchema } = require("../validators/truckValidator");

exports.createTruck = async (req, res, next) => {
  try {
    const parsedData = createTruckSchema.parse(req.body);

    const existingTruck = await Truck.findOne({ registrationNumber: parsedData.registrationNumber });
    if (existingTruck) {
      return res.status(400).json({ success: false, message: "Truck with this registration number already exists" });
    }

    const truck = await Truck.create({
      ...parsedData,
      ownerId: req.user._id,
    });

    res.status(201).json({ success: true, data: truck });
  } catch (error) {
    next(error);
  }
};

exports.getTrucks = async (req, res, next) => {
  try {
    const trucks = await Truck.find({ ownerId: req.user._id })
      .populate({ path: "currentDriverId", populate: { path: "userId", select: "name" } })
      .sort({ createdAt: -1 });
    
    // Resolve dynamic operational status
    const activeTrips = await Trip.find({
      truckId: { $in: trucks.map(t => t._id) },
      status: { $in: ["PENDING", "ACTIVE", "DRIVER_ENDED"] }
    });
    const activeTruckIds = new Set(activeTrips.map(trip => trip.truckId.toString()));
    
    const resolvedTrucks = trucks.map(truck => {
      let status = truck.status;
      if (activeTruckIds.has(truck._id.toString())) {
        status = "ON_TRIP";
      } else if (status === "ON_TRIP") {
         status = "ACTIVE"; // Fix stale ON_TRIP
      }
      return { ...truck.toObject(), status };
    });

    res.json({ success: true, data: resolvedTrucks });
  } catch (error) {
    next(error);
  }
};

exports.getTruckById = async (req, res, next) => {
  try {
    const truck = await Truck.findOne({ _id: req.params.id, ownerId: req.user._id })
      .populate({ path: "currentDriverId", populate: { path: "userId", select: "name" } });
    if (!truck) {
      return res.status(404).json({ success: false, message: "Truck not found" });
    }

    const activeTrip = await Trip.findOne({
      truckId: truck._id,
      status: { $in: ["PENDING", "ACTIVE", "DRIVER_ENDED"] }
    });

    let status = truck.status;
    if (activeTrip) {
      status = "ON_TRIP";
    } else if (status === "ON_TRIP") {
      status = "ACTIVE";
    }

    res.json({ success: true, data: { ...truck.toObject(), status } });
  } catch (error) {
    next(error);
  }
};

exports.updateTruck = async (req, res, next) => {
  try {
    const parsedData = updateTruckSchema.parse(req.body);

    const truck = await Truck.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      parsedData,
      { new: true, runValidators: true }
    ).populate({ path: "currentDriverId", populate: { path: "userId", select: "name" } });

    if (!truck) {
      return res.status(404).json({ success: false, message: "Truck not found" });
    }

    const activeTrip = await Trip.findOne({
      truckId: truck._id,
      status: { $in: ["PENDING", "ACTIVE", "DRIVER_ENDED"] }
    });

    let status = truck.status;
    if (activeTrip) {
      status = "ON_TRIP";
    } else if (status === "ON_TRIP") {
      status = "ACTIVE";
    }

    res.json({ success: true, data: { ...truck.toObject(), status } });
  } catch (error) {
    next(error);
  }
};

exports.updateTruckStatus = async (req, res, next) => {
  try {
    const { status } = updateTruckStatusSchema.parse(req.body);

    const truck = await Truck.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      { status },
      { new: true }
    );

    if (!truck) {
      return res.status(404).json({ success: false, message: "Truck not found" });
    }

    const activeTrip = await Trip.findOne({
      truckId: truck._id,
      status: { $in: ["PENDING", "ACTIVE", "DRIVER_ENDED"] }
    });

    let resolvedStatus = truck.status;
    if (activeTrip) {
      resolvedStatus = "ON_TRIP";
    } else if (resolvedStatus === "ON_TRIP") {
      resolvedStatus = "ACTIVE";
    }

    res.json({ success: true, data: { ...truck.toObject(), status: resolvedStatus } });
  } catch (error) {
    next(error);
  }
};

exports.getTruckHistory = async (req, res, next) => {
  try {
    const truckId = req.params.id;
    const ownerId = req.user._id;

    const truck = await Truck.findOne({ _id: truckId, ownerId });
    if (!truck) {
      return res.status(404).json({ success: false, message: "Truck not found" });
    }

    const trips = await Trip.find({ truckId, ownerId }).populate("driverId", "licenseNumber");
    const expenses = await Expense.find({ truckId, ownerId });

    const totalRevenue = trips.reduce((acc, trip) => acc + (trip.actualRevenue || trip.expectedRevenue || 0), 0);
    const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);

    res.json({
      success: true,
      data: {
        truck,
        trips,
        financials: {
          totalRevenue,
          totalExpenses,
          netProfit: totalRevenue - totalExpenses,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
