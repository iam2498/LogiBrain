const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Trip = require('./models/Trip');
const Expense = require('./models/Expense');
const Truck = require('./models/Truck');
const Driver = require('./models/Driver');
const User = require('./models/User');
const { generateTripPdf } = require('./utils/tripPdfBuilder');
require('dotenv').config();

async function runTest() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/LogiBrain");
  
  const tripId = process.argv[2];
  if (!tripId) {
    console.log("Please provide a trip ID. e.g. node testPdf.js 6ab5683f9b06ad12c5273239");
    process.exit(1);
  }

  const trip = await Trip.findById(tripId)
      .populate("truckId")
      .populate({
        path: "driverId",
        populate: { path: "userId", select: "name email phone" }
      });

  if (!trip) {
    console.log("Trip not found!");
    process.exit(1);
  }

  const expenses = await Expense.find({ tripId: trip._id });
  
  const outPath = path.join(__dirname, `../test_${tripId}.pdf`);
  const stream = fs.createWriteStream(outPath);
  
  const pdfBuffer = await generateTripPdf(trip, expenses, null);
  
  fs.writeFileSync(outPath, pdfBuffer);
  console.log(`PDF successfully written to ${outPath}`);
  process.exit(0);
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
