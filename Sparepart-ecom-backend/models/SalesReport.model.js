const mongoose = require('mongoose');

const salesReportSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    totalSales: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    totalUnitsSold: { type: Number, default: 0 },
    platformCommission: { type: Number, default: 0 },
  },
  { timestamps: true },
);

salesReportSchema.index({ date: 1 }, { unique: true });

module.exports = mongoose.model('SalesReport', salesReportSchema);
