const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const adminController = require("../controllers/adminController");

// All admin routes require authentication and ADMIN role
router.use(authenticate, authorize("ADMIN"));

// 1. Dashboard Stats
router.get("/stats", adminController.getAdminDashboardStats);

// 2. User Management
router.get("/users", adminController.getAllUsers);
router.patch("/users/:id/status", adminController.toggleUserStatus);

// 3. Owner Management
router.get("/owners", adminController.getAllOwners);
router.get("/owners/:id", adminController.getOwnerDetails);

// 4. All Trips View
router.get("/trips", adminController.getAllTrips);

// 5. Platform Reports
router.get("/reports", adminController.getAdminReports);

module.exports = router;
