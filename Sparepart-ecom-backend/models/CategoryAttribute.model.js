const { default: mongoose } = require('mongoose');

const categoryAttributeSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },

    name: { type: String, required: true }, // "Material"
    code: { type: String, required: true }, // "material"

    specType: {
      type: String,
      enum: ['text', 'number', 'select', 'multiselect'],
      required: true,
    },

    isRequired: { type: Boolean, default: false },
    isFilterable: { type: Boolean, default: false },

    options: [{ type: String }], // only for select/multiselect
  },
  { timestamps: true },
);

categoryAttributeSchema.index({ categoryId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('CategoryAttribute', categoryAttributeSchema);
