const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Driver = require("../models/Driver");
const Truck = require("../models/Truck");
const Trip = require("../models/Trip");
const Expense = require("../models/Expense");
const { generateTripReport } = require("../services/tripReportService");
const { MONGO_URI } = require("../config/env");

const seedData = async () => {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected.");

    // Clear existing data
    await User.deleteMany();
    await Driver.deleteMany();
    await Truck.deleteMany();
    await Trip.deleteMany();
    await Expense.deleteMany();
    await mongoose.model("TripReport").deleteMany(); // Since it might be registered

    console.log("Cleared existing data.");

    // Create Owner
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("password123", salt);

    const owner = await User.create({
      name: "Demo Owner",
      email: "owner@demo.com",
      phone: "1234567890",
      passwordHash,
      role: "OWNER",
      businessName: "Demo Logistics",
      businessAddress: "123 Main St, Tech City",
    });

    console.log("Owner created.");

    // Create Trucks
    const trucksData = [
      { registrationNumber: "MH-12-AB-1234", truckType: "10 Wheeler", capacity: "25 Ton", status: "ACTIVE" },
      { registrationNumber: "MH-12-CD-5678", truckType: "12 Wheeler", capacity: "35 Ton", status: "ACTIVE" },
      { registrationNumber: "MH-14-EF-9012", truckType: "6 Wheeler", capacity: "10 Ton", status: "ACTIVE" },
      { registrationNumber: "MH-14-GH-3456", truckType: "10 Wheeler", capacity: "25 Ton", status: "MAINTENANCE" },
    ];
    
    const trucks = [];
    for (const t of trucksData) {
      trucks.push(await Truck.create({ ...t, ownerId: owner._id }));
    }

    console.log("Trucks created.");

    // Create Drivers
    const driversData = [
      { name: "Driver One", email: "driver1@demo.com", phone: "9876543210", licenseNumber: "LIC1001" },
      { name: "Driver Two", email: "driver2@demo.com", phone: "9876543211", licenseNumber: "LIC1002" },
      { name: "Driver Three", email: "driver3@demo.com", phone: "9876543212", licenseNumber: "LIC1003" },
    ];

    const drivers = [];
    for (const d of driversData) {
      const driverUser = await User.create({
        name: d.name,
        email: d.email,
        phone: d.phone,
        passwordHash,
        role: "DRIVER",
        ownerId: owner._id,
      });

      const driverProfile = await Driver.create({
        userId: driverUser._id,
        ownerId: owner._id,
        licenseNumber: d.licenseNumber,
      });

      drivers.push(driverProfile);
    }

    console.log("Drivers created.");

    // Create Trips
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    const pastDateEnd = new Date();
    pastDateEnd.setDate(pastDateEnd.getDate() - 2);

    const trip1 = await Trip.create({
      ownerId: owner._id,
      truckId: trucks[0]._id,
      driverId: drivers[0]._id,
      source: "Mumbai",
      destination: "Pune",
      customer: "ABC Corp",
      material: "Steel",
      expectedRevenue: 15000,
      actualRevenue: 15000,
      startDate: pastDate,
      actualEndDate: pastDateEnd,
      status: "COMPLETED",
    });

    const trip2 = await Trip.create({
      ownerId: owner._id,
      truckId: trucks[1]._id,
      driverId: drivers[1]._id,
      source: "Delhi",
      destination: "Jaipur",
      customer: "XYZ Ltd",
      material: "Electronics",
      expectedRevenue: 25000,
      startDate: new Date(),
      status: "ACTIVE",
    });

    const trip3 = await Trip.create({
      ownerId: owner._id,
      truckId: trucks[2]._id,
      driverId: drivers[2]._id,
      source: "Chennai",
      destination: "Bangalore",
      customer: "LMN Inc",
      material: "Textiles",
      expectedRevenue: 12000,
      startDate: new Date(),
      status: "DRIVER_ENDED",
    });

    console.log("Trips created.");

    // Create Expenses
    const expenses = [
      { tripId: trip1._id, truckId: trucks[0]._id, driverId: drivers[0]._id, category: "Fuel", amount: 4000, date: pastDate },
      { tripId: trip1._id, truckId: trucks[0]._id, driverId: drivers[0]._id, category: "Toll", amount: 500, date: pastDate },
      { tripId: trip2._id, truckId: trucks[1]._id, driverId: drivers[1]._id, category: "Fuel", amount: 8000, date: new Date() },
      { tripId: trip3._id, truckId: trucks[2]._id, driverId: drivers[2]._id, category: "Food", amount: 300, date: new Date() },
    ];

    for (const exp of expenses) {
      await Expense.create({
        ...exp,
        ownerId: owner._id,
        addedBy: "DRIVER",
        addedByUserId: exp.driverId,
      });
    }

    console.log("Expenses created.");

    // Generate report for completed trip
    await generateTripReport(trip1._id);
    
    console.log("Trip reports generated.");

    console.log("Database seeded successfully!");
    console.log("\n--- Demo Credentials ---");
    console.log("Owner: owner@demo.com / password123");
    console.log("Driver: driver1@demo.com / password123");
    console.log("------------------------\n");

    process.exit(0);
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
};

seedData();
