const mongoose = require('mongoose');
const ROLES = require('../constants/roles');

const wholesaleInfoSchema = new mongoose.Schema(
  {
    businessName: String,
    gstOrTaxId: String,
    documentUrls: [String],
    address: String,
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, default: '' },

    email: {
      type: String,
      lowercase: true,
      unique: true,
      sparse: true,
      index: true,
    },

    phone: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    authProvider: {
      type: String,
      enum: ['password', 'google', 'phone_otp'],
      default: 'password',
      index: true,
    },

    passwordHash: {
      type: String,
      select: false,
    },

    role: {
      type: String,
      enum: [ROLES.ADMIN, ROLES.CUSTOMER], // prev [ROLES.ADMIN, ROLES.VENDOR, ROLES.CUSTOMER]
      required: true,
      index: true,
    },

    roleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: false,
      index: true,
    },

    customerType: {
      type: String,
      enum: ['retail', 'wholesale'],
      default: 'retail',
      index: true,
    },

    wholesaleInfo: wholesaleInfoSchema,

    verificationStatus: {
      type: String,
      enum: ['not_required', 'pending', 'approved', 'rejected'],
      default: 'not_required',
    },

    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ['active', 'inactive', 'banned'],
      default: 'active',
      index: true,
    },

    lastLoginAt: Date,

    sessions: [
      {
        tokenHash: String,
        device: String,
        ip: String,
        lastUsedAt: Date,
        expiresAt: Date,
      },
    ],

    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,

    resetPassword: {
      otpHash: String,
      expiresAt: Date,
      attempts: { type: Number, default: 0 },
    },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
  },
  { timestamps: true },
);

/* Require email or phone */
userSchema.pre('save', function () {
  if (!this.email && !this.phone) {
    throw new Error('Either email or phone is required');
  }
});

/* Soft delete filter with escape hatch */
userSchema.pre(/^find/, function () {
  if (!this.getQuery().includeDeleted) {
    this.where({ isDeleted: false });
  }
  delete this.getQuery().includeDeleted;
});

userSchema.index({ role: 1, status: 1 });
userSchema.index({ customerType: 1, verificationStatus: 1 });
userSchema.index({ role: 1, createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
