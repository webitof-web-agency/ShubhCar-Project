const LEVELS = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
};

function normalizeMeta(meta) {
  if (!meta) return {};
  if (meta instanceof Error) {
    return { message: meta.message, stack: meta.stack };
  }
  if (Array.isArray(meta)) {
    return meta.map((item) => normalizeMeta(item));
  }
  if (typeof meta === 'object') {
    const cleaned = {};
    for (const [key, value] of Object.entries(meta)) {
      cleaned[key] = normalizeMeta(value);
    }
    return cleaned;
  }
  return meta;
}

function write(level, message, meta) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...normalizeMeta(meta),
  };

  try {
    const serialized = JSON.stringify(payload);
    if (level === LEVELS.ERROR) {
      console.error(serialized);
    } else if (level === LEVELS.WARN) {
      console.warn(serialized);
    } else {
      console.log(serialized);
    }
  } catch (err) {
    // Never crash the app due to logging failures
    const fallback = {
      timestamp: new Date().toISOString(),
      level: LEVELS.ERROR,
      message: 'log_failure',
      error: err.message,
    };
    try {
      console.error(JSON.stringify(fallback));
    } catch {
      // Last resort: swallow to avoid app crash
    }
  }
}

module.exports = {
  info: (message, meta) => write(LEVELS.INFO, message, meta),
  warn: (message, meta) => write(LEVELS.WARN, message, meta),
  error: (message, meta) => write(LEVELS.ERROR, message, meta),
  withContext: (baseMeta = {}) => ({
    info: (message, meta) =>
      write(LEVELS.INFO, message, { ...baseMeta, ...meta }),
    warn: (message, meta) =>
      write(LEVELS.WARN, message, { ...baseMeta, ...meta }),
    error: (message, meta) =>
      write(LEVELS.ERROR, message, { ...baseMeta, ...meta }),
  }),
};
