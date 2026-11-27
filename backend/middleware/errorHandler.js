const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  let message = err.message || "Server Error";
  let statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);

  if (err.name === 'ZodError') {
    statusCode = 400;
    const errorsList = err.issues || err.errors || [];
    message = errorsList.map(e => e.message).join(", ") || "Validation Error";
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors || undefined,
  });
};

module.exports = errorHandler;
