const express = require("express");
const {
  createTrip,
  getTrips,
  getTripById,
  driverEndTrip,
  ownerConfirmEndTrip,
  cancelTrip,
  getTripHistory,
  deleteTrip,
} = require("../controllers/tripController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const scopeOwnership = require("../middleware/scopeOwnership");

const router = express.Router();

router.use(authenticate);
router.use(authorize("OWNER", "DRIVER"));
router.use(scopeOwnership); // Applies req.scopedQuery based on role (OWNER or DRIVER)

// Owner only
router.post("/", authorize("OWNER"), createTrip);
router.put("/:id", authorize("OWNER"), require("../controllers/tripController").updateTrip);
router.patch("/:id/confirm-end", authorize("OWNER"), ownerConfirmEndTrip);
router.patch("/:id/cancel", authorize("OWNER"), cancelTrip);
router.delete("/:id", authorize("OWNER"), deleteTrip);

// Shared, but scoped
router.get("/", getTrips);
router.get("/history", getTripHistory);
router.get("/:id", getTripById);

// Driver only (or shared, depending on how strict we want it, but driver requests end)
router.patch("/:id/end", authorize("DRIVER"), driverEndTrip);

module.exports = router;
