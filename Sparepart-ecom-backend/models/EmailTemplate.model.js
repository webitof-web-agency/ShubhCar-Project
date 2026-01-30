const mongoose = require('mongoose');
const Schema =
  typeof mongoose.Schema === 'function'
    ? mongoose.Schema
    : function DummySchema(definition, options) {
        this.obj = definition;
        this.options = options;
      };

const emailTemplateSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, index: true },
    subject: { type: String, required: true },
    bodyHtml: { type: String, required: true },
    variables: { type: Object, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

module.exports =
  (mongoose.models && mongoose.models.EmailTemplate) ||
  (mongoose.model ? mongoose.model('EmailTemplate', emailTemplateSchema) : {});
