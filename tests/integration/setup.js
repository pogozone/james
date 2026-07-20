const mongoose = require('mongoose');
const app = require('../../server-mongo');

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27017/james-todos-integration-test';

async function resetDatabase() {
  // Drop all collections between tests instead of dropping the whole DB,
  // so the test database does not need to be created repeatedly.
  const collections = await mongoose.connection.db.listCollections().toArray();
  for (const { name } of collections) {
    await mongoose.connection.db.collection(name).deleteMany({});
  }
}

beforeAll(async () => {
  await mongoose.connect(MONGODB_URI);
  await resetDatabase();
});

afterEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await resetDatabase();
  await mongoose.disconnect();
});

module.exports = { app, MONGODB_URI };
