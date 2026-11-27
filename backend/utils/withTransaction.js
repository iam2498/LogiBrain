const mongoose = require("mongoose");

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function isTransactionUnsupportedError(error) {
  const msg = error?.message || "";
  return (
    error?.code === 20 ||
    /Transaction numbers are only allowed on a replica set member or mongos/i.test(msg) ||
    /does not support retryable writes/i.test(msg) ||
    /replica set/i.test(msg)
  );
}

function isStandaloneTopology() {
  const desc = mongoose.connection?.client?.topology?.description;
  return desc?.type === "Single";
}

/**
 * Execute `fn(session)` inside a MongoDB ACID transaction when supported by the
 * connected MongoDB topology (replica set / mongos). Falls back to running `fn(null)`
 * on standalone MongoDB servers so caller-provided compensation can roll back.
 */
async function withTransaction(fn) {
  if (isStandaloneTopology()) {
    const result = await fn(null);
    return { result, usedTransaction: false };
  }

  const session = await mongoose.startSession();
  try {
    let result;
    try {
      await session.withTransaction(async () => {
        result = await fn(session);
      });
      return { result, usedTransaction: true };
    } catch (error) {
      if (!isTransactionUnsupportedError(error)) {
        throw error;
      }
      result = await fn(null);
      return { result, usedTransaction: false };
    }
  } finally {
    await session.endSession();
  }
}

function sessionOptions(session) {
  return session ? { session } : {};
}

module.exports = { AppError, withTransaction, sessionOptions };
