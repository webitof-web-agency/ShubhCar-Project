const isPlainObject = (val) =>
  Object.prototype.toString.call(val) === '[object Object]';

function clean(value) {
  if (Array.isArray(value)) {
    return value.map(clean);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.entries(value).reduce((acc, [key, val]) => {
    // Drop dangerous keys often used in NoSQL injection
    if (key.startsWith('$') || key.includes('.')) {
      return acc;
    }

    acc[key] = clean(val);
    return acc;
  }, {});
}

module.exports = function sanitizeMiddleware(req, res, next) {
  ['body', 'query', 'params'].forEach((section) => {
    if (req[section]) {
      req[section] = clean(req[section]);
    }
  });

  next();
};
