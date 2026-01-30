const Setting = require('../models/Setting.model');

const STORAGE_KEYS = [
  'storage_driver',
  'aws_region',
  'aws_s3_bucket',
  'aws_access_key_id',
  'aws_secret_access_key',
];

const DEFAULT_DRIVER = 'local';

async function getStorageSettings() {
  const settings = await Setting.find({ key: { $in: STORAGE_KEYS } }).lean();
  const map = new Map(settings.map((item) => [item.key, item.value]));

  const rawDriver = map.get('storage_driver') || DEFAULT_DRIVER;
  const driver = rawDriver === 's3' ? 's3' : 'local';

  return {
    driver,
    s3: {
      region: map.get('aws_region') || process.env.AWS_REGION,
      bucket: map.get('aws_s3_bucket') || process.env.AWS_S3_BUCKET,
      accessKeyId: map.get('aws_access_key_id') || process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey:
        map.get('aws_secret_access_key') || process.env.AWS_SECRET_ACCESS_KEY,
    },
  };
}

module.exports = {
  getStorageSettings,
  STORAGE_KEYS,
};
