const mongoose = require('mongoose');

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27017/james-todos-integration-test';

async function resetDatabase() {
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
