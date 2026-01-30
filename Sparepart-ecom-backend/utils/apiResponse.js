/**
 * OPERATIONAL ERROR FACTORY
 * ------------------------
 * Use ONLY inside services and lower layers.
 * Never send responses from here.
 */

class AppError extends Error {
 constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);

    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Throw an operational error
 * Usage: error('Not found', 404)
 */
function error(message, statusCode = 500, code) {
  throw new AppError(message, statusCode, code);
}

/**
 * Backward compatible success responder.
 * Prefer using res.ok directly (from response.middleware), but this keeps older controllers working.
 */
function success(res, data = null, message = 'OK', statusCode = 200, meta = {}) {
  if (res?.ok) {
    return res.ok(data, message, statusCode, meta);
  }

  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
  });
}

/**
 * Backward compatible failure responder.
 * Prefer throwing AppError or using res.fail directly.
 */
function fail(res, message = 'Something went wrong', statusCode = 500, code = 'INTERNAL_ERROR') {
  if (res?.fail) {
    return res.fail(message, statusCode, code);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    code,
  });
}

module.exports = {
  AppError,
  error,
  success,
  fail,
};
