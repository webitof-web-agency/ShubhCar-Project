module.exports = {
  createTransport: () => ({
    sendMail: jest.fn().mockResolvedValue(true),
    verify: jest.fn((cb) => {
      if (typeof cb === 'function') cb(null, true);
      return Promise.resolve(true);
    }),
  }),
};
