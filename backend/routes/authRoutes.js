const express = require("express");
const {
  registerOwner,
  login,
  refresh,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
} = require("../controllers/authController");
const authenticate = require("../middleware/authenticate");
const rateLimit = require("express-rate-limit");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs for auth routes
  message: { success: false, message: "Too many login attempts, please try again later" },
});

router.post("/register-owner", authLimiter, registerOwner);
router.post("/login", authLimiter, login);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", authenticate, getMe);
router.patch("/change-password", authenticate, changePassword);

module.exports = router;
