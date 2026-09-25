const express = require("express");
const {
  getDashboardKPIs,
  getTripReport,
  getTruckReport,
  getDriverReport,
  getOverallReport,
  getAnalytics,
  getTripReportPdf,
} = require("../controllers/reportController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const scopeOwnership = require("../middleware/scopeOwnership");

const router = express.Router();

router.use(authenticate);
router.use(scopeOwnership);

// Owner only routes
router.get("/dashboard", authorize("OWNER"), getDashboardKPIs);
router.get("/truck/:truckId", authorize("OWNER"), getTruckReport);
router.get("/overall", authorize("OWNER"), getOverallReport);
router.get("/analytics", authorize("OWNER"), getAnalytics);

// Shared but scoped routes
router.get("/trip/:tripId/pdf", getTripReportPdf);
router.get("/trip/:tripId", getTripReport);
router.get("/driver/:driverId", getDriverReport); // Controller handles logic if driver

module.exports = router;
