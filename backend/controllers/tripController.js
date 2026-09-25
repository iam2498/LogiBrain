const Trip = require("../models/Trip");
const Truck = require("../models/Truck");
const Driver = require("../models/Driver");
const { createTripSchema } = require("../validators/tripValidator");
const { generateTripReport } = require("../services/tripReportService");

exports.createTrip = async (req, res, next) => {
  try {
    const parsedData = createTripSchema.parse(req.body);

    // Validate truck and driver exist and belong to owner
    const truck = await Truck.findOne({ _id: parsedData.truckId, ownerId: req.user._id });
    if (!truck || truck.status !== "ACTIVE") {
      return res.status(400).json({ success: false, message: "Truck not found or not active" });
    }

    const driver = await Driver.findOne({ _id: parsedData.driverId, ownerId: req.user._id });
    if (!driver || driver.status !== "ACTIVE") {
      return res.status(400).json({ success: false, message: "Driver not found or not active" });
    }

    // Ensure truck or driver are not currently on an active trip (PENDING or ACTIVE)
    const activeTrip = await Trip.findOne({
      $or: [{ truckId: truck._id }, { driverId: driver._id }],
      status: { $in: ["PENDING", "ACTIVE", "DRIVER_ENDED"] }
    });
    if (activeTrip) {
      return res.status(400).json({ success: false, message: "Truck or Driver is currently on an active trip" });
    }

    const trip = await Trip.create({
      ...parsedData,
      ownerId: req.user._id,
      status: "ACTIVE", // Or PENDING, specification says PENDING -> ACTIVE -> ...
    });

    // Update truck and driver status
    await Truck.findByIdAndUpdate(truck._id, { status: "ON_TRIP" });
    await Driver.findByIdAndUpdate(driver._id, { status: "ON_TRIP" });

    res.status(201).json({ success: true, data: trip });
  } catch (error) {
    next(error);
  }
};

exports.getTrips = async (req, res, next) => {
  try {
    const query = { ...req.scopedQuery };
    
    // Optional filters
    if (req.query.status) query.status = req.query.status;
    if (req.query.truckId) query.truckId = req.query.truckId;
    if (req.query.driverId) query.driverId = req.query.driverId;

    const trips = await Trip.find(query)
      .populate("truckId", "registrationNumber")
      .populate({
        path: "driverId",
        select: "licenseNumber userId",
        populate: { path: "userId", select: "name" }
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: trips });
  } catch (error) {
    next(error);
  }
};

exports.getTripById = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, ...req.scopedQuery })
      .populate("truckId", "registrationNumber")
      .populate({
        path: "driverId",
        select: "licenseNumber userId",
        populate: { path: "userId", select: "name" }
      });

    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    res.json({ success: true, data: trip });
  } catch (error) {
    next(error);
  }
};

exports.driverEndTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, ...req.scopedQuery });
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });

    if (trip.status !== "ACTIVE") {
      return res.status(400).json({ success: false, message: "Only ACTIVE trips can be ended" });
    }

    trip.status = "DRIVER_ENDED";
    trip.actualEndDate = new Date();
    await trip.save();

    res.json({ success: true, data: trip });
  } catch (error) {
    next(error);
  }
};

exports.ownerConfirmEndTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });

    if (!["ACTIVE", "DRIVER_ENDED"].includes(trip.status)) {
      return res.status(400).json({ success: false, message: "Trip cannot be completed from its current status" });
    }

    const { actualRevenue } = req.body || {};
    if (actualRevenue !== undefined) {
      trip.actualRevenue = actualRevenue;
    } else if (trip.actualRevenue === undefined) {
      trip.actualRevenue = trip.expectedRevenue; // fallback
    }

    trip.status = "COMPLETED";
    if (!trip.actualEndDate) trip.actualEndDate = new Date();
    await trip.save();

    // Revert truck and driver status
    await Truck.findByIdAndUpdate(trip.truckId, { status: "ACTIVE" });
    await Driver.findByIdAndUpdate(trip.driverId, { status: "ACTIVE" });

    // Trigger report generation asynchronously
    await generateTripReport(trip._id);

    res.json({ success: true, data: trip });
  } catch (error) {
    next(error);
  }
};

exports.cancelTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });

    if (trip.status === "COMPLETED") {
      return res.status(400).json({ success: false, message: "Cannot cancel a completed trip" });
    }

    trip.status = "CANCELLED";
    await trip.save();

    // Revert truck and driver status
    await Truck.findByIdAndUpdate(trip.truckId, { status: "ACTIVE" });
    await Driver.findByIdAndUpdate(trip.driverId, { status: "ACTIVE" });

    res.json({ success: true, data: trip });
  } catch (error) {
    next(error);
  }
};

exports.getTripHistory = async (req, res, next) => {
  try {
    const query = { ...req.scopedQuery };
    
    // Advanced filtering could go here
    if (req.query.startDate && req.query.endDate) {
      query.startDate = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
    }
    if (req.query.truckId) query.truckId = req.query.truckId;
    if (req.query.driverId) query.driverId = req.query.driverId;
    if (req.query.status) query.status = req.query.status;

    const trips = await Trip.find(query)
      .populate("truckId", "registrationNumber")
      .populate({
        path: "driverId",
        select: "licenseNumber userId",
        populate: { path: "userId", select: "name" }
      })
      .sort({ startDate: -1 });

    res.json({ success: true, data: trips });
  } catch (error) {
    next(error);
  }
};

exports.deleteTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });

    // If trip was active/pending, revert driver and truck status
    if (["PENDING", "ACTIVE", "DRIVER_ENDED"].includes(trip.status)) {
      await Truck.findByIdAndUpdate(trip.truckId, { status: "ACTIVE" });
      await Driver.findByIdAndUpdate(trip.driverId, { status: "ACTIVE" });
    }

    // Optionally delete associated expenses (assuming Expense model is required or we can just ignore for now if not strictly linked by DB constraint)
    // Actually, let's just delete the trip.
    await Trip.findByIdAndDelete(trip._id);

    res.json({ success: true, message: "Trip deleted successfully" });
  } catch (error) {
    next(error);
  }
};
