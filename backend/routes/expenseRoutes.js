const express = require("express");
const {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
} = require("../controllers/expenseController");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const scopeOwnership = require("../middleware/scopeOwnership");
const upload = require("../services/uploadService");

const router = express.Router();

router.use(authenticate);
router.use(scopeOwnership);

// Both Owner and Driver can create expenses and view them
router.post("/", upload.single("receipt"), createExpense);
router.get("/", getExpenses);
router.get("/:id", getExpenseById);

// Only Owner can update or delete an expense
router.put("/:id", authorize("OWNER"), upload.single("receipt"), updateExpense);
router.delete("/:id", authorize("OWNER"), deleteExpense);

module.exports = router;
