const User = require("../models/User");
const Driver = require("../models/Driver");
const AdminActivityLog = require("../models/AdminActivityLog");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendPasswordResetEmail } = require("../services/emailService");
const { JWT_ACCESS_SECRET, JWT_REFRESH_SECRET } = require("../config/env");
const {
  registerOwnerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateOwnerProfileSchema,
} = require("../validators/authValidator");

const generateTokens = (user) => {
  const payload = { _id: user._id, role: user.role, ownerId: user.ownerId };
  const accessToken = jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });
  return { accessToken, refreshToken };
};

exports.registerOwner = async (req, res, next) => {
  try {
    const parsedData = registerOwnerSchema.parse(req.body);

    const existingUser = await User.findOne({
      $or: [{ email: parsedData.email }, { phone: parsedData.phone }],
    });
    if (existingUser) {
      if (existingUser.email === parsedData.email && existingUser.phone === parsedData.phone) {
        return res
          .status(400)
          .json({ success: false, message: "User with this email and phone already exists" });
      } else if (existingUser.email === parsedData.email) {
        return res
          .status(400)
          .json({ success: false, message: "User with this email already exists" });
      } else {
        return res
          .status(400)
          .json({ success: false, message: "User with this phone number already exists" });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(parsedData.password, salt);

    const newUser = await User.create({
      name: parsedData.name,
      email: parsedData.email,
      phone: parsedData.phone,
      passwordHash,
      role: "OWNER",
      businessName: parsedData.businessName,
      businessAddress: parsedData.businessAddress,
      gstNumber: parsedData.gstNumber,
    });

    res.status(201).json({
      success: true,
      data: { _id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role },
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { identifier, password } = loginSchema.parse(req.body);
    const normalizedEmail = identifier.toLowerCase();

    const user = await User.findOne({
      $or: [{ email: identifier }, { email: normalizedEmail }, { phone: identifier }],
    });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    if (!user.isActive || user.accountStatus === "SUSPENDED") {
      return res
        .status(403)
        .json({ success: false, message: "Account is suspended or inactive. Please contact platform support." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });
    if (user.role === "ADMIN") {
      await AdminActivityLog.create({
        adminId: user._id,
        action: "ADMIN_LOGIN",
        targetType: "ADMIN",
        targetId: user._id,
        targetLabel: user.email,
      }).catch(() => {});
    }

    const { accessToken, refreshToken } = generateTokens(user);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: {
        accessToken,
        user: { _id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { identifier } = forgotPasswordSchema.parse(req.body);

    const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] });
    if (!user || !user.isActive) {
      return res
        .status(404)
        .json({ success: false, message: "No active account found with this email or phone number" });
    }

    // Generate random 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const salt = await bcrypt.genSalt(10);
    user.resetPasswordOtp = await bcrypt.hash(otp, salt);
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await user.save();

    // Send the verification code to the user's email via Nodemailer
    await sendPasswordResetEmail(user.email, user.name, otp);

    res.json({
      success: true,
      message: `A 6-digit verification code has been sent to your email (${user.email}). Please check your inbox.`,
      data: {
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { identifier, otp, newPassword } = resetPasswordSchema.parse(req.body);

    const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] });
    if (!user || !user.isActive) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    if (
      !user.resetPasswordOtp ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Verification code has expired. Please request a new code",
      });
    }

    const isMatch = await bcrypt.compare(otp, user.resetPasswordOtp);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid verification code" });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.resetPasswordOtp = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: "Password reset successful. You can now log in with your new password.",
    });
  } catch (error) {
    next(error);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) return res.status(401).json({ success: false, message: "No refresh token" });

    jwt.verify(refreshToken, JWT_REFRESH_SECRET, async (err, decoded) => {
      if (err) return res.status(403).json({ success: false, message: "Invalid refresh token" });

      const user = await User.findById(decoded._id);
      if (!user || !user.isActive || user.accountStatus === "SUSPENDED")
        return res.status(401).json({ success: false, message: "User not found or suspended" });

      const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({ success: true, data: { accessToken } });
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    const refreshToken = req.cookies?.refreshToken;
    let adminId = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
        if (decoded?.role === "ADMIN") adminId = decoded._id;
      } catch (_) {}
    } else if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        if (decoded?.role === "ADMIN") adminId = decoded._id;
      } catch (_) {}
    }

    if (adminId) {
      await AdminActivityLog.create({
        adminId,
        action: "ADMIN_LOGOUT",
        targetType: "ADMIN",
        targetId: adminId,
      }).catch(() => {});
    }
  } catch (_) {}

  res.clearCookie("refreshToken");
  res.json({ success: true, message: "Logged out successfully" });
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    if (user.role === "ADMIN") {
      await AdminActivityLog.create({
        adminId: user._id,
        action: "ADMIN_PASSWORD_CHANGED",
        targetType: "ADMIN",
        targetId: user._id,
        targetLabel: user.email,
      }).catch(() => {});
    }

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const parsedData = updateOwnerProfileSchema.parse(req.body);
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const conflict = await User.findOne({
      _id: { $ne: user._id },
      $or: [{ email: parsedData.email }, { phone: parsedData.phone }],
    }).lean();

    if (conflict) {
      if (conflict.email === parsedData.email && conflict.phone === parsedData.phone) {
        return res.status(400).json({
          success: false,
          message: "Another account already uses this email and phone number",
        });
      }
      if (conflict.email === parsedData.email) {
        return res.status(400).json({
          success: false,
          message: "Another account already uses this email address",
        });
      }
      return res.status(400).json({
        success: false,
        message: "Another account already uses this phone number",
      });
    }

    user.name = parsedData.name;
    user.email = parsedData.email;
    user.phone = parsedData.phone;
    user.businessName = parsedData.businessName;
    user.businessAddress = parsedData.businessAddress;
    user.gstNumber = parsedData.gstNumber || "";
    await user.save();

    const safeUser = await User.findById(user._id)
      .select("-passwordHash -resetPasswordOtp -resetPasswordExpires")
      .lean();

    res.json({
      success: true,
      message: "Owner profile updated successfully",
      data: safeUser,
    });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select(
      "-passwordHash -resetPasswordOtp -resetPasswordExpires"
    );
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    let profile = user.toObject();

    if (user.role === "DRIVER") {
      const driverProfile = await Driver.findOne({ userId: user._id });
      if (driverProfile) {
        profile.driverInfo = driverProfile;
      }
    }

    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};
