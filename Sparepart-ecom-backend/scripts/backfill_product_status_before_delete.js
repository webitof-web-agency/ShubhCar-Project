const mongoConfig = require('../config/mongo');
const Product = require('../models/Product.model');

const allowedStatuses = new Set(['draft', 'active', 'inactive', 'blocked']);

const backfill = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoConfig.connectMongo();

    const filter = {
      isDeleted: true,
      $or: [{ statusBeforeDelete: { $exists: false } }, { statusBeforeDelete: null }],
    };

    const products = await Product.find(filter)
      .setOptions({ includeDeleted: true })
      .select('_id status statusBeforeDelete')
      .lean();

    if (!products.length) {
      console.log('No trashed products need backfill.');
      process.exit(0);
    }

    const updates = products.map((product) => {
      const fallback =
        product.status && allowedStatuses.has(product.status) && product.status !== 'inactive'
          ? product.status
          : 'active';

      return {
        updateOne: {
          filter: { _id: product._id },
          update: { $set: { statusBeforeDelete: fallback } },
        },
      };
    });

    const result = await Product.bulkWrite(updates);
    console.log(`Backfilled ${result.modifiedCount} products.`);
    process.exit(0);
  } catch (error) {
    console.error('Backfill failed:', error);
    process.exit(1);
  }
};

backfill();
