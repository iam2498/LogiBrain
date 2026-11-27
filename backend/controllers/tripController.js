const mongoose = require("mongoose");
const Trip = require("../models/Trip");
const Truck = require("../models/Truck");
const Driver = require("../models/Driver");
const { createTripSchema, updateTripSchema } = require("../validators/tripValidator");
const { generateTripReport } = require("../services/tripReportService");

// Helper to normalize populated trip objects
function normalizeTrip(tripDoc) {
  const t = tripDoc.toObject ? tripDoc.toObject() : { ...tripDoc };
  if (t.status === "ACTIVE") t.status = "ON_TRIP";

  // Ensure truckIds is populated as array
  if (!t.truckIds || t.truckIds.length === 0) {
    t.truckIds = t.truckId ? [t.truckId] : [];
  }
  // Ensure driverIds is populated as array
  if (!t.driverIds || t.driverIds.length === 0) {
    t.driverIds = t.driverId ? [t.driverId] : [];
  }
  // Ensure legacy truckId / driverId point to first elements
  if (!t.truckId && t.truckIds.length > 0) {
    t.truckId = t.truckIds[0];
  }
  if (!t.driverId && t.driverIds.length > 0) {
    t.driverId = t.driverIds[0];
  }

  return t;
}

exports.createTrip = async (req, res, next) => {
  try {
    const parsedData = createTripSchema.parse(req.body);
    const { truckIds, driverIds } = parsedData;

    if (!truckIds?.length || !driverIds?.length) {
      return res.status(400).json({
        success: false,
        message: "At least one truck and driver must be assigned",
      });
    }

    if (truckIds.length !== driverIds.length) {
      return res.status(400).json({
        success: false,
        message: "Number of trucks and drivers should be equal",
      });
    }

    // Check for duplicate truck or driver IDs in request
    const uniqueTruckIds = new Set(truckIds.map((id) => id.toString()));
    if (uniqueTruckIds.size !== truckIds.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate trucks cannot be assigned to the same trip",
      });
    }

    const uniqueDriverIds = new Set(driverIds.map((id) => id.toString()));
    if (uniqueDriverIds.size !== driverIds.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate drivers cannot be assigned to the same trip",
      });
    }

    // Validate trucks ownership
    const trucks = await Truck.find({ _id: { $in: truckIds }, ownerId: req.user._id });
    if (trucks.length !== truckIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more trucks not found or do not belong to you",
      });
    }

    // Validate truck availability
    const unavailableTruck = trucks.find(
      (truck) => truck.status !== "AVAILABLE" && truck.status !== "ACTIVE"
    );
    if (unavailableTruck) {
      return res.status(400).json({
        success: false,
        message: `Truck ${unavailableTruck.registrationNumber} is not available (Status: ${unavailableTruck.status})`,
      });
    }

    // Validate drivers ownership
    const drivers = await Driver.find({ _id: { $in: driverIds }, ownerId: req.user._id }).populate(
      "userId",
      "name"
    );
    if (drivers.length !== driverIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more drivers not found or do not belong to you",
      });
    }

    // Validate driver availability
    const unavailableDriver = drivers.find(
      (driver) => driver.status !== "AVAILABLE" && driver.status !== "ACTIVE"
    );
    if (unavailableDriver) {
      const driverName = unavailableDriver.userId?.name || unavailableDriver.licenseNumber;
      return res.status(400).json({
        success: false,
        message: `Driver ${driverName} is not available (Status: ${unavailableDriver.status})`,
      });
    }

    // Prevent assigning trucks or drivers that are already assigned to another active trip
    const activeTrip = await Trip.findOne({
      $or: [
        { truckIds: { $in: truckIds } },
        { driverIds: { $in: driverIds } },
        { truckId: { $in: truckIds } },
        { driverId: { $in: driverIds } },
      ],
      status: { $in: ["ON_TRIP", "ACTIVE", "DRIVER_ENDED"] },
    });
    if (activeTrip) {
      return res.status(400).json({
        success: false,
        message: "One or more selected trucks or drivers are already assigned to an active trip",
      });
    }

    // Validate combined truck capacity against trip quantity
    if (parsedData.quantity) {
      const tripQuantity = parseFloat(parsedData.quantity);
      let totalCapacity = 0;
      let hasCapacity = false;

      for (const truck of trucks) {
        if (truck.capacity) {
          const cap = parseFloat(truck.capacity);
          if (!isNaN(cap)) {
            totalCapacity += cap;
            hasCapacity = true;
          }
        }
      }

      if (isNaN(tripQuantity)) {
        return res.status(400).json({
          success: false,
          message: "Invalid trip quantity format",
        });
      }

      if (hasCapacity && tripQuantity > totalCapacity) {
        return res.status(400).json({
          success: false,
          message: `Quantity (${tripQuantity}) cannot exceed the combined truck capacity of ${totalCapacity}`,
        });
      }
    }

    // Create Trip document
    const trip = await Trip.create({
      ...parsedData,
      truckIds,
      driverIds,
      truckId: truckIds[0],
      driverId: driverIds[0],
      ownerId: req.user._id,
      status: "ON_TRIP",
    });

    // Update trucks: set status to ON_TRIP and pair with corresponding driver
    await Promise.all(
      truckIds.map((truckId, index) =>
        Truck.findByIdAndUpdate(truckId, {
          status: "ON_TRIP",
          currentDriverId: driverIds[index],
        })
      )
    );

    // Update drivers: set status to ON_TRIP
    await Driver.updateMany({ _id: { $in: driverIds } }, { $set: { status: "ON_TRIP" } });

    // Fetch populated trip to return
    const populatedTrip = await Trip.findById(trip._id)
      .populate("truckIds", "registrationNumber capacity truckType")
      .populate({
        path: "driverIds",
        select: "licenseNumber userId",
        populate: { path: "userId", select: "name phone" },
      })
      .populate("truckId", "registrationNumber capacity truckType")
      .populate({
        path: "driverId",
        select: "licenseNumber userId",
        populate: { path: "userId", select: "name phone" },
      });

    res.status(201).json({ success: true, data: normalizeTrip(populatedTrip) });
  } catch (error) {
    next(error);
  }
};

exports.updateTrip = async (req, res, next) => {
  try {
    const parsedData = updateTripSchema.parse(req.body);
    const trip = await Trip.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });

    if (trip.status === "ON_TRIP" || trip.status === "ACTIVE") {
      const oldTruckIds =
        trip.truckIds && trip.truckIds.length > 0
          ? trip.truckIds.map((id) => id.toString())
          : trip.truckId
          ? [trip.truckId.toString()]
          : [];
      const oldDriverIds =
        trip.driverIds && trip.driverIds.length > 0
          ? trip.driverIds.map((id) => id.toString())
          : trip.driverId
          ? [trip.driverId.toString()]
          : [];

      const newTruckIds = parsedData.truckIds || oldTruckIds;
      const newDriverIds = parsedData.driverIds || oldDriverIds;

      const trucksChanged =
        newTruckIds.length !== oldTruckIds.length ||
        newTruckIds.some((id, idx) => id !== oldTruckIds[idx]);
      const driversChanged =
        newDriverIds.length !== oldDriverIds.length ||
        newDriverIds.some((id, idx) => id !== oldDriverIds[idx]);

      if (trucksChanged || driversChanged) {
        if (newTruckIds.length !== newDriverIds.length) {
          return res.status(400).json({
            success: false,
            message: "Number of trucks and drivers should be equal",
          });
        }

        // Validate uniqueness within new lists
        if (new Set(newTruckIds).size !== newTruckIds.length) {
          return res.status(400).json({
            success: false,
            message: "Duplicate trucks cannot be assigned to the same trip",
          });
        }
        if (new Set(newDriverIds).size !== newDriverIds.length) {
          return res.status(400).json({
            success: false,
            message: "Duplicate drivers cannot be assigned to the same trip",
          });
        }

        // Check ownership of new trucks
        const trucks = await Truck.find({ _id: { $in: newTruckIds }, ownerId: req.user._id });
        if (trucks.length !== newTruckIds.length) {
          return res.status(400).json({
            success: false,
            message: "One or more trucks not found or do not belong to you",
          });
        }

        // Check availability of newly added trucks
        const newlyAddedTruckIds = newTruckIds.filter((id) => !oldTruckIds.includes(id));
        for (const tId of newlyAddedTruckIds) {
          const t = trucks.find((trk) => trk._id.toString() === tId);
          if (t && t.status !== "AVAILABLE" && t.status !== "ACTIVE") {
            return res.status(400).json({
              success: false,
              message: `New truck ${t.registrationNumber} is not available`,
            });
          }
          const activeCheck = await Trip.findOne({
            _id: { $ne: trip._id },
            $or: [{ truckIds: tId }, { truckId: tId }],
            status: { $in: ["ON_TRIP", "ACTIVE", "DRIVER_ENDED"] },
          });
          if (activeCheck) {
            return res.status(400).json({
              success: false,
              message: `Truck ${t.registrationNumber} is already on another active trip`,
            });
          }
        }

        // Check ownership of new drivers
        const drivers = await Driver.find({ _id: { $in: newDriverIds }, ownerId: req.user._id }).populate(
          "userId",
          "name"
        );
        if (drivers.length !== newDriverIds.length) {
          return res.status(400).json({
            success: false,
            message: "One or more drivers not found or do not belong to you",
          });
        }

        // Check availability of newly added drivers
        const newlyAddedDriverIds = newDriverIds.filter((id) => !oldDriverIds.includes(id));
        for (const dId of newlyAddedDriverIds) {
          const d = drivers.find((drv) => drv._id.toString() === dId);
          if (d && d.status !== "AVAILABLE" && d.status !== "ACTIVE") {
            const dName = d.userId?.name || d.licenseNumber;
            return res.status(400).json({
              success: false,
              message: `New driver ${dName} is not available`,
            });
          }
          const activeCheck = await Trip.findOne({
            _id: { $ne: trip._id },
            $or: [{ driverIds: dId }, { driverId: dId }],
            status: { $in: ["ON_TRIP", "ACTIVE", "DRIVER_ENDED"] },
          });
          if (activeCheck) {
            const dName = d ? d.userId?.name || d.licenseNumber : "Driver";
            return res.status(400).json({
              success: false,
              message: `Driver ${dName} is already on another active trip`,
            });
          }
        }

        // Validate combined capacity
        const checkQuantity = parsedData.quantity !== undefined ? parsedData.quantity : trip.quantity;
        if (checkQuantity) {
          const tripQuantity = parseFloat(checkQuantity);
          let totalCapacity = 0;
          let hasCapacity = false;
          for (const truck of trucks) {
            if (truck.capacity) {
              const cap = parseFloat(truck.capacity);
              if (!isNaN(cap)) {
                totalCapacity += cap;
                hasCapacity = true;
              }
            }
          }
          if (!isNaN(tripQuantity) && hasCapacity && tripQuantity > totalCapacity) {
            return res.status(400).json({
              success: false,
              message: `Quantity (${tripQuantity}) cannot exceed combined truck capacity of ${totalCapacity}`,
            });
          }
        }

        // Revert removed trucks and drivers
        const removedTruckIds = oldTruckIds.filter((id) => !newTruckIds.includes(id));
        const removedDriverIds = oldDriverIds.filter((id) => !newDriverIds.includes(id));
        if (removedTruckIds.length > 0 || removedDriverIds.length > 0) {
          await revertTruckAndDriverStatus(removedTruckIds, removedDriverIds);
        }

        // Update assigned trucks & drivers
        await Promise.all(
          newTruckIds.map((truckId, index) =>
            Truck.findByIdAndUpdate(truckId, {
              status: "ON_TRIP",
              currentDriverId: newDriverIds[index],
            })
          )
        );
        await Driver.updateMany({ _id: { $in: newDriverIds } }, { $set: { status: "ON_TRIP" } });

        trip.truckIds = newTruckIds;
        trip.driverIds = newDriverIds;
        trip.truckId = newTruckIds[0];
        trip.driverId = newDriverIds[0];
      }
    }

    Object.assign(trip, parsedData);
    await trip.save();

    const populatedTrip = await Trip.findById(trip._id)
      .populate("truckIds", "registrationNumber capacity truckType")
      .populate({
        path: "driverIds",
        select: "licenseNumber userId",
        populate: { path: "userId", select: "name phone" },
      })
      .populate("truckId", "registrationNumber capacity truckType")
      .populate({
        path: "driverId",
        select: "licenseNumber userId",
        populate: { path: "userId", select: "name phone" },
      });

    res.json({ success: true, data: normalizeTrip(populatedTrip) });
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

    if (req.query.truckId) {
      query.$or = [{ truckIds: req.query.truckId }, { truckId: req.query.truckId }];
    }
    if (req.query.driverId) {
      query.$or = [{ driverIds: req.query.driverId }, { driverId: req.query.driverId }];
    }

    const trips = await Trip.find(query)
      .populate("truckIds", "registrationNumber capacity truckType")
      .populate({
        path: "driverIds",
        select: "licenseNumber userId",
        populate: { path: "userId", select: "name phone" },
      })
      .populate("truckId", "registrationNumber capacity truckType")
      .populate({
        path: "driverId",
        select: "licenseNumber userId",
        populate: { path: "userId", select: "name phone" },
      })
      .sort({ createdAt: -1 });

    const normalizedTrips = trips.map(normalizeTrip);
    res.json({ success: true, data: normalizedTrips });
  } catch (error) {
    next(error);
  }
};

exports.getTripById = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, ...req.scopedQuery })
      .populate("truckIds", "registrationNumber capacity truckType")
      .populate({
        path: "driverIds",
        select: "licenseNumber userId",
        populate: { path: "userId", select: "name phone" },
      })
      .populate("truckId", "registrationNumber capacity truckType")
      .populate({
        path: "driverId",
        select: "licenseNumber userId",
        populate: { path: "userId", select: "name phone" },
      });

    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    res.json({ success: true, data: normalizeTrip(trip) });
  } catch (error) {
    next(error);
  }
};

async function revertTruckAndDriverStatus(truckIdsInput, driverIdsInput) {
  const truckIds = Array.isArray(truckIdsInput)
    ? truckIdsInput
    : truckIdsInput
    ? [truckIdsInput]
    : [];
  const driverIds = Array.isArray(driverIdsInput)
    ? driverIdsInput
    : driverIdsInput
    ? [driverIdsInput]
    : [];

  for (const truckId of truckIds) {
    if (!truckId) continue;
    const truck = await Truck.findById(truckId);
    if (truck && truck.status === "ON_TRIP") {
      const activeTripForTruck = await Trip.findOne({
        $or: [{ truckIds: truck._id }, { truckId: truck._id }],
        status: { $in: ["ON_TRIP", "ACTIVE", "DRIVER_ENDED"] },
      });
      if (!activeTripForTruck) {
        await Truck.findByIdAndUpdate(truck._id, { status: "AVAILABLE", currentDriverId: null });
      }
    }
  }

  for (const driverId of driverIds) {
    if (!driverId) continue;
    const driver = await Driver.findById(driverId);
    if (driver && driver.status === "ON_TRIP") {
      const activeTripForDriver = await Trip.findOne({
        $or: [{ driverIds: driver._id }, { driverId: driver._id }],
        status: { $in: ["ON_TRIP", "ACTIVE", "DRIVER_ENDED"] },
      });
      if (!activeTripForDriver) {
        await Driver.findByIdAndUpdate(driver._id, { status: "AVAILABLE" });
      }
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

    await revertTruckAndDriverStatus(
      trip.truckIds?.length ? trip.truckIds : trip.truckId,
      trip.driverIds?.length ? trip.driverIds : trip.driverId
    );

    res.json({ success: true, data: normalizeTrip(trip) });
  } catch (error) {
    next(error);
  }
};

exports.ownerConfirmEndTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });

    if (!["ON_TRIP", "ACTIVE", "DRIVER_ENDED", "COMPLETED"].includes(trip.status)) {
      return res
        .status(400)
        .json({ success: false, message: "Trip cannot be completed from its current status" });
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

    await revertTruckAndDriverStatus(
      trip.truckIds?.length ? trip.truckIds : trip.truckId,
      trip.driverIds?.length ? trip.driverIds : trip.driverId
    );

    // Trigger report generation asynchronously
    await generateTripReport(trip._id);

    res.json({ success: true, data: normalizeTrip(trip) });
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

    await revertTruckAndDriverStatus(
      trip.truckIds?.length ? trip.truckIds : trip.truckId,
      trip.driverIds?.length ? trip.driverIds : trip.driverId
    );

    res.json({ success: true, data: normalizeTrip(trip) });
  } catch (error) {
    next(error);
  }
};

exports.getTripHistory = async (req, res, next) => {
  try {
    const query = { ...req.scopedQuery };

    if (req.query.startDate && req.query.endDate) {
      query.startDate = { $gte: new Date(req.query.startDate), $lte: new Date(req.query.endDate) };
    }
    if (req.query.truckId) {
      query.$or = [{ truckIds: req.query.truckId }, { truckId: req.query.truckId }];
    }
    if (req.query.driverId) {
      query.$or = [{ driverIds: req.query.driverId }, { driverId: req.query.driverId }];
    }
    if (req.query.status) query.status = req.query.status;

    const trips = await Trip.find(query)
      .populate("truckIds", "registrationNumber capacity truckType")
      .populate({
        path: "driverIds",
        select: "licenseNumber userId",
        populate: { path: "userId", select: "name phone" },
      })
      .populate("truckId", "registrationNumber capacity truckType")
      .populate({
        path: "driverId",
        select: "licenseNumber userId",
        populate: { path: "userId", select: "name phone" },
      })
      .sort({ startDate: -1 });

    const normalizedTrips = trips.map(normalizeTrip);
    res.json({ success: true, data: normalizedTrips });
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
      await revertTruckAndDriverStatus(
        trip.truckIds?.length ? trip.truckIds : trip.truckId,
        trip.driverIds?.length ? trip.driverIds : trip.driverId
      );
    }

    await Trip.findByIdAndDelete(trip._id);

    res.json({ success: true, message: "Trip deleted successfully" });
  } catch (error) {
    next(error);
  }
};
