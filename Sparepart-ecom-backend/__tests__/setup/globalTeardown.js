/**
 * Stop the shared in-memory MongoDB instance.
 */
module.exports = async () => {
  if (global.__MONGOD__) {
    await global.__MONGOD__.stop();
  }
};
