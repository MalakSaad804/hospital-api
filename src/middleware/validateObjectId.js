const AppError = require("../utils/AppError");

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/** Rejects requests whose :id param is not a valid MongoDB ObjectId (400). */
module.exports = (req, res, next) => {
  if (!OBJECT_ID_REGEX.test(req.params.id)) {
    return next(new AppError("Invalid ID format", 400));
  }
  next();
};

module.exports.OBJECT_ID_REGEX = OBJECT_ID_REGEX;
