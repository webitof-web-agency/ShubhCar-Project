const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const fs = require('fs');

const ENV_REGION = process.env.AWS_REGION;
const ENV_BUCKET = process.env.AWS_S3_BUCKET;
const ENV_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const ENV_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

const resolveConfig = (config = {}) => {
  const region = config.region || ENV_REGION;
  const bucket = config.bucket || ENV_BUCKET;
  const accessKeyId = config.accessKeyId || ENV_ACCESS_KEY_ID;
  const secretAccessKey = config.secretAccessKey || ENV_SECRET_ACCESS_KEY;
  const credentials =
    accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;

  return { region, bucket, credentials };
};

const createClient = (config = {}) => {
  const { region, credentials } = resolveConfig(config);
  if (!region) {
    throw new Error('AWS region is missing');
  }
  return new S3Client({ region, credentials });
};

function generateKey(folder = 'misc', mimeType) {
  const ext = mimeType.split('/')[1] || 'bin';
  const rand = crypto.randomBytes(16).toString('hex');
  return `${folder}/${Date.now()}-${rand}.${ext}`;
}

async function getPresignedUploadUrl({ key, mimeType, config }) {
  const { bucket } = resolveConfig(config);
  if (!bucket) {
    throw new Error('AWS bucket is missing');
  }
  const s3 = createClient(config);
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: mimeType,
    ACL: 'private',
  });

  return getSignedUrl(s3, command, { expiresIn: 300 });
}

function getPublicUrl(key, config) {
  const { region, bucket } = resolveConfig(config);
  if (!region || !bucket) {
    throw new Error('AWS region or bucket is missing');
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

async function uploadFile({ filePath, key, mimeType, config }) {
  const { bucket } = resolveConfig(config);
  if (!bucket) {
    throw new Error('AWS bucket is missing');
  }
  const s3 = createClient(config);
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: mimeType,
    Body: fs.createReadStream(filePath),
    ACL: 'private',
  });

  await s3.send(command);
}

module.exports = {
  generateKey,
  getPresignedUploadUrl,
  getPublicUrl,
  uploadFile,
};
