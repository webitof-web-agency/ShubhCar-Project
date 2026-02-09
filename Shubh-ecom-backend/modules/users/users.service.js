const userRepo = require('./user.repo');
const mongoose = require('mongoose');
const { error } = require('../../utils/apiResponse');
const { hashPassword, comparePassword } = require('../../utils/password');
const { decideVerificationFlow } = require('../../utils/verificationFlow');
const eventBus = require('../../utils/eventBus');
const Role = require('../../models/Role.model');
const ExcelJS = require('exceljs');
const { Readable } = require('stream');
const crypto = require('crypto');

/* =======================
   USERS SERVICE
======================= */
class UsersService {
  /**
   * Register a new user
   * Public
   */
  async register(payload) {
    const { email, phone, password } = payload;

    // 🔒 Hard guard
    if (!email && !phone) {
      error('Email or phone is required', 400);
    }

    // 🔁 Uniqueness checks
    if (email) {
      const exists = await userRepo.findByEmail(email);
      if (exists) error('Email already registered', 409);
    }

    if (phone) {
      const exists = await userRepo.findByPhone(phone);
      if (exists) error('Phone already registered', 409);
    }

    // 🔐 Password
    const passwordHash = await hashPassword(password);

    // 📌 Verification flow
    const verification = decideVerificationFlow({ email, phone });

    const user = await userRepo.create({
      ...payload,
      role: payload.role || 'customer',
      roleId: undefined,
      passwordHash,
      verificationStatus: verification.status,
      verificationType: verification.type,
    });

    // 📣 Emit async events (email / SMS / audit)
    eventBus.emit('user.registered', {
      userId: user._id,
      email: user.email,
      phone: user.phone,
      verificationType: verification.type,
    });

    return this._sanitize(user);
  }

  /**
   * Get own profile
   * Authenticated
   */
  async getMyProfile(userId) {
    const user = await userRepo.findById(userId);
    if (!user) error('User not found', 404);

    return this._sanitize(user);
  }

  /**
   * Update own profile
   * Authenticated
   */
  async updateMyProfile(userId, payload) {
    // 🔒 Prevent privilege escalation
    delete payload.role;
    delete payload.customerType;
    delete payload.verificationStatus;

    if (payload.password) {
      payload.passwordHash = await hashPassword(payload.password);
      delete payload.password;
    }

    const updated = await userRepo.updateById(userId, payload);
    if (!updated) error('User not found', 404);

    eventBus.emit('user.profile.updated', {
      userId,
      fields: Object.keys(payload),
    });

    return this._sanitize(updated);
  }

  async adminList(actor, query = {}) {
    if (actor.role !== 'admin') error('Forbidden', 403);

    const {
      role,
      status,
      customerType,
      verificationStatus,
      search,
      limit = 20,
      page = 1,
    } = query;

    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (customerType) filter.customerType = customerType;
    if (verificationStatus) filter.verificationStatus = verificationStatus;
    if (search) {
      const term = String(search).trim();
      if (term) {
        filter.$or = [
          { firstName: { $regex: term, $options: 'i' } },
          { lastName: { $regex: term, $options: 'i' } },
          { email: { $regex: term, $options: 'i' } },
          { phone: { $regex: term, $options: 'i' } },
        ];
      }
    }

    const users = await userRepo.list(filter, {
      limit: Number(limit),
      page: Number(page),
    });

    return users.map((u) => this._sanitize(u));
  }

  async adminExportCustomers(actor, query = {}) {
    if (actor.role !== 'admin') error('Forbidden', 403);

    const {
      status,
      customerType,
      verificationStatus,
      search,
      format = 'csv',
    } = query;

    const filter = { role: 'customer' };
    if (status) filter.status = status;
    if (customerType) filter.customerType = customerType;
    if (verificationStatus) filter.verificationStatus = verificationStatus;
    if (search) {
      const term = String(search).trim();
      if (term) {
        filter.$or = [
          { firstName: { $regex: term, $options: 'i' } },
          { lastName: { $regex: term, $options: 'i' } },
          { email: { $regex: term, $options: 'i' } },
          { phone: { $regex: term, $options: 'i' } },
        ];
      }
    }

    const customers = await userRepo.listAll(filter);
    const rows = customers.map((customer) => ({
      name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
      email: customer.email || '',
      phone: customer.phone || '',
      customerType: customer.customerType || 'retail',
      verificationStatus: customer.verificationStatus || 'not_required',
      status: customer.status || 'active',
      createdAt: customer.createdAt ? new Date(customer.createdAt).toISOString() : '',
    }));

    if (String(format).toLowerCase() === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Customers');
      sheet.columns = [
        { header: 'Customer Name', key: 'name', width: 30 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phone', width: 18 },
        { header: 'Customer Type', key: 'customerType', width: 16 },
        { header: 'Verification Status', key: 'verificationStatus', width: 20 },
        { header: 'Account Status', key: 'status', width: 16 },
        { header: 'Created Date', key: 'createdAt', width: 22 },
      ];
      rows.forEach((row) => sheet.addRow(row));
      const buffer = await workbook.xlsx.writeBuffer();
      return {
        buffer,
        filename: `customers-export-${Date.now()}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }

    const escapeCsv = (value) => {
      const raw = value == null ? '' : String(value);
      if (raw.includes('"') || raw.includes(',') || raw.includes('\n')) {
        return `"${raw.replace(/"/g, '""')}"`;
      }
      return raw;
    };

    const headers = [
      'Customer Name',
      'Email',
      'Phone',
      'Customer Type',
      'Verification Status',
      'Account Status',
      'Created Date',
    ];
    const lines = [headers.map(escapeCsv).join(',')];
    rows.forEach((row) => {
      lines.push([
        row.name,
        row.email,
        row.phone,
        row.customerType,
        row.verificationStatus,
        row.status,
        row.createdAt,
      ].map(escapeCsv).join(','));
    });

    return {
      buffer: Buffer.from(lines.join('\n'), 'utf8'),
      filename: `customers-export-${Date.now()}.csv`,
      contentType: 'text/csv',
    };
  }

  async adminImportCustomers(actor, file) {
    if (actor.role !== 'admin') error('Forbidden', 403);
    if (!file) error('File is required', 400);

    const workbook = new ExcelJS.Workbook();
    const ext = (file.originalname || '').toLowerCase();

    if (ext.endsWith('.csv')) {
      await workbook.csv.read(Readable.from(file.buffer.toString('utf8')));
    } else {
      await workbook.xlsx.load(file.buffer);
    }

    const sheet = workbook.worksheets[0];
    if (!sheet) error('No worksheet found', 400);

    const headerRow = sheet.getRow(1);
    const headerMap = {};
    headerRow.eachCell((cell, colNumber) => {
      const raw = String(cell.value || '').trim().toLowerCase();
      const normalized = raw
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      if (normalized) headerMap[normalized] = colNumber;
    });

    const requiredHeaders = ['name', 'email', 'customer_type', 'status', 'verification_status'];
    const missingHeaders = requiredHeaders.filter((key) => !headerMap[key]);
    if (missingHeaders.length) {
      error(`Missing required columns: ${missingHeaders.join(', ')}`, 400);
    }

    const normalizeEnum = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
    const toCellString = (value) => {
      if (value == null) return '';
      if (typeof value === 'object') {
        if (value.text) return String(value.text).trim();
        if (value.result) return String(value.result).trim();
      }
      return String(value).trim();
    };

    const results = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };

    const seenEmails = new Set();

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      if (!row || row.cellCount === 0) continue;

      try {
        const name = toCellString(row.getCell(headerMap.name)?.value);
        const email = toCellString(row.getCell(headerMap.email)?.value).toLowerCase();
        const phone = toCellString(row.getCell(headerMap.phone)?.value);
        const customerType = normalizeEnum(toCellString(row.getCell(headerMap.customer_type)?.value));
        const status = normalizeEnum(toCellString(row.getCell(headerMap.status)?.value));
        let verificationStatus = normalizeEnum(toCellString(row.getCell(headerMap.verification_status)?.value));

        if (!name || !email || !customerType || !status || !verificationStatus) {
          throw new Error('Missing required fields');
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new Error('Invalid email');
        }

        if (seenEmails.has(email)) {
          throw new Error('Duplicate email in file');
        }
        seenEmails.add(email);

        const normalizedCustomerType = customerType === 'wholesale' ? 'wholesale' : 'retail';
        const normalizedStatus = status === 'inactive' ? 'inactive' : 'active';
        if (!['retail', 'wholesale'].includes(normalizedCustomerType)) {
          throw new Error('Invalid customer_type');
        }
        if (!['active', 'inactive'].includes(normalizedStatus)) {
          throw new Error('Invalid status');
        }

        if (verificationStatus === 'notrequired') verificationStatus = 'not_required';
        if (!['approved', 'pending', 'not_required'].includes(verificationStatus)) {
          throw new Error('Invalid verification_status');
        }

        const nameParts = name.split(' ').filter(Boolean);
        const firstName = nameParts.shift() || '';
        const lastName = nameParts.join(' ');

        const existing = await userRepo.findByEmail(email);
        if (existing) {
          if (existing.role !== 'customer') {
            throw new Error('Email belongs to non-customer user');
          }
          await userRepo.updateById(existing._id, {
            firstName,
            lastName,
            phone: phone || existing.phone || null,
            customerType: normalizedCustomerType,
            status: normalizedStatus,
            verificationStatus,
            verifiedAt: verificationStatus === 'approved' ? new Date() : existing.verifiedAt,
          });
          results.updated += 1;
        } else {
          const password = crypto.randomBytes(6).toString('hex');
          const passwordHash = await hashPassword(password);
          const verification = decideVerificationFlow({ email, phone });
          await userRepo.create({
            firstName,
            lastName,
            email,
            phone: phone || null,
            role: 'customer',
            customerType: normalizedCustomerType,
            status: normalizedStatus,
            passwordHash,
            verificationStatus,
            verificationType: verification.type,
            verifiedAt: verificationStatus === 'approved' ? new Date() : null,
          });
          results.created += 1;
        }
      } catch (err) {
        results.failed += 1;
        results.errors.push({
          row: rowNumber,
          message: err.message || 'Invalid row',
        });
      }
    }

    return results;
  }

  async adminCreate(actor, payload) {
    if (actor.role !== 'admin') error('Forbidden', 403);

    const { email, phone, password, roleId } = payload;
    if (!email && !phone) error('Email or phone is required', 400);

    if (email) {
      const exists = await userRepo.findByEmail(email);
      if (exists) error('Email already registered', 409);
    }

    if (phone) {
      const exists = await userRepo.findByPhone(phone);
      if (exists) error('Phone already registered', 409);
    }

    if (!password) error('Password is required', 400);
    const passwordHash = await hashPassword(password);

    if (roleId) {
      const role = await Role.findById(roleId).lean();
      if (!role) error('Role not found', 404);
    }

    const user = await userRepo.create({
      ...payload,
      role: 'admin',
      roleId: roleId || undefined,
      passwordHash,
      verificationStatus: 'not_required',
      verificationType: 'email',
    });

    return this._sanitize(user);
  }

  async adminGet(actor, userId) {
    if (actor.role !== 'admin') error('Forbidden', 403);

    const user = await userRepo.findById(userId);
    if (!user) error('User not found', 404);

    return this._sanitize(user);
  }

  async adminUpdateStatus(actor, userId, payload) {
    if (actor.role !== 'admin') error('Forbidden', 403);

    const allowed = ['active', 'inactive', 'banned'];
    if (!allowed.includes(payload.status)) {
      error('Invalid status', 400);
    }

    const updated = await userRepo.updateById(userId, {
      status: payload.status,
    });

    if (!updated) error('User not found', 404);

    return this._sanitize(updated);
  }

  async adminApproveWholesale(actor, userId) {
    if (actor.role !== 'admin') error('Forbidden', 403);

    const user = await userRepo.findWholesaleById(userId);
    if (!user) error('Wholesale user not found', 404);

    if (user.verificationStatus === 'approved') {
      return this._sanitize(user);
    }

    const updated = await userRepo.updateById(userId, {
      verificationStatus: 'approved',
      verifiedAt: new Date(),
    });

    return this._sanitize(updated);
  }

  async adminLogoutAll(actor, userId) {
    if (actor.role !== 'admin') error('Forbidden', 403);

    const user = await userRepo.findDocById(userId);
    if (!user) error('User not found', 404);

    user.sessions = [];
    await user.save();

    return { success: true };
  }

  async adminForcePasswordReset(actor, userId, newPassword) {
    if (actor.role !== 'admin') error('Forbidden', 403);

    const user = await userRepo.findDocById(userId);
    if (!user) error('User not found', 404);

    user.passwordHash = await hashPassword(newPassword);
    user.sessions = []; // invalidate all sessions
    await user.save();

    return { success: true };
  }

  async adminDelete(actor, userId) {
    if (actor.role !== 'admin') error('Forbidden', 403);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      error('Invalid user id', 400);
    }

    const user = await userRepo.findById(userId);
    if (!user) error('User not found', 404);

    await userRepo.softDelete(userId);
    return { success: true };
  }

  async adminUpdate(actor, userId, payload) {
    // 1. Only admins can update users
    if (actor.role !== 'admin') {
      error('Forbidden', 403);
    }

    const user = await userRepo.findById(userId);
    if (!user) {
      error('User not found', 404);
    }

    // 2. Explicitly block forbidden fields
    const forbiddenFields = ['role', 'password', 'authProvider'];
    for (const field of forbiddenFields) {
      if (payload[field] !== undefined) {
        error(`${field} cannot be updated`, 400);
      }
    }

    // 3. Whitelist allowed fields
    const allowedFields = ['firstName', 'lastName', 'email', 'phone', 'customerType', 'roleId', 'status'];
    const updateData = {};

    for (const field of allowedFields) {
      if (payload[field] !== undefined) {
        updateData[field] = payload[field];
      }
    }

    // 4. customerType rules (explicit)
    if ('customerType' in updateData) {
      // Only CUSTOMER users can have customerType
      if (user.role !== 'customer') {
        error('customerType can only be set for CUSTOMER users', 400);
      }

      // Optional: validate allowed values
      if (!['retail', 'wholesale'].includes(updateData.customerType)) {
        error('Invalid customerType', 400);
      }
    }

    if (updateData.roleId) {
      const role = await Role.findById(updateData.roleId).lean();
      if (!role) error('Role not found', 404);
    }

    const updated = await userRepo.updateById(userId, updateData);
    return this._sanitize(updated);
  }

  async adminGetStatusCounts(actor) {
    if (actor.role !== 'admin') error('Forbidden', 403);

    const total = await userRepo.count({ role: 'customer' });
    const active = await userRepo.count({ role: 'customer', status: 'active' });
    const inactive = await userRepo.count({ role: 'customer', status: 'inactive' });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsers = await userRepo.count({
      role: 'customer',
      createdAt: { $gte: thirtyDaysAgo }
    });

    return {
      total,
      active,
      inactive,
      new: newUsers
    };
  }

  /* =======================
     PRIVATE HELPERS
  ======================== */
  _sanitize(user) {
    const { passwordHash, __v, ...safe } = user;
    return safe;
  }
}

module.exports = new UsersService();
