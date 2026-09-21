const request = require("supertest");
const app = require("../src/app");
const db = require("./helpers/db");
const { validPatient, validDoctor, validVisit } = require("./helpers/factories");

const MISSING_ID = "64b7f0f2a1b2c3d4e5f60718";
let patient;
let doctor;

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

beforeEach(async () => {
  patient = (await request(app).post("/api/patients").send(validPatient())).body.data;
  doctor = (await request(app).post("/api/doctors").send(validDoctor())).body.data;
});

describe("POST /api/visits", () => {
  test("creates a visit -> 201 with populated patient and doctor", async () => {
    const res = await request(app).post("/api/visits").send(validVisit(patient._id, doctor._id));
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("scheduled");
    expect(res.body.data.patient.name).toBe("Ali Khan");
    expect(res.body.data.doctor.specialization).toBe("Cardiology");
    expect(res.body.data.isUpcoming).toBe(true);
  });

  test("missing required fields -> 400", async () => {
    const res = await request(app).post("/api/visits").send({});
    expect(res.status).toBe(400);
  });

  test("patient that does not exist -> 400", async () => {
    const res = await request(app).post("/api/visits").send(validVisit(MISSING_ID, doctor._id));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/patient does not exist/i);
  });

  test("doctor that does not exist -> 400", async () => {
    const res = await request(app).post("/api/visits").send(validVisit(patient._id, MISSING_ID));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/doctor does not exist/i);
  });

  test("malformed patient id -> 400", async () => {
    const res = await request(app).post("/api/visits").send(validVisit("abc", doctor._id));
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid patient id/i);
  });

  test("invalid status -> 400", async () => {
    const res = await request(app)
      .post("/api/visits")
      .send(validVisit(patient._id, doctor._id, { status: "done" }));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/visits", () => {
  beforeEach(async () => {
    await request(app).post("/api/visits").send(validVisit(patient._id, doctor._id, { status: "completed" }));
    await request(app).post("/api/visits").send(validVisit(patient._id, doctor._id, { reason: "Follow-up checkup" }));
  });

  test("lists visits -> 200", async () => {
    const res = await request(app).get("/api/visits");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
  });

  test("filters by status", async () => {
    const res = await request(app).get("/api/visits?status=completed");
    expect(res.body.total).toBe(1);
  });

  test("filters by patient and doctor", async () => {
    const res = await request(app).get(`/api/visits?patient=${patient._id}&doctor=${doctor._id}`);
    expect(res.body.total).toBe(2);
    const none = await request(app).get(`/api/visits?patient=${MISSING_ID}`);
    expect(none.body.total).toBe(0);
  });

  test("searches by reason", async () => {
    const res = await request(app).get("/api/visits?search=follow-up");
    expect(res.body.total).toBe(1);
  });

  test("bad filter value -> 400", async () => {
    const res = await request(app).get("/api/visits?patient=xyz");
    expect(res.status).toBe(400);
  });
});

describe("GET /api/visits/:id", () => {
  test("returns one visit -> 200", async () => {
    const created = await request(app).post("/api/visits").send(validVisit(patient._id, doctor._id));
    const res = await request(app).get(`/api/visits/${created.body.data._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.reason).toMatch(/chest pain/i);
  });

  test("unknown id -> 404", async () => {
    expect((await request(app).get(`/api/visits/${MISSING_ID}`)).status).toBe(404);
  });
});

describe("PUT /api/visits/:id", () => {
  test("updates status and diagnosis -> 200", async () => {
    const created = await request(app).post("/api/visits").send(validVisit(patient._id, doctor._id));
    const res = await request(app)
      .put(`/api/visits/${created.body.data._id}`)
      .send({ status: "completed", diagnosis: "Mild angina" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("completed");
    expect(res.body.data.diagnosis).toBe("Mild angina");
  });

  test("changing to a doctor that does not exist -> 400", async () => {
    const created = await request(app).post("/api/visits").send(validVisit(patient._id, doctor._id));
    const res = await request(app).put(`/api/visits/${created.body.data._id}`).send({ doctor: MISSING_ID });
    expect(res.status).toBe(400);
  });

  test("unknown id -> 404", async () => {
    const res = await request(app).put(`/api/visits/${MISSING_ID}`).send({ status: "cancelled" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/visits/:id", () => {
  test("deletes a visit -> 200", async () => {
    const created = await request(app).post("/api/visits").send(validVisit(patient._id, doctor._id));
    const res = await request(app).delete(`/api/visits/${created.body.data._id}`);
    expect(res.status).toBe(200);
    expect((await request(app).get(`/api/visits/${created.body.data._id}`)).status).toBe(404);
  });

  test("unknown id -> 404", async () => {
    expect((await request(app).delete(`/api/visits/${MISSING_ID}`)).status).toBe(404);
  });
});
