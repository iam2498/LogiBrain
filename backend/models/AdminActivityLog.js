const mongoose = require("mongoose");

const adminActivityLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: [
        "OWNER_ACTIVATED",
        "OWNER_SUSPENDED",
        "OWNER_REACTIVATED",
        "SUPPORT_REQUEST_UPDATED",
        "ADMIN_LOGIN",
        "ADMIN_LOGOUT",
        "ADMIN_PASSWORD_CHANGED",
      ],
      required: true,
    },
    targetType: {
      type: String,
      enum: ["OWNER", "SUPPORT_REQUEST", "ADMIN"],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    targetLabel: {
      type: String,
      trim: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

adminActivityLogSchema.index({ createdAt: -1 });
adminActivityLogSchema.index({ adminId: 1, createdAt: -1 });
adminActivityLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model("AdminActivityLog", adminActivityLogSchema);
