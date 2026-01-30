const { createQueue } = require('../config/queue');

const productBulkUpdateQueue = createQueue('product-bulk-update');

module.exports = { productBulkUpdateQueue };
