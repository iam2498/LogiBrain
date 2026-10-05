const Trip = require("../models/Trip");
const Truck = require("../models/Truck");
const Driver = require("../models/Driver");
const { createTripSchema } = require("../validators/tripValidator");
const { generateTripReport } = require("../services/tripReportService");

exports.createTrip = async (req, res, next) => {
  try {
    const parsedData = createTripSchema.parse(req.body);

    const truck = await Truck.findOne({ _id: parsedData.truckId, ownerId: req.user._id });
    if (!truck || (truck.status !== "AVAILABLE" && truck.status !== "ACTIVE" && truck.status !== "ON_TRIP")) {
      return res.status(400).json({ success: false, message: "Truck not found or not available" });
    }

    if (parsedData.quantity && truck.capacity) {
      const tripQuantity = parseFloat(parsedData.quantity);
      const truckCapacity = parseFloat(truck.capacity);
      if (!isNaN(tripQuantity)) {
        if (isNaN(truckCapacity)) {
          return res.status(400).json({ success: false, message: "Invalid truck capacity format. Please update the truck's capacity to a number." });
        }
        if (tripQuantity > truckCapacity) {
          return res.status(400).json({ success: false, message: `Quantity cannot exceed the selected truck's capacity of ${truck.capacity}.` });
        }
      }
    }

    const driver = await Driver.findOne({ _id: parsedData.driverId, ownerId: req.user._id });
    if (!driver || (driver.status !== "AVAILABLE" && driver.status !== "ACTIVE" && driver.status !== "ON_TRIP")) {
      return res.status(400).json({ success: false, message: "Driver not found or not available" });
    }

    // Ensure truck or driver are not currently on an active trip
    const activeTrip = await Trip.findOne({
      $or: [{ truckId: truck._id }, { driverId: driver._id }],
      status: { $in: ["ON_TRIP", "ACTIVE", "DRIVER_ENDED"] }
    });
    if (activeTrip) {
      return res.status(400).json({ success: false, message: "Truck or Driver is currently on an active trip" });
    }

    const trip = await Trip.create({
      ...parsedData,
      ownerId: req.user._id,
      status: "ON_TRIP",
    });

    // Update truck and driver status, and update currentDriverId if it was overridden
    const updateTruckData = { status: "ON_TRIP" };
    if (truck.currentDriverId?.toString() !== driver._id.toString()) {
      updateTruckData.currentDriverId = driver._id;
    }
    
    await Truck.findByIdAndUpdate(truck._id, updateTruckData);
    await Driver.findByIdAndUpdate(driver._id, { status: "ON_TRIP" });

    res.status(201).json({ success: true, data: trip });
  } catch (error) {
    next(error);
  }
};

exports.updateTrip = async (req, res, next) => {
  try {
    const { updateTripSchema } = require("../validators/tripValidator");
    const parsedData = updateTripSchema.parse(req.body);

    const trip = await Trip.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });

    if (trip.status === "ON_TRIP") {
      let oldTruckId = trip.truckId;
      let oldDriverId = trip.driverId;
      let newTruckId = parsedData.truckId || oldTruckId;
      let newDriverId = parsedData.driverId || oldDriverId;

      const truck = await Truck.findOne({ _id: newTruckId, ownerId: req.user._id });
      if (!truck) {
        return res.status(404).json({ success: false, message: "Truck not found" });
      }

      const newQuantity = parsedData.quantity !== undefined ? parsedData.quantity : trip.quantity;
      if (newQuantity && truck.capacity) {
        const tripQuantity = parseFloat(newQuantity);
        const truckCapacity = parseFloat(truck.capacity);
        if (!isNaN(tripQuantity) && !isNaN(truckCapacity) && tripQuantity > truckCapacity) {
          return res.status(400).json({ success: false, message: `Quantity cannot exceed the selected truck's capacity of ${truck.capacity}.` });
        }
      }

      const truckChanged = newTruckId.toString() !== oldTruckId.toString();
      const driverChanged = newDriverId.toString() !== oldDriverId.toString();

      if (truckChanged && truck.status !== "AVAILABLE" && truck.status !== "ACTIVE") {
        return res.status(400).json({ success: false, message: "New truck not available" });
      }
      
      if (driverChanged) {
        const driver = await Driver.findOne({ _id: newDriverId, ownerId: req.user._id });
        if (!driver || (driver.status !== "AVAILABLE" && driver.status !== "ACTIVE")) {
          return res.status(400).json({ success: false, message: "New driver not found or not available" });
        }
      }

      if (truckChanged || driverChanged) {
        trip.truckId = newTruckId;
        trip.driverId = newDriverId;
        await trip.save(); // Save to reflect current trip ownership

        if (truckChanged) await revertTruckAndDriverStatus(oldTruckId, null);
        if (driverChanged) await revertTruckAndDriverStatus(null, oldDriverId);

        if (truckChanged) {
          const updateTruckData = { status: "ON_TRIP", currentDriverId: newDriverId };
          await Truck.findByIdAndUpdate(newTruckId, updateTruckData);
        } else if (driverChanged) {
          await Truck.findByIdAndUpdate(oldTruckId, { currentDriverId: newDriverId });
        }
        
        if (driverChanged) {
          await Driver.findByIdAndUpdate(newDriverId, { status: "ON_TRIP" });
        }
      }
    }

    Object.assign(trip, parsedData);
    await trip.save();

    res.json({ success: true, data: trip });
  } catch (error) {
    next(error);
  }
};

exports.getTrips = async (req, res, next) => {
  try {
    const query = { ...req.scopedQuery };
    
    if (req.query.status) {
      if (req.query.status === "ON_TRIP") {
        query.status = { $in: ["ON_TRIP", "ACTIVE"] };
      } else {
        query.status = req.query.status;
      }
    }
    if (req.query.truckId) query.truckId = req.query.truckId;
    if (req.query.driverId) query.driverId = req.query.driverId;

    let trips = await Trip.find(query)
      .populate("truckId", "registrationNumber")
      .populate({
        path: "driverId",
        select: "licenseNumber userId",
        populate: { path: "userId", select: "name" }
      })
      .sort({ createdAt: -1 });

    trips = trips.map(trip => {
      const t = trip.toObject();
      if (t.status === "ACTIVE") t.status = "ON_TRIP";
      return t;
    });

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

    const t = trip.toObject();
    if (t.status === "ACTIVE") t.status = "ON_TRIP";

    res.json({ success: true, data: t });
  } catch (error) {
    next(error);
  }
};

async function revertTruckAndDriverStatus(truckId, driverId) {
  const truck = await Truck.findById(truckId);
  if (truck && truck.status === "ON_TRIP") {
    const activeTripForTruck = await Trip.findOne({ truckId: truck._id, status: "ON_TRIP" });
    if (!activeTripForTruck) {
      await Truck.findByIdAndUpdate(truck._id, { status: "AVAILABLE" });
    }
  }
  const driver = await Driver.findById(driverId);
  if (driver && driver.status === "ON_TRIP") {
    const activeTripForDriver = await Trip.findOne({ driverId: driver._id, status: "ON_TRIP" });
    if (!activeTripForDriver) {
      await Driver.findByIdAndUpdate(driver._id, { status: "AVAILABLE" });
    }
  }
}

exports.driverEndTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, ...req.scopedQuery });
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });

    if (trip.status !== "ON_TRIP" && trip.status !== "ACTIVE") {
      return res.status(400).json({ success: false, message: "Only ON_TRIP trips can be ended" });
    }

    trip.status = "COMPLETED";
    trip.actualEndDate = new Date();
    await trip.save();

    await revertTruckAndDriverStatus(trip.truckId, trip.driverId);

    res.json({ success: true, data: trip });
  } catch (error) {
    next(error);
  }
};

exports.ownerConfirmEndTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });

    if (!["ON_TRIP", "ACTIVE", "DRIVER_ENDED", "COMPLETED"].includes(trip.status)) {
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

    await revertTruckAndDriverStatus(trip.truckId, trip.driverId);

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

    await revertTruckAndDriverStatus(trip.truckId, trip.driverId);

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

    // If trip was active, revert driver and truck status
    if (trip.status === "ON_TRIP" || trip.status === "ACTIVE") {
      await revertTruckAndDriverStatus(trip.truckId, trip.driverId);
    }

    await Trip.findByIdAndDelete(trip._id);

    res.json({ success: true, message: "Trip deleted successfully" });
  } catch (error) {
    next(error);
  }
};
