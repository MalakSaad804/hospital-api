# Hospital API

A REST API for managing **Patients**, **Doctors** and **Visits**, built with **Node.js, Express and MongoDB (Mongoose)**.

- Mongoose schemas with required fields, validation, **indexes** and **virtual (computed) fields**
- Full **CRUD** endpoints with correct HTTP status codes
- Pagination, filtering and search on every list endpoint
- Central error handling with one consistent JSON error format
- **Unit + integration tests** (Jest, Supertest) with ~95% coverage

---

## Table of contents
1. [Project structure](#project-structure)
2. [Getting started](#getting-started)
3. [Data models](#data-models)
4. [API documentation](#api-documentation)
5. [Error handling](#error-handling)
6. [Testing](#testing)
7. [Design decisions](#design-decisions)

---

## Project structure

```
hospital-api/
├── src/
│   ├── app.js                    # Express app (middleware + routes)
│   ├── server.js                 # Starts the server after connecting to MongoDB
│   ├── config/db.js              # MongoDB connection (uses MONGO_URI env variable)
│   ├── models/                   # Patient.js, Doctor.js, Visit.js
│   ├── controllers/              # crudController.js (generic CRUD) + one file per resource
│   ├── routes/                   # patient / doctor / visit routes
│   ├── middleware/               # validateObjectId.js, errorHandler.js
│   └── utils/                    # AppError, asyncHandler, escapeRegex
├── tests/                        # Jest tests (models, app, and routes for each resource)
├── .env.example
└── package.json
```

## Getting started

**Requirements:** Node.js 18+ and a MongoDB instance (local or MongoDB Atlas).

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
cp .env.example .env        # Windows: copy .env.example .env
# then edit MONGO_URI if needed

# 3. Run
npm run dev                 # development (auto-restart with nodemon)
npm start                   # production
```

### Environment variables

| Variable    | Description                  | Example                                   |
|-------------|------------------------------|-------------------------------------------|
| `PORT`      | Port the server listens on   | `5000`                                    |
| `MONGO_URI` | MongoDB connection string    | `mongodb://127.0.0.1:27017/hospital_db`   |

The database connection is read from environment variables, so no credentials are stored in the code. `.env` is git-ignored.

### Scripts

| Command         | What it does                                  |
|-----------------|-----------------------------------------------|
| `npm start`     | Start the server                              |
| `npm run dev`   | Start with nodemon                            |
| `npm test`      | Run all tests with a coverage report          |

---

## Data models

### Patient
| Field        | Type   | Rules                                                   |
|--------------|--------|---------------------------------------------------------|
| `name`       | String | **required**, 2-100 chars                               |
| `email`      | String | **required**, **unique**, valid email, stored lowercase |
| `dob`        | Date   | **required**, cannot be in the future                   |
| `gender`     | String | **required**, one of `male`, `female`, `other`          |
| `phone`      | String | optional, 7-15 digits (may start with `+`)             |
| `address`    | String | optional, max 255 chars                                 |
| `bloodGroup` | String | optional, `A+ A- B+ B- AB+ AB- O+ O-`                   |
| `age`        | Number | **virtual** - computed from `dob`, not stored           |

Indexes: `email` (unique), `name`, `createdAt`

### Doctor
| Field             | Type    | Rules                                             |
|-------------------|---------|---------------------------------------------------|
| `name`            | String  | **required**, 2-100 chars                         |
| `email`           | String  | **required**, **unique**, valid email             |
| `specialization`  | String  | **required**                                      |
| `licenseNumber`   | String  | **required**, **unique**, stored uppercase        |
| `phone`           | String  | optional                                          |
| `experienceYears` | Number  | 0-60, default `0`                                 |
| `consultationFee` | Number  | >= 0, default `0`                                 |
| `isAvailable`     | Boolean | default `true`                                    |
| `displayName`     | String  | **virtual** - `"Dr. <name>"`                      |

Indexes: `email` (unique), `licenseNumber` (unique), `{specialization, isAvailable}`, `name`

### Visit
| Field       | Type     | Rules                                                              |
|-------------|----------|--------------------------------------------------------------------|
| `patient`   | ObjectId | **required**, reference to a Patient (must exist)                  |
| `doctor`    | ObjectId | **required**, reference to a Doctor (must exist)                   |
| `visitDate` | Date     | **required**                                                       |
| `reason`    | String   | **required**, max 500 chars                                        |
| `diagnosis` | String   | optional, max 1000 chars                                           |
| `status`    | String   | `scheduled` (default), `completed`, `cancelled`                    |
| `fee`       | Number   | optional, >= 0                                                     |
| `isUpcoming`| Boolean  | **virtual** - `true` for scheduled visits in the future            |

Indexes: `{patient, visitDate: -1}`, `{doctor, visitDate: -1}`, `status`

All models also get `createdAt` and `updatedAt` automatically.

---

## API documentation

**Base URL:** `http://localhost:5000`  |  **Content-Type:** `application/json`

### Resources

| Method | Endpoint              | Description             | Success | Possible errors        |
|--------|-----------------------|-------------------------|---------|------------------------|
| POST   | `/api/patients`       | Create a patient        | 201     | 400, 409               |
| GET    | `/api/patients`       | List patients           | 200     | -                      |
| GET    | `/api/patients/:id`   | Get one patient         | 200     | 400, 404               |
| PUT    | `/api/patients/:id`   | Update a patient        | 200     | 400, 404, 409          |
| DELETE | `/api/patients/:id`   | Delete a patient        | 200     | 400, 404, 409          |
| POST   | `/api/doctors`        | Create a doctor         | 201     | 400, 409               |
| GET    | `/api/doctors`        | List doctors            | 200     | -                      |
| GET    | `/api/doctors/:id`    | Get one doctor          | 200     | 400, 404               |
| PUT    | `/api/doctors/:id`    | Update a doctor         | 200     | 400, 404, 409          |
| DELETE | `/api/doctors/:id`    | Delete a doctor         | 200     | 400, 404, 409          |
| POST   | `/api/visits`         | Create a visit          | 201     | 400                    |
| GET    | `/api/visits`         | List visits             | 200     | 400                    |
| GET    | `/api/visits/:id`     | Get one visit           | 200     | 400, 404               |
| PUT    | `/api/visits/:id`     | Update a visit          | 200     | 400, 404               |
| DELETE | `/api/visits/:id`     | Delete a visit          | 200     | 400, 404               |
| GET    | `/health`             | Health check            | 200     | -                      |

### Status codes used

| Code | Meaning                                                                          |
|------|----------------------------------------------------------------------------------|
| 200  | OK - request succeeded                                                           |
| 201  | Created - a new document was created                                             |
| 400  | Bad Request - validation failed, malformed ID, malformed JSON, empty update body |
| 404  | Not Found - document or route does not exist                                     |
| 409  | Conflict - duplicate unique value, or deleting a patient/doctor that has visits  |
| 500  | Internal Server Error - unexpected problem                                       |

### List endpoints: pagination, filters, search

| Query param | Description                                     | Default |
|-------------|-------------------------------------------------|---------|
| `page`      | Page number                                     | `1`     |
| `limit`     | Items per page (max 100)                        | `10`    |
| `search`    | Case-insensitive text search                    | -       |

| Resource | Exact filters                          | `search` looks in                  | Default sort         |
|----------|----------------------------------------|------------------------------------|----------------------|
| Patients | `gender`, `bloodGroup`                 | `name`, `email`                    | newest first         |
| Doctors  | `specialization`, `isAvailable`        | `name`, `email`, `specialization`  | newest first         |
| Visits   | `patient`, `doctor`, `status`          | `reason`, `diagnosis`              | latest `visitDate`   |

Examples:
```
GET /api/patients?gender=female&page=2&limit=5
GET /api/doctors?specialization=Cardiology&isAvailable=true
GET /api/visits?patient=<patientId>&status=completed
GET /api/patients?search=ali
```

List response:
```json
{
  "success": true,
  "count": 2,
  "total": 3,
  "page": 1,
  "pages": 2,
  "data": [ ... ]
}
```

### Examples

#### Create a patient
`POST /api/patients`
```json
{
  "name": "Ali Khan",
  "email": "ali@example.com",
  "dob": "1995-05-20",
  "gender": "male",
  "phone": "+923001234567",
  "bloodGroup": "O+"
}
```
Response `201 Created`:
```json
{
  "success": true,
  "data": {
    "_id": "66f0c1a2b3c4d5e6f7a8b9c0",
    "name": "Ali Khan",
    "email": "ali@example.com",
    "dob": "1995-05-20T00:00:00.000Z",
    "gender": "male",
    "phone": "+923001234567",
    "bloodGroup": "O+",
    "createdAt": "2026-09-19T10:12:05.394Z",
    "updatedAt": "2026-09-19T10:12:05.394Z",
    "age": 31
  }
}
```

#### Create a doctor
`POST /api/doctors`
```json
{
  "name": "Sara Ahmed",
  "email": "sara@hospital.com",
  "specialization": "Cardiology",
  "licenseNumber": "pmc-10234",
  "experienceYears": 8,
  "consultationFee": 2000
}
```
`licenseNumber` is saved as `PMC-10234` and the response contains `"displayName": "Dr. Sara Ahmed"`.

#### Create a visit
`POST /api/visits`
```json
{
  "patient": "66f0c1a2b3c4d5e6f7a8b9c0",
  "doctor": "66f0c1a2b3c4d5e6f7a8b9d1",
  "visitDate": "2026-10-05T10:00:00.000Z",
  "reason": "Chest pain and shortness of breath"
}
```
Response `201 Created` - patient and doctor are populated:
```json
{
  "success": true,
  "data": {
    "_id": "66f0c1a2b3c4d5e6f7a8b9e2",
    "patient": { "_id": "66f0c1a2b3c4d5e6f7a8b9c0", "name": "Ali Khan", "email": "ali@example.com" },
    "doctor": { "_id": "66f0c1a2b3c4d5e6f7a8b9d1", "name": "Sara Ahmed", "specialization": "Cardiology" },
    "visitDate": "2026-10-05T10:00:00.000Z",
    "reason": "Chest pain and shortness of breath",
    "status": "scheduled",
    "isUpcoming": true
  }
}
```

#### Update (partial updates are allowed)
`PUT /api/visits/:id`
```json
{ "status": "completed", "diagnosis": "Mild angina" }
```

#### Delete
`DELETE /api/patients/:id` -> `200`
```json
{ "success": true, "message": "Patient deleted successfully" }
```
A patient or doctor that still has visits cannot be deleted (`409`), so medical history is never lost.

---

## Error handling

Every error uses the same shape:
```json
{ "success": false, "message": "Validation failed", "errors": [ { "field": "email", "message": "Email is required" } ] }
```
`errors` is only present for validation errors (`400`).

| Situation                              | Status | Message                                        |
|----------------------------------------|--------|------------------------------------------------|
| Missing / invalid fields               | 400    | `Validation failed` (+ `errors` array)         |
| ID is not a valid ObjectId             | 400    | `Invalid ID format`                            |
| Malformed JSON body                    | 400    | `Invalid JSON in request body`                 |
| Visit references a missing patient     | 400    | `Patient does not exist`                       |
| Document not found                     | 404    | `Patient not found`                            |
| Route not found                        | 404    | `Route not found: GET /api/xyz`                |
| Duplicate email / license number       | 409    | `email already exists`                         |
| Delete patient/doctor with visits      | 409    | `Cannot delete a patient who has existing visits` |

---

## Testing

```bash
npm test
```

- **Framework:** Jest + Supertest
- **Database:** an in-memory MongoDB (`mongodb-memory-server`) is started automatically, so your real data is never touched. The first run downloads a MongoDB binary (~100 MB), so it needs internet once.
- **Using your own MongoDB instead:** set `TEST_MONGO_URI` to a throw-away database, e.g.
  `TEST_MONGO_URI=mongodb://127.0.0.1:27017/hospital_test npm test`
  (on Windows PowerShell: `$env:TEST_MONGO_URI="mongodb://127.0.0.1:27017/hospital_test"; npm test`).
  The database is dropped at the end of every test file.

What is tested:

| File                          | Covers                                                                          |
|-------------------------------|---------------------------------------------------------------------------------|
| `tests/models.test.js`        | Schema validation, defaults, virtuals (`age`, `displayName`, `isUpcoming`), indexes (no DB needed) |
| `tests/app.test.js`           | Health check, 404 route, malformed JSON, invalid IDs                            |
| `tests/patient.routes.test.js`| All patient routes: 201/200/400/404/409, pagination, filters, search, injection guard |
| `tests/doctor.routes.test.js` | All doctor routes and the delete-protection rule                                |
| `tests/visit.routes.test.js`  | All visit routes, reference checks, populate, filters                           |

Every route (all 15 CRUD routes + health) is exercised with success and error cases. A coverage threshold of 80% is enforced in `package.json`.

---

## Design decisions

- **One generic CRUD controller** (`crudController.js`) is reused for all three resources; resource-specific rules (reference checks, delete protection) are passed in as small hooks. This keeps the code DRY and easy to extend.
- **Validation lives in the schemas**, and `runValidators` is enabled on updates so `PUT` cannot bypass the rules.
- **Clients cannot set** `_id`, `createdAt` or `updatedAt`.
- **Query filters accept plain strings only**, which blocks NoSQL operator injection such as `?status[$ne]=x`. The `search` text is regex-escaped.
- **Referential integrity:** a visit must point to an existing patient and doctor; patients/doctors with visits cannot be deleted.
- **Indexes** match the real queries: visit history per patient, schedule per doctor, doctors by specialization, unique emails/licenses.

### Not included (out of scope for this task)
Authentication/authorization, rate limiting, and Swagger/OpenAPI UI.
