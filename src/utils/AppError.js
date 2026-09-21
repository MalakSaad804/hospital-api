/**
 * Custom error that carries an HTTP status code.
 * Throw it anywhere in a controller: throw new AppError("Not found", 404)
 * The central error handler turns it into a JSON response.
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
