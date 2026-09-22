const request = require("supertest");
const app = require("../src/app");
const db = require("./helpers/db");
const { validPatient, validDoctor, validVisit } = require("./helpers/factories");

const MISSING_ID = "64b7f0f2a1b2c3d4e5f60718";

beforeAll(db.connect);
afterEach(db.clear);
afterAll(db.close);

describe("POST /api/patients", () => {
  test("creates a patient -> 201 with computed age", async () => {
    const res = await request(app).post("/api/patients").send(validPatient());
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBeDefined();
    expect(typeof res.body.data.age).toBe("number");
  });

  test("ignores fields the client must not set (_id, createdAt)", async () => {
    const res = await request(app)
      .post("/api/patients")
      .send(validPatient({ _id: MISSING_ID, createdAt: "2000-01-01" }));
    expect(res.status).toBe(201);
    expect(res.body.data._id).not.toBe(MISSING_ID);
    expect(res.body.data.createdAt).not.toMatch(/^2000/);
  });

  test("missing required fields -> 400 with field errors", async () => {
    const res = await request(app).post("/api/patients").send({});
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e) => e.field)).toEqual(
      expect.arrayContaining(["name", "email", "dob", "gender"])
    );
  });

  test("invalid email -> 400", async () => {
    const res = await request(app).post("/api/patients").send(validPatient({ email: "bad" }));
    expect(res.status).toBe(400);
  });

  test("duplicate email -> 409", async () => {
    const body = validPatient();
    await request(app).post("/api/patients").send(body);
    const res = await request(app).post("/api/patients").send({ ...body, name: "Someone Else" });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already exists/i);
  });
});

describe("GET /api/patients", () => {
  beforeEach(async () => {
    await request(app).post("/api/patients").send(validPatient({ name: "Ali Khan", gender: "male" }));
    await request(app).post("/api/patients").send(validPatient({ name: "Ayesha Noor", gender: "female" }));
    await request(app).post("/api/patients").send(validPatient({ name: "Bilal Shah", gender: "male" }));
  });

  test("lists patients with pagination info -> 200", async () => {
    const res = await request(app).get("/api/patients?page=1&limit=2");
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.total).toBe(3);
    expect(res.body.pages).toBe(2);
  });

  test("filters by gender", async () => {
    const res = await request(app).get("/api/patients?gender=female");
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].name).toBe("Ayesha Noor");
  });

  test("searches by name (case-insensitive)", async () => {
    const res = await request(app).get("/api/patients?search=bilal");
    expect(res.body.total).toBe(1);
  });

  test("operator injection in a filter is ignored", async () => {
    const res = await request(app).get("/api/patients?gender[$ne]=male");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3); // filter was ignored, not applied
  });
});

describe("GET /api/patients/:id", () => {
  test("returns one patient -> 200", async () => {
    const created = await request(app).post("/api/patients").send(validPatient());
    const res = await request(app).get(`/api/patients/${created.body.data._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Ali Khan");
  });

  test("unknown id -> 404", async () => {
    const res = await request(app).get(`/api/patients/${MISSING_ID}`);
    expect(res.status).toBe(404);
  });

  test("malformed id -> 400", async () => {
    const res = await request(app).get("/api/patients/not-an-id");
    expect(res.status).toBe(400);
  });
});

describe("PUT /api/patients/:id", () => {
  test("updates a patient -> 200", async () => {
    const created = await request(app).post("/api/patients").send(validPatient());
    const res = await request(app)
      .put(`/api/patients/${created.body.data._id}`)
      .send({ phone: "+923009999999", address: "Peshawar" });
    expect(res.status).toBe(200);
    expect(res.body.data.address).toBe("Peshawar");
  });

  test("changing email to one already used -> 409", async () => {
    const a = await request(app).post("/api/patients").send(validPatient());
    const b = await request(app).post("/api/patients").send(validPatient());
    const res = await request(app)
      .put(`/api/patients/${b.body.data._id}`)
      .send({ email: a.body.data.email });
    expect(res.status).toBe(409);
  });

  test("invalid data -> 400 (validators run on update)", async () => {
    const created = await request(app).post("/api/patients").send(validPatient());
    const res = await request(app)
      .put(`/api/patients/${created.body.data._id}`)
      .send({ gender: "robot" });
    expect(res.status).toBe(400);
  });

  test("empty body -> 400", async () => {
    const created = await request(app).post("/api/patients").send(validPatient());
    const res = await request(app).put(`/api/patients/${created.body.data._id}`).send({});
    expect(res.status).toBe(400);
  });

  test("unknown id -> 404", async () => {
    const res = await request(app).put(`/api/patients/${MISSING_ID}`).send({ name: "Nobody" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/patients/:id", () => {
  test("deletes a patient -> 200 and it is gone", async () => {
    const created = await request(app).post("/api/patients").send(validPatient());
    const id = created.body.data._id;
    const res = await request(app).delete(`/api/patients/${id}`);
    expect(res.status).toBe(200);
    expect((await request(app).get(`/api/patients/${id}`)).status).toBe(404);
  });

  test("unknown id -> 404", async () => {
    const res = await request(app).delete(`/api/patients/${MISSING_ID}`);
    expect(res.status).toBe(404);
  });

  test("patient with visits cannot be deleted -> 409", async () => {
    const patient = (await request(app).post("/api/patients").send(validPatient())).body.data;
    const doctor = (await request(app).post("/api/doctors").send(validDoctor())).body.data;
    await request(app).post("/api/visits").send(validVisit(patient._id, doctor._id));

    const res = await request(app).delete(`/api/patients/${patient._id}`);
    expect(res.status).toBe(409);
  });
});
