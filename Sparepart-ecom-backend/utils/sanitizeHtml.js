const sanitizeHtml = require('sanitize-html');

const allowedTags = ['b', 'i', 'em', 'strong', 'p', 'ul', 'ol', 'li', 'br'];
const allowedAttributes = {};

module.exports = function sanitize(input) {
  if (typeof input !== 'string') return input;
  return sanitizeHtml(input, { allowedTags, allowedAttributes });
};
