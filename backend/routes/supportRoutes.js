const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const supportController = require("../controllers/supportController");

router.use(authenticate, authorize("OWNER"));

router.post("/", supportController.createSupportRequest);
router.get("/my", supportController.getMySupportRequests);

module.exports = router;
