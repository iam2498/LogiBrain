const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { MONGO_URI } = require("../config/env");

const seedAdmin = async () => {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB.");

    const adminEmail = "admin@logibrain.com";
    const adminPhone = "9999999999";
    const adminPassword = "admin123";

    let admin = await User.findOne({ $or: [{ email: adminEmail }, { phone: adminPhone }] });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    if (admin) {
      admin.role = "ADMIN";
      admin.isActive = true;
      admin.passwordHash = passwordHash;
      await admin.save();
      console.log(`Updated existing user (${admin.email}) to ADMIN role.`);
    } else {
      admin = await User.create({
        name: "LogiBrain Admin",
        email: adminEmail,
        phone: adminPhone,
        passwordHash,
        role: "ADMIN",
        isActive: true,
      });
      console.log("Created new ADMIN user:", adminEmail);
    }

    console.log("Admin account ready!");
    console.log("Email:", adminEmail);
    console.log("Password:", adminPassword);
    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin user:", error);
    process.exit(1);
  }
};

seedAdmin();
