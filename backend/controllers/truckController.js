const Truck = require("../models/Truck");
const Trip = require("../models/Trip");
const Expense = require("../models/Expense");
const { createTruckSchema, updateTruckSchema, updateTruckStatusSchema } = require("../validators/truckValidator");
const {
  ACTIVE_TRIP_STATUSES,
  activeResourceMatchQuery,
  findActiveTripForTruck,
  formatTruckWithActiveTrip,
} = require("../utils/tripAssignmentHelper");

exports.createTruck = async (req, res, next) => {
  try {
    const parsedData = createTruckSchema.parse(req.body);

    const existingTruck = await Truck.findOne({ registrationNumber: parsedData.registrationNumber });
    if (existingTruck) {
      return res.status(400).json({ success: false, message: "Truck with this registration number already exists" });
    }

    if (parsedData.currentDriverId) {
      const driverInUse = await Truck.findOne({
        currentDriverId: parsedData.currentDriverId,
        ownerId: req.user._id,
      });
      if (driverInUse) {
        return res.status(400).json({
          success: false,
          message: `This driver is already assigned to truck ${driverInUse.registrationNumber}`,
        });
      }
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
      .populate({ path: "currentDriverId", populate: { path: "userId", select: "name email phone" } })
      .sort({ createdAt: -1 });
    
    const truckObjectIds = trucks.map(t => t._id);
    const activeTrips = await Trip.find({
      $or: activeResourceMatchQuery(truckObjectIds, null),
      status: { $in: ACTIVE_TRIP_STATUSES }
    })
      .populate({
        path: "driverIds",
        select: "licenseNumber userId status",
        populate: { path: "userId", select: "name email phone" }
      })
      .populate({
        path: "driverId",
        select: "licenseNumber userId status",
        populate: { path: "userId", select: "name email phone" }
      });

    const activeTruckMap = new Map();
    activeTrips.forEach(trip => {
      if (trip.truckIds && trip.truckIds.length) {
        trip.truckIds.forEach((id, index) => {
          if (id) {
            const sid = (id._id || id).toString();
            const assignment = (trip.assignments || []).find(
              a => (a.truckId?._id || a.truckId)?.toString() === sid
            );
            if (assignment && assignment.status === "COMPLETED") return;
            const driver = trip.driverIds && trip.driverIds[index] ? trip.driverIds[index] : null;
            activeTruckMap.set(sid, { trip, driver });
          }
        });
      }
      if (trip.truckId) {
        const sid = (trip.truckId._id || trip.truckId).toString();
        const assignment = (trip.assignments || []).find(
          a => (a.truckId?._id || a.truckId)?.toString() === sid
        );
        if (assignment && assignment.status === "COMPLETED") return;
        const driver = trip.driverId || (trip.driverIds && trip.driverIds[0]) || null;
        if (!activeTruckMap.has(sid)) {
          activeTruckMap.set(sid, { trip, driver });
        }
      }
    });
    
    let resolvedTrucks = trucks.map(truck => {
      let status = truck.status;
      if (status === "ACTIVE") status = "AVAILABLE";
      
      const truckIdStr = truck._id.toString();
      let currentDriverId = truck.currentDriverId;
      let activeTrip = null;

      if (activeTruckMap.has(truckIdStr)) {
        status = "ON_TRIP";
        const assignment = activeTruckMap.get(truckIdStr);
        activeTrip = {
          _id: assignment.trip._id,
          source: assignment.trip.source,
          destination: assignment.trip.destination,
          status: assignment.trip.status,
          material: assignment.trip.material,
        };
        // If assigned driver on active trip exists, dynamically use this driver
        if (assignment.driver) {
          currentDriverId = assignment.driver;
        }
      } else if (status === "ON_TRIP") {
         status = "AVAILABLE"; // Fix stale ON_TRIP
      }

      return {
        ...truck.toObject(),
        status,
        currentDriverId,
        activeTrip,
      };
    });

    if (req.query.status) {
      resolvedTrucks = resolvedTrucks.filter(t => t.status === req.query.status);
    }

    res.json({ success: true, data: resolvedTrucks });
  } catch (error) {
    next(error);
  }
};

exports.getTruckById = async (req, res, next) => {
  try {
    const truck = await Truck.findOne({ _id: req.params.id, ownerId: req.user._id })
      .populate({ path: "currentDriverId", populate: { path: "userId", select: "name email phone" } });
    if (!truck) {
      return res.status(404).json({ success: false, message: "Truck not found" });
    }

    const activeTrip = await findActiveTripForTruck(Trip, truck._id);

    res.json({
      success: true,
      data: formatTruckWithActiveTrip(truck, activeTrip),
    });
  } catch (error) {
    next(error);
  }
};

exports.updateTruck = async (req, res, next) => {
  try {
    const parsedData = updateTruckSchema.parse(req.body);

    if (parsedData.currentDriverId) {
      const driverInUse = await Truck.findOne({
        _id: { $ne: req.params.id },
        currentDriverId: parsedData.currentDriverId,
        ownerId: req.user._id,
      });
      if (driverInUse) {
        return res.status(400).json({
          success: false,
          message: `This driver is already assigned to truck ${driverInUse.registrationNumber}`,
        });
      }
    }

    const truck = await Truck.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      parsedData,
      { new: true, runValidators: true }
    ).populate({ path: "currentDriverId", populate: { path: "userId", select: "name email phone" } });

    if (!truck) {
      return res.status(404).json({ success: false, message: "Truck not found" });
    }

    const activeTrip = await findActiveTripForTruck(Trip, truck._id);

    res.json({
      success: true,
      data: formatTruckWithActiveTrip(truck, activeTrip),
    });
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
    ).populate({ path: "currentDriverId", populate: { path: "userId", select: "name email phone" } });

    if (!truck) {
      return res.status(404).json({ success: false, message: "Truck not found" });
    }

    const activeTrip = await findActiveTripForTruck(Trip, truck._id);

    res.json({
      success: true,
      data: formatTruckWithActiveTrip(truck, activeTrip),
    });
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

    const trips = await Trip.find({
      $or: [{ truckIds: truckId }, { truckId: truckId }],
      ownerId,
    })
      .populate({
        path: "driverIds",
        select: "licenseNumber userId",
        populate: { path: "userId", select: "name" },
      })
      .populate({
        path: "driverId",
        select: "licenseNumber userId",
        populate: { path: "userId", select: "name" },
      });
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

exports.deleteTruck = async (req, res, next) => {
  try {
    const truck = await Truck.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!truck) {
      return res.status(404).json({ success: false, message: "Truck not found" });
    }

    const activeTrip = await Trip.findOne({
      ownerId: req.user._id,
      status: { $in: ACTIVE_TRIP_STATUSES },
      $or: activeResourceMatchQuery([truck._id], null),
    });

    if (activeTrip) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove truck while it is assigned to an active trip",
      });
    }

    await Truck.findByIdAndDelete(truck._id);
    res.json({ success: true, message: "Truck removed successfully" });
  } catch (error) {
    next(error);
  }
};
