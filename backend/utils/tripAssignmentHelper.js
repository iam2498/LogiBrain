const ACTIVE_TRIP_STATUSES = ["ON_TRIP", "ACTIVE", "DRIVER_ENDED"];

/**
 * Builds MongoDB $or conditions matching trips where at least one of the given
 * trucks or drivers still has a non-COMPLETED assignment (or legacy trips with
 * no per-truck assignments array).
 */
function activeResourceMatchQuery(truckIds, driverIds) {
  const orConditions = [];
  if (truckIds?.length) {
    orConditions.push(
      { assignments: { $elemMatch: { truckId: { $in: truckIds }, status: { $ne: "COMPLETED" } } } },
      {
        $and: [
          { $or: [{ assignments: { $exists: false } }, { assignments: { $size: 0 } }] },
          { $or: [{ truckIds: { $in: truckIds } }, { truckId: { $in: truckIds } }] },
        ],
      }
    );
  }
  if (driverIds?.length) {
    orConditions.push(
      { assignments: { $elemMatch: { driverId: { $in: driverIds }, status: { $ne: "COMPLETED" } } } },
      {
        $and: [
          { $or: [{ assignments: { $exists: false } }, { assignments: { $size: 0 } }] },
          { $or: [{ driverIds: { $in: driverIds } }, { driverId: { $in: driverIds } }] },
        ],
      }
    );
  }
  return orConditions;
}

/**
 * Finds the active trip (if any) for a single truck, ignoring trips where
 * this truck's individual assignment is already COMPLETED.
 */
async function findActiveTripForTruck(Trip, truckId) {
  return Trip.findOne({
    $or: activeResourceMatchQuery([truckId], null),
    status: { $in: ACTIVE_TRIP_STATUSES },
  })
    .populate({
      path: "driverIds",
      select: "licenseNumber userId status",
      populate: { path: "userId", select: "name email phone" },
    })
    .populate({
      path: "driverId",
      select: "licenseNumber userId status",
      populate: { path: "userId", select: "name email phone" },
    });
}

/**
 * Finds the active trip (if any) for a single driver, ignoring trips where
 * this driver's individual assignment is already COMPLETED.
 */
async function findActiveTripForDriver(Trip, driverId) {
  return Trip.findOne({
    $or: activeResourceMatchQuery(null, [driverId]),
    status: { $in: ACTIVE_TRIP_STATUSES },
  })
    .populate("truckIds", "registrationNumber capacity truckType model")
    .populate("truckId", "registrationNumber capacity truckType model");
}

/**
 * Formats a Truck document with live active-trip status and paired driver.
 */
function formatTruckWithActiveTrip(truck, activeTrip) {
  let status = truck.status;
  if (status === "ACTIVE") status = "AVAILABLE";

  let currentDriverId = truck.currentDriverId;
  let activeTripData = null;

  if (activeTrip) {
    status = "ON_TRIP";
    activeTripData = {
      _id: activeTrip._id,
      source: activeTrip.source,
      destination: activeTrip.destination,
      status: activeTrip.status,
      material: activeTrip.material,
    };

    const truckIdStr = truck._id.toString();
    if (activeTrip.truckIds && activeTrip.truckIds.length) {
      const truckIndex = activeTrip.truckIds.findIndex(
        (id) => (id._id || id).toString() === truckIdStr
      );
      if (truckIndex !== -1 && activeTrip.driverIds && activeTrip.driverIds[truckIndex]) {
        currentDriverId = activeTrip.driverIds[truckIndex];
      }
    }
    if (
      !currentDriverId &&
      activeTrip.truckId &&
      (activeTrip.truckId._id || activeTrip.truckId).toString() === truckIdStr
    ) {
      currentDriverId = activeTrip.driverId || (activeTrip.driverIds && activeTrip.driverIds[0]);
    }
  } else if (status === "ON_TRIP") {
    status = "AVAILABLE";
  }

  return {
    ...truck.toObject(),
    status,
    currentDriverId,
    activeTrip: activeTripData,
  };
}

/**
 * Formats a Driver document with live active-trip status and paired/default truck.
 */
function formatDriverWithActiveTrip(driver, activeTrip, defaultTruck = null) {
  const dIdStr = driver._id.toString();
  let status = driver.status;
  if (status === "ACTIVE") status = "AVAILABLE";
  if (status === "INACTIVE") status = "ON_LEAVE";

  let assignedTruck = null;
  let activeTripInfo = null;

  if (activeTrip) {
    status = "ON_TRIP";
    let pairedTruck = null;
    if (Array.isArray(activeTrip.driverIds) && activeTrip.driverIds.length > 0) {
      const idx = activeTrip.driverIds.findIndex((d) => (d?._id || d)?.toString() === dIdStr);
      if (idx !== -1 && activeTrip.truckIds && activeTrip.truckIds[idx]) {
        pairedTruck = activeTrip.truckIds[idx];
      }
    }
    if (!pairedTruck) {
      pairedTruck = (activeTrip.truckIds && activeTrip.truckIds[0]) || activeTrip.truckId || null;
    }
    if (pairedTruck) {
      assignedTruck = {
        _id: pairedTruck._id,
        registrationNumber: pairedTruck.registrationNumber,
        capacity: pairedTruck.capacity,
        truckType: pairedTruck.truckType,
        model: pairedTruck.model,
        isLiveTrip: true,
      };
    }
    activeTripInfo = {
      _id: activeTrip._id,
      source: activeTrip.source,
      destination: activeTrip.destination,
      status: activeTrip.status,
    };
  } else {
    if (status === "ON_TRIP") status = "AVAILABLE";
    if (defaultTruck) {
      assignedTruck = {
        _id: defaultTruck._id,
        registrationNumber: defaultTruck.registrationNumber,
        capacity: defaultTruck.capacity,
        truckType: defaultTruck.truckType,
        model: defaultTruck.model,
        isLiveTrip: false,
      };
    }
  }

  return {
    ...driver.toObject(),
    status,
    assignedTruck,
    activeTrip: activeTripInfo,
  };
}

module.exports = {
  ACTIVE_TRIP_STATUSES,
  activeResourceMatchQuery,
  findActiveTripForTruck,
  findActiveTripForDriver,
  formatTruckWithActiveTrip,
  formatDriverWithActiveTrip,
};
