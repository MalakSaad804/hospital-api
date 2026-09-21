const request = require("supertest");
const app = require("../src/app");

describe("App basics (no database needed)", () => {
  test("GET /health -> 200", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("GET / -> 200 with endpoint list", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.endpoints).toContain("/api/patients");
  });

  test("unknown route -> 404 JSON", async () => {
    const res = await request(app).get("/api/unknown");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test("malformed JSON body -> 400", async () => {
    const res = await request(app)
      .post("/api/patients")
      .set("Content-Type", "application/json")
      .send('{"name": ');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid json/i);
  });

  test.each(["patients", "doctors", "visits"])("GET /api/%s/:id with a bad id -> 400", async (resource) => {
    const res = await request(app).get(`/api/${resource}/123`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid id/i);
  });
});
