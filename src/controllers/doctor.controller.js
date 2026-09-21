const Doctor = require("../models/Doctor");
const Visit = require("../models/Visit");
const AppError = require("../utils/AppError");
const crudController = require("./crudController");

module.exports = crudController(Doctor, {
  label: "Doctor",
  filterFields: ["specialization", "isAvailable"],
  searchFields: ["name", "email", "specialization"],
  beforeDelete: async (doctor) => {
    const hasVisits = await Visit.exists({ doctor: doctor._id });
    if (hasVisits) {
      throw new AppError("Cannot delete a doctor who has existing visits", 409);
    }
  },
});
