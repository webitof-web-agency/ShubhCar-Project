const verifyIdToken = jest.fn().mockResolvedValue({
  getPayload: () => ({ email: 'g@test.com', given_name: 'G', family_name: 'User' }),
});

const OAuth2Client = jest.fn().mockImplementation(() => ({
  verifyIdToken,
}));

module.exports = { OAuth2Client };
