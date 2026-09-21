const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

// Load models so their indexes (e.g. unique email) are built in the test DB
require("../../src/models/Patient");
require("../../src/models/Doctor");
require("../../src/models/Visit");

let mongod;

/**
 * Starts an in-memory MongoDB, so tests never touch your real database.
 * Optional: set TEST_MONGO_URI to use an existing MongoDB instead (use a throw-away database name!).
 */
exports.connect = async () => {
  if (process.env.TEST_MONGO_URI) {
    await mongoose.connect(process.env.TEST_MONGO_URI);
  } else {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  }
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
};

/** Empties every collection (indexes are kept). */
exports.clear = async () => {
  for (const collection of Object.values(mongoose.connection.collections)) {
    await collection.deleteMany({});
  }
};

exports.close = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
};
