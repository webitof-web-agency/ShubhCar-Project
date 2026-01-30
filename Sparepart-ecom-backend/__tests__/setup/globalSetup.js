const { MongoMemoryServer } = require('mongodb-memory-server');

/**
 * Spin up an in-memory MongoDB for integration tests.
 * We set process.env here so config/env validation sees usable values.
 */
module.exports = async () => {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  process.env.MONGO_URI = uri;
  process.env.MONGO_REPLICA_URI = uri;

  global.__MONGOD__ = mongod;
};
