const mongoose = require("mongoose");

const supportRequestSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    category: {
      type: String,
      enum: ["ACCOUNT", "BILLING", "TECHNICAL", "GENERAL"],
      default: "GENERAL",
    },
    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "MEDIUM",
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "RESOLVED"],
      default: "PENDING",
    },
    adminResponse: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    respondedAt: {
      type: Date,
    },
    resolvedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

supportRequestSchema.index({ status: 1, createdAt: -1 });
supportRequestSchema.index({ ownerId: 1, createdAt: -1 });

module.exports = mongoose.model("SupportRequest", supportRequestSchema);
