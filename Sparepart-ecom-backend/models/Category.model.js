const mongoose = require('mongoose');
const { generateCategoryCode, generateSubCategoryCode } = require('../utils/numbering');

const categorySchema = new mongoose.Schema(
  {
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    categoryCode: {
      type: String,
      unique: true,
      uppercase: true,
      sparse: true,
      index: true,
    },

    slug: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
    },

    iconUrl: { type: String },
    imageUrl: { type: String },

    description: { type: String },

    isActive: {
      type: Boolean,
      default: true,
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
categorySchema.pre(/^find/, function () {
  this.where({ isDeleted: false });
});

categorySchema.pre('save', async function () {
  if (!this.categoryCode) {
    this.categoryCode = this.parentId
      ? await generateSubCategoryCode()
      : await generateCategoryCode();
  }
});

/* =====================
   INDEX DISCIPLINE
===================== */
categorySchema.index({ parentId: 1, isActive: 1 });
// slug unique index already created via schema

module.exports = mongoose.model('Category', categorySchema);
