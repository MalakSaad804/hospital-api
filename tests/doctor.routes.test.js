const request = require("supertest");
const app = require("../src/app");
const db = require("./helpers/db");
const { validPatient, validDoctor, validVisit } = require("./helpers/factories");

const MISSING_ID = "64b7f0f2a1b2c3d4e5f60718";

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

describe("POST /api/doctors", () => {
  test("creates a doctor -> 201 with displayName", async () => {
    const res = await request(app).post("/api/doctors").send(validDoctor({ licenseNumber: "abc-123" }));
    expect(res.status).toBe(201);
    expect(res.body.data.displayName).toBe("Dr. Sara Ahmed");
    expect(res.body.data.licenseNumber).toBe("ABC-123");
    expect(res.body.data.isAvailable).toBe(true);
  });

  test("missing required fields -> 400", async () => {
    const res = await request(app).post("/api/doctors").send({ name: "Only Name" });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field)).toEqual(
      expect.arrayContaining(["email", "specialization", "licenseNumber"])
    );
  });

  test("duplicate license number -> 409", async () => {
    await request(app).post("/api/doctors").send(validDoctor({ licenseNumber: "SAME-1" }));
    const res = await request(app).post("/api/doctors").send(validDoctor({ licenseNumber: "SAME-1" }));
    expect(res.status).toBe(409);
  });

  test("negative fee -> 400", async () => {
    const res = await request(app).post("/api/doctors").send(validDoctor({ consultationFee: -10 }));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/doctors", () => {
  beforeEach(async () => {
    await request(app).post("/api/doctors").send(validDoctor({ specialization: "Cardiology" }));
    await request(app).post("/api/doctors").send(validDoctor({ specialization: "Dermatology", isAvailable: false }));
  });

  test("lists doctors -> 200", async () => {
    const res = await request(app).get("/api/doctors");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
  });

  test("filters by specialization and availability", async () => {
    const bySpec = await request(app).get("/api/doctors?specialization=Dermatology");
    expect(bySpec.body.total).toBe(1);
    const byAvail = await request(app).get("/api/doctors?isAvailable=true");
    expect(byAvail.body.total).toBe(1);
  });

  test("searches by specialization text", async () => {
    const res = await request(app).get("/api/doctors?search=cardio");
    expect(res.body.total).toBe(1);
  });
});

describe("GET /api/doctors/:id", () => {
  test("returns one doctor -> 200", async () => {
    const created = await request(app).post("/api/doctors").send(validDoctor());
    const res = await request(app).get(`/api/doctors/${created.body.data._id}`);
    expect(res.status).toBe(200);
  });

  test("unknown id -> 404", async () => {
    expect((await request(app).get(`/api/doctors/${MISSING_ID}`)).status).toBe(404);
  });
});

describe("PUT /api/doctors/:id", () => {
  test("updates a doctor -> 200", async () => {
    const created = await request(app).post("/api/doctors").send(validDoctor());
    const res = await request(app)
      .put(`/api/doctors/${created.body.data._id}`)
      .send({ consultationFee: 3500, isAvailable: false });
    expect(res.status).toBe(200);
    expect(res.body.data.consultationFee).toBe(3500);
    expect(res.body.data.isAvailable).toBe(false);
  });

  test("invalid data -> 400", async () => {
    const created = await request(app).post("/api/doctors").send(validDoctor());
    const res = await request(app)
      .put(`/api/doctors/${created.body.data._id}`)
      .send({ experienceYears: 200 });
    expect(res.status).toBe(400);
  });

  test("unknown id -> 404", async () => {
    const res = await request(app).put(`/api/doctors/${MISSING_ID}`).send({ name: "Nobody" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/doctors/:id", () => {
  test("deletes a doctor -> 200", async () => {
    const created = await request(app).post("/api/doctors").send(validDoctor());
    const res = await request(app).delete(`/api/doctors/${created.body.data._id}`);
    expect(res.status).toBe(200);
  });

  test("unknown id -> 404", async () => {
    expect((await request(app).delete(`/api/doctors/${MISSING_ID}`)).status).toBe(404);
  });

  test("doctor with visits cannot be deleted -> 409", async () => {
    const patient = (await request(app).post("/api/patients").send(validPatient())).body.data;
    const doctor = (await request(app).post("/api/doctors").send(validDoctor())).body.data;
    await request(app).post("/api/visits").send(validVisit(patient._id, doctor._id));

    const res = await request(app).delete(`/api/doctors/${doctor._id}`);
    expect(res.status).toBe(409);
  });
});
