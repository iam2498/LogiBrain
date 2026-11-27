const Driver = require("../models/Driver");

const scopeOwnership = async (req, res, next) => {
  try {
    if (req.user.role === "OWNER") {
      req.ownerId = req.user._id; // The owner can only see their own stuff
      req.scopedQuery = { ownerId: req.user._id };
    } else if (req.user.role === "DRIVER") {
      // Find the driver document for this user
      const driver = await Driver.findOne({ userId: req.user._id });
      if (!driver) {
        return res.status(403).json({ success: false, message: "Driver profile not found" });
      }
      req.driverId = driver._id;
      req.ownerId = driver.ownerId; // Driver belongs to this owner
      req.scopedQuery = {
        $or: [{ driverIds: driver._id }, { driverId: driver._id }],
      }; // Driver can only see stuff assigned to them
    } else {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Business resources are restricted to fleet owners and drivers",
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = scopeOwnership;
