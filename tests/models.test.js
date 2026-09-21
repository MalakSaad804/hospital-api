/**
 * Pure unit tests for the schemas - they use validateSync(), so NO database is needed.
 */
const Patient = require("../src/models/Patient");
const Doctor = require("../src/models/Doctor");
const Visit = require("../src/models/Visit");
const mongoose = require("mongoose");
const { validPatient, validDoctor, validVisit } = require("./helpers/factories");

describe("Patient schema", () => {
  test("accepts a valid patient and lowercases the email", () => {
    const patient = new Patient(validPatient({ email: "ALI@Example.com" }));
    expect(patient.validateSync()).toBeUndefined();
    expect(patient.email).toBe("ali@example.com");
  });

  test("requires name, email, dob and gender", () => {
    const error = new Patient({}).validateSync();
    expect(Object.keys(error.errors)).toEqual(
      expect.arrayContaining(["name", "email", "dob", "gender"])
    );
  });

  test("rejects invalid email, gender and blood group", () => {
    const error = new Patient(
      validPatient({ email: "not-an-email", gender: "x", bloodGroup: "Z+" })
    ).validateSync();
    expect(error.errors.email).toBeDefined();
    expect(error.errors.gender).toBeDefined();
    expect(error.errors.bloodGroup).toBeDefined();
  });

  test("rejects a date of birth in the future", () => {
    const error = new Patient(validPatient({ dob: "2999-01-01" })).validateSync();
    expect(error.errors.dob).toBeDefined();
  });

  test("virtual 'age' is computed from dob", () => {
    const today = new Date();
    const dob = new Date(today.getFullYear() - 30, today.getMonth(), today.getDate());
    dob.setDate(dob.getDate() - 1); // birthday was yesterday -> exactly 30
    expect(new Patient(validPatient({ dob })).age).toBe(30);
  });

  test("virtual 'age' is one less if the birthday has not happened yet this year", () => {
    const today = new Date();
    const dob = new Date(today.getFullYear() - 30, today.getMonth(), today.getDate() + 2);
    expect(new Patient(validPatient({ dob })).age).toBe(29);
  });

  test("declares the expected indexes", () => {
    const keys = Patient.schema.indexes().map(([fields]) => Object.keys(fields)[0]);
    expect(keys).toEqual(expect.arrayContaining(["email", "name"]));
  });
});

describe("Doctor schema", () => {
  test("accepts a valid doctor and uppercases the license number", () => {
    const doctor = new Doctor(validDoctor({ licenseNumber: "abc-1" }));
    expect(doctor.validateSync()).toBeUndefined();
    expect(doctor.licenseNumber).toBe("ABC-1");
  });

  test("requires name, email, specialization and licenseNumber", () => {
    const error = new Doctor({}).validateSync();
    expect(Object.keys(error.errors)).toEqual(
      expect.arrayContaining(["name", "email", "specialization", "licenseNumber"])
    );
  });

  test("rejects negative experience and fee", () => {
    const error = new Doctor(validDoctor({ experienceYears: -1, consultationFee: -5 })).validateSync();
    expect(error.errors.experienceYears).toBeDefined();
    expect(error.errors.consultationFee).toBeDefined();
  });

  test("virtual 'displayName' adds the Dr. prefix only once", () => {
    expect(new Doctor(validDoctor({ name: "Sara Ahmed" })).displayName).toBe("Dr. Sara Ahmed");
    expect(new Doctor(validDoctor({ name: "Dr. Sara Ahmed" })).displayName).toBe("Dr. Sara Ahmed");
  });
});

describe("Visit schema", () => {
  const id = () => new mongoose.Types.ObjectId();

  test("accepts a valid visit and defaults status to 'scheduled'", () => {
    const visit = new Visit(validVisit(id(), id()));
    expect(visit.validateSync()).toBeUndefined();
    expect(visit.status).toBe("scheduled");
  });

  test("requires patient, doctor, visitDate and reason", () => {
    const error = new Visit({}).validateSync();
    expect(Object.keys(error.errors)).toEqual(
      expect.arrayContaining(["patient", "doctor", "visitDate", "reason"])
    );
  });

  test("rejects an invalid status", () => {
    const error = new Visit(validVisit(id(), id(), { status: "done" })).validateSync();
    expect(error.errors.status).toBeDefined();
  });

  test("virtual 'isUpcoming' is true only for future scheduled visits", () => {
    const future = new Visit(validVisit(id(), id(), { visitDate: "2999-01-01" }));
    const past = new Visit(validVisit(id(), id(), { visitDate: "2000-01-01" }));
    const cancelled = new Visit(validVisit(id(), id(), { visitDate: "2999-01-01", status: "cancelled" }));
    expect(future.isUpcoming).toBe(true);
    expect(past.isUpcoming).toBe(false);
    expect(cancelled.isUpcoming).toBe(false);
  });
});
