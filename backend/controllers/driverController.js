const User = require("../models/User");
const Driver = require("../models/Driver");
const Truck = require("../models/Truck");
const Trip = require("../models/Trip");
const bcrypt = require("bcryptjs");
const { createDriverSchema, updateDriverSchema, updateDriverStatusSchema } = require("../validators/driverValidator");

exports.createDriver = async (req, res, next) => {
  try {
    const parsedData = createDriverSchema.parse(req.body);

    const existingUser = await User.findOne({ $or: [{ email: parsedData.email }, { phone: parsedData.phone }] });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User with this email or phone already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(parsedData.password, salt);

    // Create User doc for driver
    const newUser = await User.create({
      name: parsedData.name,
      email: parsedData.email,
      phone: parsedData.phone,
      passwordHash,
      role: "DRIVER",
      ownerId: req.user._id,
    });

    // Create Driver profile doc
    const newDriver = await Driver.create({
      userId: newUser._id,
      ownerId: req.user._id,
      licenseNumber: parsedData.licenseNumber,
      licenseExpiry: parsedData.licenseExpiry,
      address: parsedData.address,
      emergencyContact: parsedData.emergencyContact,
      imageUrl: parsedData.imageUrl,
    });

    // If an initial truck assignment was chosen
    let assignedTruck = null;
    if (parsedData.truckId) {
      const truck = await Truck.findOneAndUpdate(
        { _id: parsedData.truckId, ownerId: req.user._id },
        { currentDriverId: newDriver._id },
        { new: true }
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
      $or: [
        { driverIds: { $in: driverObjectIds } },
        { driverId: { $in: driverObjectIds } },
      ],
      status: { $in: ["ON_TRIP", "ACTIVE", "DRIVER_ENDED"] },
    })
      .populate("truckIds", "registrationNumber capacity truckType model")
      .populate("truckId", "registrationNumber capacity truckType model");

    // Map active trips by driver ID string
    const driverActiveTripMap = new Map();
    activeTrips.forEach((trip) => {
      if (Array.isArray(trip.driverIds) && trip.driverIds.length > 0) {
        trip.driverIds.forEach((d, idx) => {
          const dId = (d?._id || d)?.toString();
          if (dId && !driverActiveTripMap.has(dId)) {
            const pairedTruck = (trip.truckIds && trip.truckIds[idx]) || trip.truckId || null;
            driverActiveTripMap.set(dId, { trip, pairedTruck });
          }
        });
      }
      if (trip.driverId) {
        const dId = (trip.driverId?._id || trip.driverId)?.toString();
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

    const dIdStr = driver._id.toString();
    const activeTrip = await Trip.findOne({
      $or: [{ driverIds: driver._id }, { driverId: driver._id }],
      status: { $in: ["ON_TRIP", "ACTIVE", "DRIVER_ENDED"] },
    })
      .populate("truckIds", "registrationNumber capacity truckType model")
      .populate("truckId", "registrationNumber capacity truckType model");

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
      const defaultTruck = await Truck.findOne({ currentDriverId: driver._id, ownerId: req.user._id });
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

    res.json({
      success: true,
      data: {
        ...driver.toObject(),
        status,
        assignedTruck,
        activeTrip: activeTripInfo,
      },
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

    const dIdStr = updatedDriver._id.toString();
    const activeTrip = await Trip.findOne({
      $or: [{ driverIds: updatedDriver._id }, { driverId: updatedDriver._id }],
      status: { $in: ["ON_TRIP", "ACTIVE", "DRIVER_ENDED"] },
    })
      .populate("truckIds", "registrationNumber capacity truckType model")
      .populate("truckId", "registrationNumber capacity truckType model");

    let status = updatedDriver.status;
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
      const defaultTruck = await Truck.findOne({ currentDriverId: updatedDriver._id, ownerId });
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

    res.json({
      success: true,
      data: {
        ...updatedDriver.toObject(),
        status,
        assignedTruck,
        activeTrip: activeTripInfo,
      },
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

    const dIdStr = driver._id.toString();
    const activeTrip = await Trip.findOne({
      $or: [{ driverIds: driver._id }, { driverId: driver._id }],
      status: { $in: ["ON_TRIP", "ACTIVE", "DRIVER_ENDED"] },
    })
      .populate("truckIds", "registrationNumber capacity truckType model")
      .populate("truckId", "registrationNumber capacity truckType model");

    let resolvedStatus = driver.status;
    if (resolvedStatus === "ACTIVE") resolvedStatus = "AVAILABLE";
    if (resolvedStatus === "INACTIVE") resolvedStatus = "ON_LEAVE";

    let assignedTruck = null;
    let activeTripInfo = null;

    if (activeTrip) {
      resolvedStatus = "ON_TRIP";
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
      if (resolvedStatus === "ON_TRIP") resolvedStatus = "AVAILABLE";
      const defaultTruck = await Truck.findOne({ currentDriverId: driver._id, ownerId });
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

    res.json({
      success: true,
      data: {
        ...driver.toObject(),
        status: resolvedStatus,
        assignedTruck,
        activeTrip: activeTripInfo,
      },
    });
  } catch (error) {
    next(error);
  }
};
