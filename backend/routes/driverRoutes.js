const express = require("express");
const {
  createDriver,
  getDrivers,
  getDriverById,
  updateDriver,
  updateDriverStatus,
} = require("../controllers/driverController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

const router = express.Router();

// All driver management routes are for owners only
router.use(authenticate);
router.use(authorize("OWNER"));

router.post("/", createDriver);
router.get("/", getDrivers);
router.get("/:id", getDriverById);
router.put("/:id", updateDriver);
router.patch("/:id/status", updateDriverStatus);

module.exports = router;
