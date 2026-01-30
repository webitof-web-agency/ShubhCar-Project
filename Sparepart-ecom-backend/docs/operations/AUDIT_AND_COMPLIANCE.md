# Audit & Compliance System

## Overview

Audit logging and compliance tracking for administrative actions, data changes, and regulatory requirements.

---

## Features

- 📝 **Audit Trail**: All admin/vendor actions logged
- 🔍 **Change Tracking**: Before/after data snapshots
- 🔒 **Immutable Logs**: Append-only audit records
- 📊 **Compliance Reports**: GDPR, PCI-DSS audit trails
- 🚨 **Security Alerts**: Suspicious activity detection

---

## Data Model

```javascript
{
  _id: ObjectId,
  actor: {
    userId: ObjectId (ref: User),
    role: String,
    email: String,
    ipAddress: String
  },
  
  action: String,  // 'order.update_status', 'product.approve', 'user.delete'
  entity: {
    type: String,  // 'order', 'product', 'user'
    id: ObjectId,
    name: String
  },
  
  changes: {
    before: Object,  // Previous state
    after: Object    // New state
  },
  
  metadata: {
    reason: String,  // Why the change was made
    ticket: String   // Support ticket reference
  },
  
  timestamp: Date,
  expiresAt: Date  // Auto-delete after retention period
}
```

---

## Tracked Actions

### Order Actions
- Status changes
- Cancellations
- Refunds
- Manual adjustments

### Product Actions
- Approval/rejection
- Price changes
- Inventory adjustments
- Deletions

### User Actions
- Account deletions
- Role changes
- Ban/unban
- Password resets (admin-initiated)

### System Actions
- Configuration changes
- Coupon creations
- Bulk operations

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/audit` | List audit logs |
| GET | `/admin/audit/:entityType/:id` | Entity audit history |
| POST | `/admin/audit/export` | Export audit report |

---

## Compliance

### GDPR
- User data export
- Right to be forgotten
- Data retention policies
- Consent tracking

### PCI-DSS
- Payment data access logs
- No card data stored
- Audit trail for transactions

### SOC 2
- Access control logs
- Configuration change tracking
- Security incident logs

---

## Retention Policy

- **Hot Storage**: Last 90 days (PostgreSQL/MongoDB)
- **Cold Storage**: 91 days - 7 years (S3 Glacier)
- **Auto-Delete**: After 7 years (or per regulation)

---

## Alert Rules

- Bulk data export (>1000 records)
- Multiple failed admin logins
- Off-hours access
- Sensitive data access
- Permission escalation attempts

---

## Related Documentation

- [Security](./SECURITY.md)
- [User Management](./USER_MANAGEMENT.md)
- [Observability](./OBSERVABILITY.md)
