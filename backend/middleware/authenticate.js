const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { JWT_ACCESS_SECRET } = require("../config/env");

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token provided, authorization denied" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
    const user = await User.findById(decoded._id)
      .select("isActive accountStatus role ownerId")
      .lean();

    if (!user) {
      return res.status(401).json({ success: false, message: "User account not found" });
    }

    if (!user.isActive || user.accountStatus === "SUSPENDED") {
      return res.status(403).json({
        success: false,
        message: "Account is suspended or inactive. Please contact platform support.",
      });
    }

    req.user = {
      _id: user._id,
      role: user.role,
      ownerId: user.ownerId,
    };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

module.exports = authenticate;
