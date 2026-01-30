const Setting = require('../models/Setting.model');

const PAYMENT_KEYS = [
  'payment_cod_enabled',
  'payment_razorpay_enabled',
  'razorpay_key_id',
  'razorpay_key_secret',
];

const toMap = (settings = []) =>
  settings.reduce((acc, item) => {
    acc[item.key] = item.value;
    return acc;
  }, {});

const getPaymentSettings = async () => {
  const settings = await Setting.find({ key: { $in: PAYMENT_KEYS } }).lean();
  const map = toMap(settings);

  return {
    codEnabled: map.payment_cod_enabled ?? true,
    razorpayEnabled: map.payment_razorpay_enabled ?? false,
    razorpayKeyId: map.razorpay_key_id || null,
    razorpayKeySecret: map.razorpay_key_secret || null,
  };
};

module.exports = { getPaymentSettings };
