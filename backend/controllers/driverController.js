const User = require("../models/User");
const Driver = require("../models/Driver");
const Truck = require("../models/Truck");
const Trip = require("../models/Trip");
const bcrypt = require("bcryptjs");
const { createDriverSchema, updateDriverSchema, updateDriverStatusSchema } = require("../validators/driverValidator");
const { AppError, withTransaction, sessionOptions } = require("../utils/withTransaction");
const {
  ACTIVE_TRIP_STATUSES,
  activeResourceMatchQuery,
  findActiveTripForDriver,
  formatDriverWithActiveTrip,
} = require("../utils/tripAssignmentHelper");

exports.createDriver = async (req, res, next) => {
  try {
    const parsedData = createDriverSchema.parse(req.body);

    const existingUser = await User.findOne({ $or: [{ email: parsedData.email }, { phone: parsedData.phone }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User with this email or phone already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(parsedData.password, salt);

    const { result } = await withTransaction(async (session) => {
      const opts = sessionOptions(session);
      let newUser = null;
      let newDriver = null;
      let previousTruckDriverId = undefined;

      try {
        newUser = new User({
          name: parsedData.name,
          email: parsedData.email,
          phone: parsedData.phone,
          passwordHash,
          role: "DRIVER",
          ownerId: req.user._id,
        });
        await newUser.save(opts);

        newDriver = new Driver({
          userId: newUser._id,
          ownerId: req.user._id,
          licenseNumber: parsedData.licenseNumber,
          licenseExpiry: parsedData.licenseExpiry,
          address: parsedData.address,
          emergencyContact: parsedData.emergencyContact,
          imageUrl: parsedData.imageUrl,
        });
        await newDriver.save(opts);

        let assignedTruck = null;
        if (parsedData.truckId) {
          const existingTruckQuery = Truck.findOne({ _id: parsedData.truckId, ownerId: req.user._id });
          if (session) existingTruckQuery.session(session);
          const existingTruck = await existingTruckQuery;
          if (!existingTruck) {
            throw new AppError("Assigned truck not found", 404);
          }
          previousTruckDriverId = existingTruck.currentDriverId;

          const truck = await Truck.findOneAndUpdate(
            { _id: parsedData.truckId, ownerId: req.user._id },
            { currentDriverId: newDriver._id },
            { new: true, ...opts }
          );
          if (truck) {
            assignedTruck = {
              _id: truck._id,
              registrationNumber: truck.registrationNumber,
              capacity: truck.capacity,
              truckType: truck.truckType,
              model: truck.model,
              isLiveTrip: false,
            };
          }
        }

        return { newUser, newDriver, assignedTruck };
      } catch (err) {
        if (!session) {
          if (parsedData.truckId && previousTruckDriverId !== undefined) {
            await Truck.findOneAndUpdate(
              { _id: parsedData.truckId, ownerId: req.user._id },
              { currentDriverId: previousTruckDriverId }
            ).catch(() => {});
          }
          if (newDriver?._id) await Driver.findByIdAndDelete(newDriver._id).catch(() => {});
          if (newUser?._id) await User.findByIdAndDelete(newUser._id).catch(() => {});
        }
        throw err;
      }
    });

    const { newUser, newDriver, assignedTruck } = result;

    res.status(201).json({
      success: true,
      data: {
        user: { _id: newUser._id, name: newUser.name, email: newUser.email },
        driver: {
          ...newDriver.toObject(),
          userId: { _id: newUser._id, name: newUser.name, email: newUser.email, phone: newUser.phone },
          assignedTruck,
          activeTrip: null,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getDrivers = async (req, res, next) => {
  try {
    const drivers = await Driver.find({ ownerId: req.user._id }).populate("userId", "name email phone isActive");
    const driverObjectIds = drivers.map((d) => d._id);

    // 1. Fetch all trucks belonging to this owner
    const allTrucks = await Truck.find({ ownerId: req.user._id });

    // 2. Fetch all active trips
    const activeTrips = await Trip.find({
      $or: activeResourceMatchQuery(null, driverObjectIds),
      status: { $in: ACTIVE_TRIP_STATUSES },
    })
      .populate("truckIds", "registrationNumber capacity truckType model")
      .populate("truckId", "registrationNumber capacity truckType model");

    // Map active trips by driver ID string
    const driverActiveTripMap = new Map();
    activeTrips.forEach((trip) => {
      if (Array.isArray(trip.driverIds) && trip.driverIds.length > 0) {
        trip.driverIds.forEach((d, idx) => {
          const dId = (d?._id || d)?.toString();
          const assignment = (trip.assignments || []).find(
            (a) => (a.driverId?._id || a.driverId)?.toString() === dId
          );
          if (assignment && assignment.status === "COMPLETED") return;
          if (dId && !driverActiveTripMap.has(dId)) {
            const pairedTruck = (trip.truckIds && trip.truckIds[idx]) || trip.truckId || null;
            driverActiveTripMap.set(dId, { trip, pairedTruck });
          }
        });
      }
      if (trip.driverId) {
        const dId = (trip.driverId?._id || trip.driverId)?.toString();
        const assignment = (trip.assignments || []).find(
          (a) => (a.driverId?._id || a.driverId)?.toString() === dId
        );
        if (assignment && assignment.status === "COMPLETED") return;
        if (dId && !driverActiveTripMap.has(dId)) {
          const pairedTruck = (trip.truckIds && trip.truckIds[0]) || trip.truckId || null;
          driverActiveTripMap.set(dId, { trip, pairedTruck });
        }
      }
    });

    // Map default assigned truck by driver ID string
    const driverDefaultTruckMap = new Map();
    allTrucks.forEach((truck) => {
      if (truck.currentDriverId) {
        const dId = (truck.currentDriverId?._id || truck.currentDriverId)?.toString();
        if (dId) {
          driverDefaultTruckMap.set(dId, truck);
        }
      }
    });

    let resolvedDrivers = drivers.map((driver) => {
      const dIdStr = driver._id.toString();
      let status = driver.status;
      if (status === "ACTIVE") status = "AVAILABLE";
      if (status === "INACTIVE") status = "ON_LEAVE";

      let assignedTruck = null;
      let activeTripInfo = null;

      if (driverActiveTripMap.has(dIdStr)) {
        status = "ON_TRIP";
        const { trip, pairedTruck } = driverActiveTripMap.get(dIdStr);
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
          _id: trip._id,
          source: trip.source,
          destination: trip.destination,
          status: trip.status,
        };
      } else {
        if (status === "ON_TRIP") status = "AVAILABLE";
        const defaultTruck = driverDefaultTruckMap.get(dIdStr);
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
    });

    if (req.query.status) {
      resolvedDrivers = resolvedDrivers.filter((d) => d.status === req.query.status);
    }

    res.json({ success: true, data: resolvedDrivers });
  } catch (error) {
    next(error);
  }
};

exports.getDriverById = async (req, res, next) => {
  try {
    const driver = await Driver.findOne({ _id: req.params.id, ownerId: req.user._id }).populate("userId", "name email phone isActive");
    if (!driver) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    const activeTrip = await findActiveTripForDriver(Trip, driver._id);
    const defaultTruck = activeTrip
      ? null
      : await Truck.findOne({ currentDriverId: driver._id, ownerId: req.user._id });

    res.json({
      success: true,
      data: formatDriverWithActiveTrip(driver, activeTrip, defaultTruck),
    });
  } catch (error) {
    next(error);
  }
};

exports.updateDriver = async (req, res, next) => {
  try {
    const parsedData = updateDriverSchema.parse(req.body);
    const driverId = req.params.id;
    const ownerId = req.user._id;

    const driver = await Driver.findOne({ _id: driverId, ownerId });
    if (!driver) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    // Update User details if provided
    const userUpdates = {};
    if (parsedData.name) userUpdates.name = parsedData.name;
    if (parsedData.email) userUpdates.email = parsedData.email;
    if (parsedData.phone) userUpdates.phone = parsedData.phone;

    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(driver.userId, userUpdates);
    }

    // Update Driver details if provided
    const driverUpdates = {};
    if (parsedData.licenseNumber) driverUpdates.licenseNumber = parsedData.licenseNumber;
    if (parsedData.licenseExpiry) driverUpdates.licenseExpiry = parsedData.licenseExpiry;
    if (parsedData.address) driverUpdates.address = parsedData.address;
    if (parsedData.emergencyContact) driverUpdates.emergencyContact = parsedData.emergencyContact;
    if (parsedData.imageUrl !== undefined) driverUpdates.imageUrl = parsedData.imageUrl;

    let updatedDriver = driver;
    if (Object.keys(driverUpdates).length > 0) {
      updatedDriver = await Driver.findByIdAndUpdate(driverId, driverUpdates, { new: true }).populate(
        "userId",
        "name email phone isActive"
      );
    } else {
      updatedDriver = await Driver.findById(driverId).populate("userId", "name email phone isActive");
    }

    // Update assigned truck if truckId is explicitly provided
    if (parsedData.truckId !== undefined) {
      if (parsedData.truckId) {
        // Remove driver from any other truck
        await Truck.updateMany(
          { currentDriverId: driverId, _id: { $ne: parsedData.truckId }, ownerId },
          { currentDriverId: null }
        );
        // Assign to new truck
        await Truck.findOneAndUpdate(
          { _id: parsedData.truckId, ownerId },
          { currentDriverId: driverId }
        );
      } else {
        // Unassign driver from any truck
        await Truck.updateMany(
          { currentDriverId: driverId, ownerId },
          { currentDriverId: null }
        );
      }
    }

    const activeTrip = await findActiveTripForDriver(Trip, updatedDriver._id);
    const defaultTruck = activeTrip
      ? null
      : await Truck.findOne({ currentDriverId: updatedDriver._id, ownerId });

    res.json({
      success: true,
      data: formatDriverWithActiveTrip(updatedDriver, activeTrip, defaultTruck),
    });
  } catch (error) {
    next(error);
  }
};

exports.updateDriverStatus = async (req, res, next) => {
  try {
    const { status } = updateDriverStatusSchema.parse(req.body);
    const driverId = req.params.id;
    const ownerId = req.user._id;

    const driver = await Driver.findOneAndUpdate(
      { _id: driverId, ownerId },
      { status },
      { new: true }
    ).populate("userId", "name email phone isActive");

    if (!driver) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    await User.findByIdAndUpdate(driver.userId, { isActive: true });

    const activeTrip = await findActiveTripForDriver(Trip, driver._id);
    const defaultTruck = activeTrip
      ? null
      : await Truck.findOne({ currentDriverId: driver._id, ownerId });

    res.json({
      success: true,
      data: formatDriverWithActiveTrip(driver, activeTrip, defaultTruck),
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteDriver = async (req, res, next) => {
  try {
    const driverId = req.params.id;
    const ownerId = req.user._id;

    const driver = await Driver.findOne({ _id: driverId, ownerId });
    if (!driver) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    const activeTrip = await Trip.findOne({
      ownerId,
      status: { $in: ACTIVE_TRIP_STATUSES },
      $or: activeResourceMatchQuery(null, [driver._id]),
    });

    if (activeTrip) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove driver while they are assigned to an active trip",
      });
    }

    await withTransaction(async (session) => {
      const opts = sessionOptions(session);
      const affectedTrucks = !session
        ? await Truck.find({ currentDriverId: driver._id, ownerId }).select("_id").lean()
        : [];
      const driverBackup = !session ? driver.toObject() : null;
      const userQuery = User.findOne({ _id: driver.userId, role: "DRIVER", ownerId });
      if (session) userQuery.session(session);
      const userDoc = await userQuery;
      const userBackup = !session && userDoc ? userDoc.toObject() : null;

      try {
        await Truck.updateMany(
          { currentDriverId: driver._id, ownerId },
          { currentDriverId: null },
          opts
        );
        await Driver.findByIdAndDelete(driver._id, opts);
        if (userDoc) {
          await User.findByIdAndDelete(userDoc._id, opts);
        }
      } catch (err) {
        if (!session) {
          if (userBackup) await User.create(userBackup).catch(() => {});
          if (driverBackup) await Driver.create(driverBackup).catch(() => {});
          if (affectedTrucks.length > 0) {
            await Truck.updateMany(
              { _id: { $in: affectedTrucks.map((t) => t._id) } },
              { currentDriverId: driver._id }
            ).catch(() => {});
          }
        }
        throw err;
      }
    });

    res.json({ success: true, message: "Driver removed successfully" });
  } catch (error) {
    next(error);
  }
};
