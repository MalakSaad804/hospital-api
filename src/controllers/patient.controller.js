const Patient = require("../models/Patient");
const Visit = require("../models/Visit");
const AppError = require("../utils/AppError");
const crudController = require("./crudController");

module.exports = crudController(Patient, {
  label: "Patient",
  filterFields: ["gender", "bloodGroup"],
  searchFields: ["name", "email"],
  // A patient with medical history cannot be removed
  beforeDelete: async (patient) => {
    const hasVisits = await Visit.exists({ patient: patient._id });
    if (hasVisits) {
      throw new AppError("Cannot delete a patient who has existing visits", 409);
    }
  },
});
