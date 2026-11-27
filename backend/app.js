const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const { CLIENT_ORIGIN } = require("./config/env");
const errorHandler = require("./middleware/errorHandler");
const { requestMetricsMiddleware } = require("./utils/systemMetrics");

const authRoutes = require("./routes/authRoutes");
const truckRoutes = require("./routes/truckRoutes");
const driverRoutes = require("./routes/driverRoutes");
const tripRoutes = require("./routes/tripRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const reportRoutes = require("./routes/reportRoutes");
const adminRoutes = require("./routes/adminRoutes");
const supportRoutes = require("./routes/supportRoutes");

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
app.use(requestMetricsMiddleware);

// Static route for uploads (receipts)
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/trucks", truckRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/support", supportRoutes);

// Error Handling Middleware
app.use(errorHandler);

module.exports = app;
