const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["OWNER", "DRIVER"], required: true },
    businessName: { type: String }, // only for OWNER
    businessAddress: { type: String }, // only for OWNER
    gstNumber: { type: String }, // optional, OWNER only
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // only for DRIVER
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
