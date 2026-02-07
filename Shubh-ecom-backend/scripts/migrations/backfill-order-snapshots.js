/**
 * Migration Script: Backfill Product Snapshots in OrderItems
 * 
 * PURPOSE: Add product snapshot data to existing orders that were created
 * before the snapshot fields (productName, productImage, productSlug, productDescription)
 * were added to the OrderItem model.
 * 
 * IMPORTANT: Run this migration AFTER deploying the updated OrderItem model!
 * 
 * Usage: node scripts/migrations/backfill-order-snapshots.js
 */

const mongoose = require('mongoose');
const OrderItem = require('../../models/OrderItem.model');
const Product = require('../../models/Product.model');

const BATCH_SIZE = 100; // Process items in batches

async function backfillOrderSnapshots() {
  console.log('🔄 Starting OrderItem snapshot backfill migration...\n');

  try {
    // Connect to MongoDB (assuming DATABASE_URL env var)
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable not set');
    }

    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✅ Connected to MongoDB\n');

    // Find all OrderItems without productName (missing snapshots)
    const totalItems = await OrderItem.countDocuments({ 
      productName: { $exists: false } 
    });

    if (totalItems === 0) {
      console.log('✅ All OrderItems already have product snapshots. No migration needed!\n');
      await mongoose.disconnect();
      return;
    }

    console.log(`📊 Found ${totalItems} OrderItems needing snapshot data\n`);
    console.log('Starting backfill process...\n');

    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    let deletedProductCount = 0;

    // Process in batches
    while (processedCount < totalItems) {
      const items = await OrderItem.find({ productName: { $exists: false } })
        .limit(BATCH_SIZE)
        .lean();

      for (const item of items) {
        try {
          // Fetch the product
          const product = await Product.findById(item.productId).lean();

          let updateData;

          if (!product) {
            // Product was deleted - use fallback values
            updateData = {
              productName: `[Deleted Product - SKU: ${item.sku || 'N/A'}]`,
              productSlug: null,
              productImage: null,
              productDescription: null,
            };
            deletedProductCount++;
            console.log(`⚠️  Product not found for OrderItem ${item._id}, using fallback`);
          } else {
            // Product exists - snapshot its data
            let primaryImageUrl = null;
            if (product.productImages && product.productImages.length > 0) {
              primaryImageUrl = product.productImages[0].imageUrl || null;
            }

            updateData = {
              productName: product.name || 'Unknown Product',
              productSlug: product.slug || null,
              productImage: primaryImageUrl,
              productDescription: 
                product.shortDescription || 
                (product.description ? product.description.substring(0, 250) : null),
            };
          }

          // NOTE: We need to bypass the immutable field protection
          // Use updateOne directly on the collection to bypass middleware
          await OrderItem.collection.updateOne(
            { _id: item._id },
            { $set: updateData }
          );

          successCount++;
          processedCount++;

          if (processedCount % 50 === 0) {
            console.log(`Progress: ${processedCount}/${totalItems} items processed`);
          }
        } catch (error) {
          failedCount++;
          processedCount++;
          console.error(`❌ Error processing OrderItem ${item._id}:`, error.message);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`Total items processed: ${processedCount}`);
    console.log(`✅ Successfully updated: ${successCount}`);
    console.log(`⚠️  Deleted products (fallback used): ${deletedProductCount}`);
    console.log(`❌ Failed: ${failedCount}`);
    console.log('='.repeat(60) + '\n');

    if (failedCount > 0) {
      console.log('⚠️  Some items failed to migrate. Please review the errors above.');
    } else {
      console.log('🎉 Migration completed successfully!\n');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Verify before running
console.log('⚠️  WARNING: This migration will update OrderItem documents in the database.');
console.log('Make sure you have:');
console.log('  1. Deployed the updated OrderItem model with snapshot fields');
console.log('  2. Backed up your database');
console.log('  3. Tested on a staging environment\n');

if (process.argv.includes('--confirm')) {
  backfillOrderSnapshots();
} else {
  console.log('❌ Migration not run. Add --confirm flag to proceed:');
  console.log('   node scripts/migrations/backfill-order-snapshots.js --confirm\n');
  process.exit(0);
}
