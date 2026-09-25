const User = require("../models/User");
const Driver = require("../models/Driver");
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

    res.status(201).json({
      success: true,
      data: {
        user: { _id: newUser._id, name: newUser.name, email: newUser.email },
        driver: newDriver,
      },
    });
  } catch (error) {
    next(error);
  }
};

const Trip = require("../models/Trip");

exports.getDrivers = async (req, res, next) => {
  try {
    const drivers = await Driver.find({ ownerId: req.user._id }).populate("userId", "name email phone isActive");
    
    // Resolve dynamic operational status
    const activeTrips = await Trip.find({
      driverId: { $in: drivers.map(d => d._id) },
      status: { $in: ["PENDING", "ACTIVE", "DRIVER_ENDED"] }
    });
    const activeDriverIds = new Set(activeTrips.map(trip => trip.driverId.toString()));
    
    const resolvedDrivers = drivers.map(driver => {
      let status = driver.status;
      if (activeDriverIds.has(driver._id.toString())) {
        status = "ON_TRIP";
      } else if (status === "ON_TRIP") {
         status = "ACTIVE"; // Fix stale ON_TRIP
      }
      return { ...driver.toObject(), status };
    });

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

    const activeTrip = await Trip.findOne({
      driverId: driver._id,
      status: { $in: ["PENDING", "ACTIVE", "DRIVER_ENDED"] }
    });

    let status = driver.status;
    if (activeTrip) {
      status = "ON_TRIP";
    } else if (status === "ON_TRIP") {
      status = "ACTIVE";
    }

    res.json({ success: true, data: { ...driver.toObject(), status } });
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
      updatedDriver = await Driver.findByIdAndUpdate(driverId, driverUpdates, { new: true }).populate("userId", "name email phone isActive");
    } else {
      updatedDriver = await Driver.findById(driverId).populate("userId", "name email phone isActive");
    }

    const activeTrip = await Trip.findOne({
      driverId: updatedDriver._id,
      status: { $in: ["PENDING", "ACTIVE", "DRIVER_ENDED"] }
    });

    let status = updatedDriver.status;
    if (activeTrip) {
      status = "ON_TRIP";
    } else if (status === "ON_TRIP") {
      status = "ACTIVE";
    }

    res.json({ success: true, data: { ...updatedDriver.toObject(), status } });
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
    
    // Also update User isActive
    await User.findByIdAndUpdate(driver.userId, { isActive: status === "ACTIVE" });

    const activeTrip = await Trip.findOne({
      driverId: driver._id,
      status: { $in: ["PENDING", "ACTIVE", "DRIVER_ENDED"] }
    });

    let resolvedStatus = driver.status;
    if (activeTrip) {
      resolvedStatus = "ON_TRIP";
    } else if (resolvedStatus === "ON_TRIP") {
      resolvedStatus = "ACTIVE";
    }

    res.json({ success: true, data: { ...driver.toObject(), status: resolvedStatus } });
  } catch (error) {
    next(error);
  }
};
