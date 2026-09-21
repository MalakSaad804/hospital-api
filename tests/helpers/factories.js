/** Small helpers that build valid request bodies for the tests. */
let counter = 0;
const next = () => ++counter;

exports.validPatient = (overrides = {}) => ({
  name: "Ali Khan",
  email: `ali${next()}@example.com`,
  dob: "1995-05-20",
  gender: "male",
  phone: "+923001234567",
  address: "Mardan, KPK",
  bloodGroup: "O+",
  ...overrides,
});

exports.validDoctor = (overrides = {}) => ({
  name: "Sara Ahmed",
  email: `sara${next()}@example.com`,
  specialization: "Cardiology",
  licenseNumber: `LIC-${1000 + next()}`,
  phone: "+923111234567",
  experienceYears: 8,
  consultationFee: 2000,
  ...overrides,
});

exports.validVisit = (patientId, doctorId, overrides = {}) => ({
  patient: patientId,
  doctor: doctorId,
  visitDate: "2030-01-15T10:00:00.000Z",
  reason: "Chest pain and shortness of breath",
  fee: 2000,
  ...overrides,
});
