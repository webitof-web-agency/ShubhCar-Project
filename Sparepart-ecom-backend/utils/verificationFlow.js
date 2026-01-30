const decideVerificationFlow = ({ email, phone }) => {
  if (email) return 'email';
  if (phone) return 'sms';
  return 'none';
};

module.exports = { decideVerificationFlow };
