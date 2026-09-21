const Visit = require("../models/Visit");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const AppError = require("../utils/AppError");
const { OBJECT_ID_REGEX } = require("../middleware/validateObjectId");
const crudController = require("./crudController");

/** Makes sure the patient / doctor sent in the body really exist. */
async function verifyReferences(body) {
  const checks = [
    { field: "patient", Model: Patient, label: "Patient" },
    { field: "doctor", Model: Doctor, label: "Doctor" },
  ];

  for (const { field, Model, label } of checks) {
    if (body[field] === undefined) continue; // not being set (e.g. partial update)
    if (typeof body[field] !== "string" || !OBJECT_ID_REGEX.test(body[field])) {
      throw new AppError(`Invalid ${field} ID`, 400);
    }
    const exists = await Model.exists({ _id: body[field] });
    if (!exists) throw new AppError(`${label} does not exist`, 400);
  }
}

module.exports = crudController(Visit, {
  label: "Visit",
  populate: [
    { path: "patient", select: "name email" },
    { path: "doctor", select: "name specialization" },
  ],
  filterFields: ["patient", "doctor", "status"],
  searchFields: ["reason", "diagnosis"],
  sort: { visitDate: -1 },
  beforeSave: verifyReferences,
});
