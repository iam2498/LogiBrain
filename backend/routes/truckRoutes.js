const express = require("express");
const {
  createTruck,
  getTrucks,
  getTruckById,
  updateTruck,
  updateTruckStatus,
  getTruckHistory,
  deleteTruck,
} = require("../controllers/truckController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

const router = express.Router();

// All truck routes are for owners only
router.use(authenticate);
router.use(authorize("OWNER"));

router.post("/", createTruck);
router.get("/", getTrucks);
router.get("/:id", getTruckById);
router.put("/:id", updateTruck);
router.patch("/:id/status", updateTruckStatus);
router.get("/:id/history", getTruckHistory);
router.delete("/:id", deleteTruck);

module.exports = router;
