const mongoose = require('mongoose');
const app = require('../../app');

let server;

/**
 * Connect to test database before all integration tests
 */
async function setupIntegrationTests() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/test-ecommerce';
  
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, {
      dbName: 'test-ecommerce-integration',
    });
  }
  
  // Start Express server
  if (!server) {
    server = app.listen(0); // Random available port
  }
  
  return { app, server };
}

/**
 * Clear all collections before each test
 */
async function clearDatabase() {
  const { collections } = mongoose.connection;
  const tasks = Object.values(collections).map((collection) =>
    collection.deleteMany({})
  );
  await Promise.all(tasks);
}

/**
 * Close database connection and server after all tests
 */
async function teardownIntegrationTests() {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
    server = null;
  }
  
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
}

/**
 * Get base URL for test requests
 */
function getBaseURL() {
  if (!server) {
    throw new Error('Server not started. Call setupIntegrationTests() first');
  }
  const address = server.address();
  return `http://localhost:${address.port}`;
}

module.exports = {
  setupIntegrationTests,
  clearDatabase,
  teardownIntegrationTests,
  getBaseURL,
};
