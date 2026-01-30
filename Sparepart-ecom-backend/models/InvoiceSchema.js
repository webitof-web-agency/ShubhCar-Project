const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    type: {
      type: String,
      enum: ['invoice', 'credit_note'],
      default: 'invoice',
      index: true,
    },

    customerSnapshot: {
      name: String,
      email: String,
      phone: String,
      address: Object,
    },

    items: [
      {
        name: { type: String, required: true },
        sku: { type: String, required: true },
        quantity: { type: Number, required: true },
        unitPrice: { type: Number, required: true },

        taxPercent: { type: Number, required: true },
        taxAmount: { type: Number, required: true },
        taxComponents: {
          cgst: { type: Number, default: 0 },
          sgst: { type: Number, default: 0 },
          igst: { type: Number, default: 0 },
        },

        lineTotal: { type: Number, required: true },
      },
    ],

    relatedInvoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      index: true,
    },

    refundMeta: {
      refundId: String,
      gateway: String,
    },

    totals: {
      subtotal: { type: Number, required: true },
      taxTotal: { type: Number, required: true },
      taxBreakdown: {
        cgst: { type: Number, default: 0 },
        sgst: { type: Number, default: 0 },
        igst: { type: Number, default: 0 },
      },
      discountTotal: { type: Number, required: true },
      grandTotal: { type: Number, required: true },
      currency: { type: String, default: 'INR' },
    },

    orderSnapshot: {
      orderNumber: String,
      placedAt: Date,
      paymentMethod: String,
    },

    issuedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);
InvoiceSchema.pre('findOneAndUpdate', () => {
  throw new Error('Invoices are immutable');
});

module.exports = mongoose.model('Invoice', InvoiceSchema);
