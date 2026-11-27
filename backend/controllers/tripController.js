const Trip = require("../models/Trip");
const Truck = require("../models/Truck");
const Driver = require("../models/Driver");
const Expense = require("../models/Expense");
const TripReport = require("../models/TripReport");
const { createTripSchema, updateTripSchema } = require("../validators/tripValidator");
const { generateTripReport } = require("../services/tripReportService");
const { AppError, withTransaction, sessionOptions } = require("../utils/withTransaction");
const {
  ACTIVE_TRIP_STATUSES,
  activeResourceMatchQuery,
} = require("../utils/tripAssignmentHelper");

function withSession(query, session) {
  return session ? query.session(session) : query;
}

function populateTripQuery(query) {
  return query
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
}

function validateTripCapacity(trucks, quantity) {
  if (quantity === undefined || quantity === null || quantity === "") return;
  const tripQuantity = parseFloat(quantity);
  if (isNaN(tripQuantity)) {
    throw new AppError("Invalid trip quantity format", 400);
  }

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

  if (hasCapacity && tripQuantity > totalCapacity) {
    throw new AppError(
      `Quantity (${tripQuantity}) cannot exceed the combined truck capacity of ${totalCapacity}`,
      400
    );
  }
}

async function snapshotResources(truckIds, driverIds, session) {
  const cleanTruckIds = (truckIds || []).filter(Boolean);
  const cleanDriverIds = (driverIds || []).filter(Boolean);
  const [trucks, drivers] = await Promise.all([
    cleanTruckIds.length
      ? withSession(Truck.find({ _id: { $in: cleanTruckIds } }).select("status currentDriverId"), session)
      : [],
    cleanDriverIds.length
      ? withSession(Driver.find({ _id: { $in: cleanDriverIds } }).select("status"), session)
      : [],
  ]);

  return {
    trucks: trucks.map((t) => ({ _id: t._id, status: t.status, currentDriverId: t.currentDriverId })),
    drivers: drivers.map((d) => ({ _id: d._id, status: d.status })),
  };
}

async function restoreResources(snapshots) {
  if (!snapshots) return;
  await Promise.all([
    ...snapshots.trucks.map((t) =>
      Truck.findByIdAndUpdate(t._id, {
        status: t.status,
        currentDriverId: t.currentDriverId,
      }).catch(() => {})
    ),
    ...snapshots.drivers.map((d) =>
      Driver.findByIdAndUpdate(d._id, { status: d.status }).catch(() => {})
    ),
  ]);
}

function ensureTripAssignments(trip) {
  if (Array.isArray(trip.assignments) && trip.assignments.length > 0) {
    return trip.assignments;
  }
  const truckIds =
    trip.truckIds && trip.truckIds.length > 0
      ? trip.truckIds
      : trip.truckId
      ? [trip.truckId]
      : [];
  const driverIds =
    trip.driverIds && trip.driverIds.length > 0
      ? trip.driverIds
      : trip.driverId
      ? [trip.driverId]
      : [];
  const fallbackStatus =
    trip.status === "COMPLETED"
      ? "COMPLETED"
      : trip.status === "DRIVER_ENDED"
      ? "END_REQUESTED"
      : "ON_TRIP";

  return truckIds.map((tId, idx) => ({
    truckId: tId?._id || tId,
    driverId: driverIds[idx]?._id || driverIds[idx],
    status: fallbackStatus,
  }));
}

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

  t.assignments = ensureTripAssignments(t);

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

    const { result: createdTrip } = await withTransaction(async (session) => {
      const opts = sessionOptions(session);

      const trucks = await withSession(
        Truck.find({ _id: { $in: truckIds }, ownerId: req.user._id }),
        session
      );
      if (trucks.length !== truckIds.length) {
        throw new AppError("One or more trucks not found or do not belong to you", 400);
      }

      const unavailableTruck = trucks.find(
        (truck) => truck.status !== "AVAILABLE" && truck.status !== "ACTIVE"
      );
      if (unavailableTruck) {
        throw new AppError(
          `Truck ${unavailableTruck.registrationNumber} is not available (Status: ${unavailableTruck.status})`,
          400
        );
      }

      const drivers = await withSession(
        Driver.find({ _id: { $in: driverIds }, ownerId: req.user._id }).populate("userId", "name"),
        session
      );
      if (drivers.length !== driverIds.length) {
        throw new AppError("One or more drivers not found or do not belong to you", 400);
      }

      const unavailableDriver = drivers.find(
        (driver) => driver.status !== "AVAILABLE" && driver.status !== "ACTIVE"
      );
      if (unavailableDriver) {
        const driverName = unavailableDriver.userId?.name || unavailableDriver.licenseNumber;
        throw new AppError(
          `Driver ${driverName} is not available (Status: ${unavailableDriver.status})`,
          400
        );
      }

      const activeTrip = await withSession(
        Trip.findOne({
          $or: activeResourceMatchQuery(truckIds, driverIds),
          status: { $in: ["ON_TRIP", "ACTIVE", "DRIVER_ENDED"] },
        }),
        session
      );
      if (activeTrip) {
        throw new AppError(
          "One or more selected trucks or drivers are already assigned to an active trip",
          400
        );
      }

      validateTripCapacity(trucks, parsedData.quantity);

      const snapshots = !session
        ? {
            trucks: trucks.map((t) => ({
              _id: t._id,
              status: t.status,
              currentDriverId: t.currentDriverId,
            })),
            drivers: drivers.map((d) => ({ _id: d._id, status: d.status })),
          }
        : null;

      let trip = null;
      try {
        trip = new Trip({
          ...parsedData,
          truckIds,
          driverIds,
          truckId: truckIds[0],
          driverId: driverIds[0],
          assignments: truckIds.map((truckId, index) => ({
            truckId,
            driverId: driverIds[index],
            status: "ON_TRIP",
          })),
          ownerId: req.user._id,
          status: "ON_TRIP",
        });
        await trip.save(opts);

        await Promise.all(
          truckIds.map((truckId, index) =>
            Truck.findByIdAndUpdate(
              truckId,
              {
                status: "ON_TRIP",
                currentDriverId: driverIds[index],
              },
              opts
            )
          )
        );

        await Driver.updateMany(
          { _id: { $in: driverIds } },
          { $set: { status: "ON_TRIP" } },
          opts
        );

        return trip;
      } catch (err) {
        if (!session) {
          if (trip?._id) await Trip.findByIdAndDelete(trip._id).catch(() => {});
          await restoreResources(snapshots);
        }
        throw err;
      }
    });

    const populatedTrip = await populateTripQuery(Trip.findById(createdTrip._id));
    res.status(201).json({ success: true, data: normalizeTrip(populatedTrip) });
  } catch (error) {
    next(error);
  }
};

exports.updateTrip = async (req, res, next) => {
  try {
    const parsedData = updateTripSchema.parse(req.body);
    const { status: requestedStatus, ...updateFields } = parsedData;

    const { result: updatedTrip } = await withTransaction(async (session) => {
      const opts = sessionOptions(session);
      const trip = await withSession(
        Trip.findOne({ _id: req.params.id, ownerId: req.user._id }),
        session
      );
      if (!trip) throw new AppError("Trip not found", 404);

      if (trip.status === "COMPLETED" || trip.status === "CANCELLED") {
        throw new AppError(`Cannot edit a ${trip.status.toLowerCase()} trip`, 400);
      }

      if (requestedStatus !== undefined && requestedStatus !== trip.status) {
        throw new AppError(
          "Trip status cannot be changed directly; use trip completion or cancellation actions",
          400
        );
      }

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

      const newTruckIds = updateFields.truckIds || oldTruckIds;
      const newDriverIds = updateFields.driverIds || oldDriverIds;

      const trucksChanged =
        newTruckIds.length !== oldTruckIds.length ||
        newTruckIds.some((id, idx) => id !== oldTruckIds[idx]);
      const driversChanged =
        newDriverIds.length !== oldDriverIds.length ||
        newDriverIds.some((id, idx) => id !== oldDriverIds[idx]);

      let trucks = null;
      if (trucksChanged || driversChanged) {
        if (newTruckIds.length !== newDriverIds.length) {
          throw new AppError("Number of trucks and drivers should be equal", 400);
        }

        if (new Set(newTruckIds).size !== newTruckIds.length) {
          throw new AppError("Duplicate trucks cannot be assigned to the same trip", 400);
        }
        if (new Set(newDriverIds).size !== newDriverIds.length) {
          throw new AppError("Duplicate drivers cannot be assigned to the same trip", 400);
        }

        trucks = await withSession(
          Truck.find({ _id: { $in: newTruckIds }, ownerId: req.user._id }),
          session
        );
        if (trucks.length !== newTruckIds.length) {
          throw new AppError("One or more trucks not found or do not belong to you", 400);
        }

        const newlyAddedTruckIds = newTruckIds.filter((id) => !oldTruckIds.includes(id));
        for (const tId of newlyAddedTruckIds) {
          const t = trucks.find((trk) => trk._id.toString() === tId);
          if (t && t.status !== "AVAILABLE" && t.status !== "ACTIVE") {
            throw new AppError(`New truck ${t.registrationNumber} is not available`, 400);
          }
          const activeCheck = await withSession(
            Trip.findOne({
              _id: { $ne: trip._id },
              $or: activeResourceMatchQuery([tId], null),
              status: { $in: ACTIVE_TRIP_STATUSES },
            }),
            session
          );
          if (activeCheck) {
            throw new AppError(`Truck ${t.registrationNumber} is already on another active trip`, 400);
          }
        }

        const drivers = await withSession(
          Driver.find({ _id: { $in: newDriverIds }, ownerId: req.user._id }).populate("userId", "name"),
          session
        );
        if (drivers.length !== newDriverIds.length) {
          throw new AppError("One or more drivers not found or do not belong to you", 400);
        }

        const newlyAddedDriverIds = newDriverIds.filter((id) => !oldDriverIds.includes(id));
        for (const dId of newlyAddedDriverIds) {
          const d = drivers.find((drv) => drv._id.toString() === dId);
          if (d && d.status !== "AVAILABLE" && d.status !== "ACTIVE") {
            const dName = d.userId?.name || d.licenseNumber;
            throw new AppError(`New driver ${dName} is not available`, 400);
          }
          const activeCheck = await withSession(
            Trip.findOne({
              _id: { $ne: trip._id },
              $or: activeResourceMatchQuery(null, [dId]),
              status: { $in: ACTIVE_TRIP_STATUSES },
            }),
            session
          );
          if (activeCheck) {
            const dName = d ? d.userId?.name || d.licenseNumber : "Driver";
            throw new AppError(`Driver ${dName} is already on another active trip`, 400);
          }
        }
      }

      if (updateFields.quantity !== undefined || trucksChanged) {
        if (!trucks) {
          trucks = await withSession(
            Truck.find({ _id: { $in: newTruckIds }, ownerId: req.user._id }),
            session
          );
        }
        const checkQuantity =
          updateFields.quantity !== undefined ? updateFields.quantity : trip.quantity;
        validateTripCapacity(trucks, checkQuantity);
      }

      const snapshots = !session
        ? await snapshotResources(
            [...new Set([...oldTruckIds, ...newTruckIds])],
            [...new Set([...oldDriverIds, ...newDriverIds])],
            null
          )
        : null;
      const tripSnapshot = !session ? trip.toObject() : null;

      try {
        if (trucksChanged || driversChanged) {
          const removedTruckIds = oldTruckIds.filter((id) => !newTruckIds.includes(id));
          const removedDriverIds = oldDriverIds.filter((id) => !newDriverIds.includes(id));
          if (removedTruckIds.length > 0 || removedDriverIds.length > 0) {
            await revertTruckAndDriverStatus(removedTruckIds, removedDriverIds, session, trip._id);
          }

          const existingAssignments = ensureTripAssignments(trip);
          const nextAssignments = newTruckIds.map((tId, index) => {
            const dId = newDriverIds[index];
            const prev = existingAssignments.find(
              (a) =>
                a.truckId?.toString() === tId.toString() &&
                a.driverId?.toString() === dId.toString()
            );
            return prev
              ? {
                  truckId: tId,
                  driverId: dId,
                  status: prev.status,
                  endRequestedAt: prev.endRequestedAt,
                  completedAt: prev.completedAt,
                }
              : { truckId: tId, driverId: dId, status: "ON_TRIP" };
          });

          const activeAssignments = nextAssignments.filter((a) => a.status !== "COMPLETED");
          await Promise.all(
            activeAssignments.map((a) =>
              Truck.findByIdAndUpdate(
                a.truckId,
                {
                  status: "ON_TRIP",
                  currentDriverId: a.driverId,
                },
                opts
              )
            )
          );
          if (activeAssignments.length > 0) {
            await Driver.updateMany(
              { _id: { $in: activeAssignments.map((a) => a.driverId) } },
              { $set: { status: "ON_TRIP" } },
              opts
            );
          }

          trip.truckIds = newTruckIds;
          trip.driverIds = newDriverIds;
          trip.truckId = newTruckIds[0];
          trip.driverId = newDriverIds[0];
          trip.assignments = nextAssignments;
          if (nextAssignments.some((a) => a.status === "ON_TRIP")) {
            trip.status = "ON_TRIP";
          } else if (nextAssignments.some((a) => a.status === "END_REQUESTED")) {
            trip.status = "DRIVER_ENDED";
          }
        }

        Object.assign(trip, updateFields);
        await trip.save(opts);
        return trip;
      } catch (err) {
        if (!session) {
          await restoreResources(snapshots);
          if (tripSnapshot) {
            await Trip.findByIdAndUpdate(trip._id, tripSnapshot).catch(() => {});
          }
        }
        throw err;
      }
    });

    const populatedTrip = await populateTripQuery(Trip.findById(updatedTrip._id));
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
        query.status = { $in: ACTIVE_TRIP_STATUSES };
      } else {
        query.status = req.query.status;
      }
    }

    const andFilters = [];
    if (req.query.truckId) {
      andFilters.push({
        $or:
          req.query.status === "ON_TRIP"
            ? activeResourceMatchQuery([req.query.truckId], null)
            : [{ truckIds: req.query.truckId }, { truckId: req.query.truckId }],
      });
    }
    if (req.query.driverId) {
      andFilters.push({
        $or:
          req.query.status === "ON_TRIP"
            ? activeResourceMatchQuery(null, [req.query.driverId])
            : [{ driverIds: req.query.driverId }, { driverId: req.query.driverId }],
      });
    }
    if (andFilters.length > 0) {
      query.$and = [...(query.$and || []), ...andFilters];
    }

    const trips = await populateTripQuery(Trip.find(query)).sort({ createdAt: -1 });

    let normalizedTrips = trips.map(normalizeTrip);
    if (req.user?.role === "DRIVER" && req.query.status === "ON_TRIP" && req.driverId) {
      const driverIdStr = req.driverId.toString();
      normalizedTrips = normalizedTrips.filter((t) => {
        const myAssignment = (t.assignments || []).find(
          (a) => (a.driverId?._id || a.driverId)?.toString() === driverIdStr
        );
        return !myAssignment || myAssignment.status !== "COMPLETED";
      });
    }

    res.json({ success: true, data: normalizedTrips });
  } catch (error) {
    next(error);
  }
};

exports.getTripById = async (req, res, next) => {
  try {
    const trip = await populateTripQuery(
      Trip.findOne({ _id: req.params.id, ...req.scopedQuery })
    );

    if (!trip) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    res.json({ success: true, data: normalizeTrip(trip) });
  } catch (error) {
    next(error);
  }
};

async function revertTruckAndDriverStatus(
  truckIdsInput,
  driverIdsInput,
  session = null,
  excludeTripId = null
) {
  const opts = sessionOptions(session);
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
    const truck = await withSession(Truck.findById(truckId), session);
    if (truck && truck.status === "ON_TRIP") {
      const activeQuery = {
        $or: activeResourceMatchQuery([truck._id], null),
        status: { $in: ["ON_TRIP", "ACTIVE", "DRIVER_ENDED"] },
      };
      if (excludeTripId) activeQuery._id = { $ne: excludeTripId };
      const activeTripForTruck = await withSession(Trip.findOne(activeQuery), session);
      if (!activeTripForTruck) {
        await Truck.findByIdAndUpdate(
          truck._id,
          { status: "AVAILABLE", currentDriverId: null },
          opts
        );
      }
    }
  }

  for (const driverId of driverIds) {
    if (!driverId) continue;
    const driver = await withSession(Driver.findById(driverId), session);
    if (driver && driver.status === "ON_TRIP") {
      const activeQuery = {
        $or: activeResourceMatchQuery(null, [driver._id]),
        status: { $in: ["ON_TRIP", "ACTIVE", "DRIVER_ENDED"] },
      };
      if (excludeTripId) activeQuery._id = { $ne: excludeTripId };
      const activeTripForDriver = await withSession(Trip.findOne(activeQuery), session);
      if (!activeTripForDriver) {
        await Driver.findByIdAndUpdate(driver._id, { status: "AVAILABLE" }, opts);
      }
    }
  }
}

exports.driverEndTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, ...req.scopedQuery });
    if (!trip) return res.status(404).json({ success: false, message: "Trip not found" });

    if (!["ON_TRIP", "ACTIVE", "DRIVER_ENDED"].includes(trip.status)) {
      return res.status(400).json({ success: false, message: "Only active trips can be ended" });
    }

    const assignments = ensureTripAssignments(trip);
    let driverIdStr = req.driverId?.toString();
    if (!driverIdStr && req.user?._id) {
      const driverDoc = await Driver.findOne({ userId: req.user._id }).select("_id").lean();
      driverIdStr = driverDoc?._id?.toString();
    }
    const myIdx = assignments.findIndex((a) => a.driverId?.toString() === driverIdStr);

    if (myIdx === -1) {
      return res.status(403).json({ success: false, message: "You are not assigned to this trip" });
    }

    if (assignments[myIdx].status !== "ON_TRIP") {
      return res.status(400).json({
        success: false,
        message: "You have already requested to end your leg of this trip",
      });
    }

    assignments[myIdx].status = "END_REQUESTED";
    assignments[myIdx].endRequestedAt = new Date();
    trip.assignments = assignments;

    const allDriversEndedOrCompleted = assignments.every(
      (a) => a.status === "END_REQUESTED" || a.status === "COMPLETED"
    );

    if (allDriversEndedOrCompleted) {
      trip.status = "DRIVER_ENDED";
      trip.actualEndDate = new Date();
    } else {
      trip.status = "ON_TRIP";
    }

    await trip.save();
    const populatedTrip = await populateTripQuery(Trip.findById(trip._id));

    res.json({ success: true, data: normalizeTrip(populatedTrip) });
  } catch (error) {
    next(error);
  }
};

exports.ownerConfirmEndTrip = async (req, res, next) => {
  try {
    const { actualRevenue, truckId, driverId } = req.body || {};

    const { result: updatedTrip } = await withTransaction(async (session) => {
      const opts = sessionOptions(session);
      const trip = await withSession(
        Trip.findOne({ _id: req.params.id, ownerId: req.user._id }),
        session
      );
      if (!trip) throw new AppError("Trip not found", 404);

      if (!["ON_TRIP", "ACTIVE", "DRIVER_ENDED", "COMPLETED"].includes(trip.status)) {
        throw new AppError("Trip cannot be completed from its current status", 400);
      }

      const truckIds = trip.truckIds?.length ? trip.truckIds : trip.truckId ? [trip.truckId] : [];
      const driverIds = trip.driverIds?.length
        ? trip.driverIds
        : trip.driverId
        ? [trip.driverId]
        : [];
      const snapshots = !session ? await snapshotResources(truckIds, driverIds, null) : null;
      const prevTripState = !session
        ? {
            status: trip.status,
            actualRevenue: trip.actualRevenue,
            actualEndDate: trip.actualEndDate,
            assignments: trip.assignments,
          }
        : null;

      try {
        const assignments = ensureTripAssignments(trip).map((a) => ({
          truckId: a.truckId,
          driverId: a.driverId,
          status: a.status,
          endRequestedAt: a.endRequestedAt,
          completedAt: a.completedAt,
        }));

        if (truckId || driverId) {
          const targetIdx = assignments.findIndex(
            (a) =>
              (truckId && a.truckId?.toString() === truckId.toString()) ||
              (driverId && a.driverId?.toString() === driverId.toString())
          );
          if (targetIdx === -1) {
            throw new AppError("Assigned truck/driver not found on this trip", 404);
          }

          const target = assignments[targetIdx];
          if (target.status !== "COMPLETED") {
            target.status = "COMPLETED";
            target.completedAt = new Date();
          }
          trip.assignments = assignments;

          const allCompleted = assignments.every((a) => a.status === "COMPLETED");
          if (allCompleted) {
            if (actualRevenue !== undefined) {
              trip.actualRevenue = actualRevenue;
            } else if (trip.actualRevenue === undefined) {
              trip.actualRevenue = trip.expectedRevenue;
            }
            trip.status = "COMPLETED";
            if (!trip.actualEndDate) trip.actualEndDate = new Date();
            await trip.save(opts);

            await revertTruckAndDriverStatus(
              [target.truckId],
              [target.driverId],
              session,
              trip._id
            );
            await generateTripReport(trip._id, session);
          } else {
            const anyStillOnTrip = assignments.some((a) => a.status === "ON_TRIP");
            trip.status = anyStillOnTrip ? "ON_TRIP" : "DRIVER_ENDED";
            await trip.save(opts);

            await revertTruckAndDriverStatus(
              [target.truckId],
              [target.driverId],
              session,
              trip._id
            );
          }
        } else {
          const now = new Date();
          trip.assignments = assignments.map((a) => ({
            ...a,
            status: "COMPLETED",
            completedAt: a.completedAt || now,
          }));

          if (actualRevenue !== undefined) {
            trip.actualRevenue = actualRevenue;
          } else if (trip.actualRevenue === undefined) {
            trip.actualRevenue = trip.expectedRevenue;
          }

          trip.status = "COMPLETED";
          if (!trip.actualEndDate) trip.actualEndDate = now;
          await trip.save(opts);

          await revertTruckAndDriverStatus(truckIds, driverIds, session, trip._id);
          await generateTripReport(trip._id, session);
        }

        return trip;
      } catch (err) {
        if (!session) {
          await restoreResources(snapshots);
          if (prevTripState) {
            await Trip.findByIdAndUpdate(trip._id, prevTripState).catch(() => {});
          }
        }
        throw err;
      }
    });

    const populatedTrip = await populateTripQuery(Trip.findById(updatedTrip._id));
    res.json({ success: true, data: normalizeTrip(populatedTrip) });
  } catch (error) {
    next(error);
  }
};

exports.cancelTrip = async (req, res, next) => {
  try {
    const { result: cancelledTrip } = await withTransaction(async (session) => {
      const opts = sessionOptions(session);
      const trip = await withSession(
        Trip.findOne({ _id: req.params.id, ownerId: req.user._id }),
        session
      );
      if (!trip) throw new AppError("Trip not found", 404);

      if (trip.status === "COMPLETED") {
        throw new AppError("Cannot cancel a completed trip", 400);
      }

      const truckIds = trip.truckIds?.length ? trip.truckIds : trip.truckId ? [trip.truckId] : [];
      const driverIds = trip.driverIds?.length
        ? trip.driverIds
        : trip.driverId
        ? [trip.driverId]
        : [];
      const snapshots = !session ? await snapshotResources(truckIds, driverIds, null) : null;
      const prevStatus = trip.status;

      try {
        trip.status = "CANCELLED";
        await trip.save(opts);

        await revertTruckAndDriverStatus(truckIds, driverIds, session, trip._id);
        return trip;
      } catch (err) {
        if (!session) {
          await restoreResources(snapshots);
          await Trip.findByIdAndUpdate(trip._id, { status: prevStatus }).catch(() => {});
        }
        throw err;
      }
    });

    res.json({ success: true, data: normalizeTrip(cancelledTrip) });
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

    const trips = await populateTripQuery(Trip.find(query)).sort({ startDate: -1 });

    const normalizedTrips = trips.map(normalizeTrip);
    res.json({ success: true, data: normalizedTrips });
  } catch (error) {
    next(error);
  }
};

exports.deleteTrip = async (req, res, next) => {
  try {
    await withTransaction(async (session) => {
      const opts = sessionOptions(session);
      const trip = await withSession(
        Trip.findOne({ _id: req.params.id, ownerId: req.user._id }),
        session
      );
      if (!trip) throw new AppError("Trip not found", 404);

      const truckIds = trip.truckIds?.length ? trip.truckIds : trip.truckId ? [trip.truckId] : [];
      const driverIds = trip.driverIds?.length
        ? trip.driverIds
        : trip.driverId
        ? [trip.driverId]
        : [];
      const snapshots = !session ? await snapshotResources(truckIds, driverIds, null) : null;
      const orphanBackups = !session
        ? {
            reports: await TripReport.find({ tripId: trip._id }).lean(),
            expenses: await Expense.find({ tripId: trip._id }).lean(),
          }
        : null;

      try {
        if (["ON_TRIP", "ACTIVE", "DRIVER_ENDED"].includes(trip.status)) {
          await revertTruckAndDriverStatus(truckIds, driverIds, session, trip._id);
        }

        await TripReport.deleteMany({ tripId: trip._id }, opts);
        await Expense.deleteMany({ tripId: trip._id }, opts);
        await Trip.findByIdAndDelete(trip._id, opts);
      } catch (err) {
        if (!session) {
          await restoreResources(snapshots);
          if (orphanBackups?.reports?.length) {
            await TripReport.insertMany(orphanBackups.reports).catch(() => {});
          }
          if (orphanBackups?.expenses?.length) {
            await Expense.insertMany(orphanBackups.expenses).catch(() => {});
          }
        }
        throw err;
      }
    });

    res.json({ success: true, message: "Trip deleted successfully" });
  } catch (error) {
    next(error);
  }
};
