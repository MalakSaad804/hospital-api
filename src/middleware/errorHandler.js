const AppError = require("../utils/AppError");

/** Handles requests to routes that do not exist (404). */
const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

/**
 * Central error handler. Converts every kind of error into the same JSON shape:
 * { success: false, message: "...", errors?: [...] }
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors;

  if (err.name === "ValidationError") {
    // Mongoose schema validation failed
    status = 400;
    message = "Validation failed";
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.name === "CastError") {
    // e.g. a wrong type for a field or filter
    status = 400;
    message = `Invalid value for '${err.path}'`;
  } else if (err.code === 11000) {
    // Duplicate key (unique index)
    status = 409;
    // MongoDB tells us which field clashed (keyValue); fall back to a generic message otherwise
    const field = Object.keys(err.keyValue || err.keyPattern || {})[0];
    message = field ? `${field} already exists` : "A record with this value already exists";
  } else if (err.type === "entity.parse.failed") {
    // Malformed JSON body
    status = 400;
    message = "Invalid JSON in request body";
  }

  if (status >= 500) {
    if (process.env.NODE_ENV !== "test") console.error(err);
    if (process.env.NODE_ENV === "production") message = "Internal Server Error";
  }

  res.status(status).json({ success: false, message, ...(errors && { errors }) });
};

module.exports = { notFound, errorHandler };
