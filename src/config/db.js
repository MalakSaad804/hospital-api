const mongoose = require("mongoose");

/**
 * Connects to MongoDB. The connection string comes from the MONGO_URI
 * environment variable (see .env.example) so no credentials live in the code.
 */
async function connectDB(uri = process.env.MONGO_URI) {
  if (!uri) {
    throw new Error("MONGO_URI is not defined. Copy .env.example to .env and set it.");
  }
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

module.exports = connectDB;
