const bcrypt = require('bcrypt');

const hash = async (value) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(value, salt);
};

const compare = async (value, hashed) => {
  return bcrypt.compare(value, hashed);
};

module.exports = { hash, compare };
