const mongoose = require("mongoose");

const startedAt = new Date();
let totalRequestCount = 0;
let failedRequestCount = 0;
let applicationErrorCount = 0;

function requestMetricsMiddleware(req, res, next) {
  if (req.originalUrl && req.originalUrl.startsWith("/api/")) {
    totalRequestCount += 1;
    res.on("finish", () => {
      if (res.statusCode >= 400) {
        failedRequestCount += 1;
      }
    });
  }
  next();
}

function recordApplicationError() {
  applicationErrorCount += 1;
}

function getDatabaseStatusLabel(readyState) {
  switch (readyState) {
    case 1:
      return "CONNECTED";
    case 2:
      return "CONNECTING";
    case 3:
      return "DISCONNECTING";
    default:
      return "DISCONNECTED";
  }
}

function getSystemHealth() {
  const readyState = mongoose.connection.readyState;
  const databaseStatus = getDatabaseStatusLabel(readyState);
  const apiStatus = readyState === 1 ? "HEALTHY" : "DEGRADED";

  return {
    apiStatus,
    databaseStatus,
    uptimeSeconds: Math.floor(process.uptime()),
    startedAt: startedAt.toISOString(),
    checkedAt: new Date().toISOString(),
    errorCount: applicationErrorCount,
    failedRequestCount,
    totalRequestCount,
    nodeVersion: process.version,
    memoryUsageMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
  };
}

module.exports = {
  requestMetricsMiddleware,
  recordApplicationError,
  getSystemHealth,
};
