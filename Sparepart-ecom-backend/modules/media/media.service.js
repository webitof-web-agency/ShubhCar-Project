const mediaRepo = require('./media.repo');
const { error } = require('../../utils/apiResponse');
const s3 = require('../../utils/s3');
const ROLES = require('../../constants/roles');
const { getStorageSettings } = require('../../utils/storageSettings');
const fs = require('fs/promises');

class MediaService {
  async presign({ mimeType, folder }, user) {
    if (!user || user.role !== ROLES.ADMIN) error('Forbidden', 403);
    if (!mimeType) error('mimeType required', 400);

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(mimeType)) error('Unsupported file type', 400);

    const storage = await getStorageSettings();
    if (storage.driver !== 's3') {
      error('S3 storage is disabled', 400);
    }

    const s3Config = storage.s3 || {};
    if (!s3Config.region || !s3Config.bucket) {
      error('S3 config missing', 400);
    }

    const key = s3.generateKey(folder || 'misc', mimeType);
    const uploadUrl = await s3.getPresignedUploadUrl({
      key,
      mimeType,
      config: s3Config,
    });

    return { key, uploadUrl, bucket: s3Config.bucket };
  }

  async create(payload, user) {
    if (!user || user.role !== ROLES.ADMIN) error('Forbidden', 403);

    const required = ['key', 'bucket', 'mimeType', 'size'];
    required.forEach((f) => {
      if (!payload[f]) error(`${f} is required`, 400);
    });

    const storage = await getStorageSettings();
    const s3Config = storage.s3 || {};
    if (payload.bucket !== 'local' && payload.bucket !== s3Config.bucket) {
      error('Invalid bucket', 400);
    }

    const url =
      payload.bucket === 'local'
        ? payload.url || `/uploads/media/${payload.key}`
        : s3.getPublicUrl(payload.key, s3Config);

    return mediaRepo.create({
      ...payload,
      url,
      createdBy: user._id,
    });
  }

  async createFromUpload(files = [], user, { usedIn } = {}) {
    if (!user || user.role !== ROLES.ADMIN) error('Forbidden', 403);
    if (!files.length) error('No media uploaded', 400);

    const usedInList = usedIn ? [usedIn] : [];

    const storage = await getStorageSettings();

    if (storage.driver === 's3') {
      const s3Config = storage.s3 || {};
      if (!s3Config.region || !s3Config.bucket) {
        error('S3 config missing', 400);
      }

      const created = [];
      for (const file of files) {
        const key = s3.generateKey('media', file.mimetype || 'image/jpeg');
        await s3.uploadFile({
          filePath: file.path,
          key,
          mimeType: file.mimetype || 'image/jpeg',
          config: s3Config,
        });
        await fs.unlink(file.path).catch(() => null);

        created.push({
          key,
          bucket: s3Config.bucket,
          url: s3.getPublicUrl(key, s3Config),
          mimeType: file.mimetype || 'image/jpeg',
          size: file.size || 0,
          usedIn: usedInList,
          createdBy: user._id,
        });
      }

      return mediaRepo.createMany(created);
    }

    const created = await mediaRepo.createMany(
      files.map((file) => ({
        key: `media/${file.filename}`,
        bucket: 'local',
        url: `/uploads/media/${file.filename}`,
        mimeType: file.mimetype || 'image/jpeg',
        size: file.size || 0,
        usedIn: usedInList,
        createdBy: user._id,
      })),
    );

    return created;
  }

  async list(query = {}) {
    const { usedIn, limit, page } = query;
    const filter = {};
    if (usedIn) filter.usedIn = usedIn;

    const data = await mediaRepo.list(filter, { limit, page });
    const total = await mediaRepo.count(filter);
    return { data, total };
  }

  async get(id) {
    const media = await mediaRepo.findById(id);
    if (!media) error('Media not found', 404);
    return media;
  }

  async remove(id, user) {
    if (!user || user.role !== ROLES.ADMIN) error('Forbidden', 403);
    const media = await mediaRepo.findById(id);
    if (!media) error('Media not found', 404);
    return mediaRepo.softDelete(id);
  }
}

module.exports = new MediaService();
