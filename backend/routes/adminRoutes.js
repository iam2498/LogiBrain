const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const adminController = require("../controllers/adminController");

// Every admin route requires valid authentication and ADMIN role
router.use(authenticate, authorize("ADMIN"));

// Platform Overview
router.get("/overview", adminController.getPlatformOverview);

// Owner Account Management (non-business account controls only)
router.get("/owners", adminController.getOwners);
router.get("/owners/:id", adminController.getOwnerAccountById);
router.patch("/owners/:id/status", adminController.updateOwnerAccountStatus);

// Support & Help Requests
router.get("/support-requests", adminController.getSupportRequests);
router.patch("/support-requests/:id", adminController.updateSupportRequest);

// System Monitoring
router.get("/system-health", adminController.getSystemMonitoring);

// Admin Activity Logs
router.get("/activity-logs", adminController.getActivityLogs);

module.exports = router;
