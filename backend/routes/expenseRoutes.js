const express = require("express");
const {
  createExpense,
  getExpenses,
  getExpenseById,
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

// Only Owner can delete an expense
router.delete("/:id", authorize("OWNER"), deleteExpense);

module.exports = router;
