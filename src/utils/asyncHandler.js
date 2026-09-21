/**
 * Wraps an async route handler so any rejected promise is passed to next().
 * This avoids writing try/catch in every controller.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
