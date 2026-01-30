# User Management System

## Overview

Comprehensive user management covering customer accounts, addresses, preferences, and activity tracking.

---

## User Roles

- **Customer**: Regular buyers
- **Admin**: Platform administrators
- **Wholesale**: B2B customers (special pricing)

---

## Data Models

### User Schema

```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique, indexed),
  phone: String (unique, indexed),
  password: String (hashed with Argon2),
  
  // Role & Status
  role: String,  // 'customer', 'admin', 'wholesale'
  isActive: Boolean,
  isEmailVerified: Boolean,
  isPhoneVerified: Boolean,
  
  // Profile
  avatar: String,
  dateOfBirth: Date,
  gender: String,
  
  // Preferences
  language: String,
  currency: String,
  notifications: {
    email: Boolean,
    sms: Boolean,
    push: Boolean
  },
  
  // Timestamps
  lastLoginAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### User Address Schema

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  
  // Address Details
  fullName: String,
  phone: String,
  addressLine1: String,
  addressLine2: String,
  city: String,
  state: String,
  zipCode: String,
  country: String,
  
  // Type
  type: String,  // 'home', 'office', 'other'
  isDefault: Boolean,
  
  // Geo-location (optional)
  coordinates: {
    lat: Number,
    lng: Number
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

### User Activity Log Schema

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  action: String,  // 'login', 'logout', 'order_placed', 'profile_updated'
  metadata: Object,
  ipAddress: String,
  userAgent: String,
  createdAt: Date
}
```

---

## API Endpoints

### User Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/profile` | Get current user profile |
| PUT | `/users/profile` | Update profile |
| POST | `/users/change-password` | Change password |
| DELETE | `/users/account` | Delete account (soft delete) |

### Address Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/addresses` | List user addresses |
| POST | `/users/addresses` | Add new address |
| PUT | `/users/addresses/:id` | Update address |
| DELETE | `/users/addresses/:id` | Delete address |
| PATCH | `/users/addresses/:id/set-default` | Set as default |

### Activity Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/activity` | View activity history |

---

## Business Logic

### Address Validation

- Required fields: fullName, phone, addressLine1, city, state, zipCode
- Phone number format validation
- ZIP code validation (country-specific)
- Maximum 5 addresses per user
- One default address per user

### Default Address Logic

```javascript
// When setting a new default address
1. Find current default address
2. Set current default to isDefault = false
3. Set new address to isDefault = true
```

### Account Deletion

**Soft Delete:**
- User account marked `isActive = false`
- Personal data retained for legal compliance (30 days)
- Orders history preserved
- Email/phone freed for new registration

**Hard Delete (After 30 days):**
- Anonymize user data
- Remove PII (email, phone, address)
- Keep order history (user ID = "deleted_user")

---

## Activity Tracking

**Tracked Actions:**
- Login/Logout
- Profile updates
- Order placement
- Password changes
- Address changes
- Payment methods added/removed

**Use Cases:**
- Security audit
- Suspicious activity detection
- Customer support
- Compliance

---

## User Preferences

```javascript
{
  notifications: {
    orderUpdates: true,
    promotions: false,
    newsletter: true
  },
  privacy: {
    showProfile: false,
    showReviews: true
  },
  shopping: {
    saveCart: true,
    wishlistPublic: false
  }
}
```

---

## Security

- Passwords hashed with Argon2 (or Bcrypt)
- Email verification required
- Phone OTP for sensitive operations
- Login rate limiting
- Session management
- GDPR compliance (data export, deletion)

---

## Integration Points

- **Auth Module**: Login, registration, password reset
- **Orders Module**: Shipping/billing addresses
- **Cart Module**: Saved carts per user
- **Wishlist Module**: User wishlists
- **Reviews Module**: User reviews
- **Notifications Module**: User preferences

---

## Related Documentation

- [Authentication & Authorization](./AUTHENTICATION_AUTHORIZATION.md)
- [Audit & Compliance](./AUDIT_AND_COMPLIANCE.md)
