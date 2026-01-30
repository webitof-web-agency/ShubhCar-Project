const mongoose = require('mongoose');

const AdminLogSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: String,
    meta: Object,
  },
  { timestamps: true },
);

module.exports = mongoose.model('AdminLog', AdminLogSchema);
