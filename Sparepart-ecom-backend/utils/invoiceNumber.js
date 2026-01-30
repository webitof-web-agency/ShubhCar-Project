const { generateInvoiceNumber } = require('./numbering');

module.exports = async function getInvoiceNumber() {
  return generateInvoiceNumber();
};
