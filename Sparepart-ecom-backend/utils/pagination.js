const getPagination = ({ limit = 20, cursor }) => {
  const query = {};
  if (cursor) {
    query._id = { $lt: cursor };
  }

  return {
    query,
    options: {
      limit: Math.min(limit, 100),
      sort: { _id: -1 },
    },
  };
};

module.exports = { getPagination };
