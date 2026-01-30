const mongoose = require('mongoose');

async function connectTestDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI not set for tests');
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, { dbName: 'test-db' });
  }
}

async function clearDatabase() {
  const { collections } = mongoose.connection;
  const tasks = Object.values(collections).map((collection) =>
    collection.deleteMany({}),
  );
  await Promise.all(tasks);
}

async function disconnectTestDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
}

module.exports = {
  connectTestDB,
  clearDatabase,
  disconnectTestDB,
};
