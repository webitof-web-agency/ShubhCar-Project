const mongoose = require('mongoose');

const { generateProductCode } = require('../utils/numbering');

const priceSchema = new mongoose.Schema(
  {
    mrp: { type: Number, required: true },
    salePrice: { type: Number },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      unique: true,
      uppercase: true,
      index: true,
    },

    /* =====================
       OWNERSHIP & CATEGORY
    ====================== */
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: false,
      index: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },

    /* =====================
       IDENTIFIERS
    ====================== */
    name: { type: String, required: true, trim: true },

    slug: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
    },

    sku: { type: String },
    hsnCode: { type: String },

    productType: {
      type: String,
      enum: ['OEM', 'AFTERMARKET'],
      default: 'AFTERMARKET',
      index: true,
    },
    vehicleBrand: { type: String },
    oemNumber: { type: String },
    manufacturerBrand: { type: String },
    tags: [{ type: String }], // Array of Tag names or IDs depending on use. Storing names/slugs is simpler for search.


    /* =====================
       DESCRIPTIONS
    ====================== */
    shortDescription: { type: String },
    longDescription: { type: String },

    returnPolicy: { type: String },
    warrantyInfo: { type: String },

    /* =====================
       ORDER RULES
    ====================== */
    minOrderQty: { type: Number, default: 1 },
    maxOrderQty: { type: Number },

    minWholesaleQty: { type: Number },

    /* =====================
       INVENTORY & LOGISTICS
    ====================== */
    stockQty: { type: Number, default: 0 },
    weight: { type: Number },
    length: { type: Number },
    width: { type: Number },
    height: { type: Number },
    taxClassKey: { type: String },
    taxRate: { type: Number },
    taxSlabs: [
      {
        minAmount: { type: Number, default: 0 },
        maxAmount: { type: Number, default: null },
        rate: { type: Number, required: true },
      },
    ],
    isFragile: { type: Boolean, default: false },
    isHeavy: { type: Boolean, default: false },
    shippingClass: { type: String },

    /* =====================
       PRICING (STRICT)
    ====================== */
    retailPrice: priceSchema,

    wholesalePrice: {
      type: priceSchema,
      default: null,
    },

    /* =====================
       LISTING FEE
    ====================== */
    listingFeeAmount: { type: Number, default: 0 },

    listingFeeStatus: {
      type: String,
      enum: ['pending', 'paid', 'waived'],
      default: 'pending',
      index: true,
    },

    feePaidAt: { type: Date },

    /* =====================
       VISIBILITY & STATE
    ====================== */
    status: {
      type: String,
      enum: ['draft', 'active', 'inactive', 'blocked'],
      default: 'draft',
      index: true,
    },
    statusBeforeDelete: {
      type: String,
      enum: ['draft', 'active', 'inactive', 'blocked'],
      default: null,
    },

    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    /* =====================
       REVIEWS & RATINGS
    ====================== */
    ratingAvg: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      index: true,
    },

    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },

    /* =====================
       SOFT DELETE
    ====================== */
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

/* =====================
   AUTO FILTER DELETED
===================== */
productSchema.pre(/^find/, function () {
  // Allow bypassing the filter if includeDeleted is set
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
});

// Auto-assign productId when missing
productSchema.pre('save', async function () {
  if (!this.productId) {
    this.productId = await generateProductCode();
  }
});

/* =====================
   INDEX DISCIPLINE
===================== */
productSchema.index({ categoryId: 1, status: 1 });
productSchema.index({ vendorId: 1, status: 1 });
productSchema.index({ isFeatured: 1, status: 1 });
productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ ratingAvg: -1, ratingCount: -1 });
productSchema.index({ status: 1, stockQty: 1 });


module.exports = mongoose.model('Product', productSchema);
