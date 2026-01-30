# Coupons & Discounts System

## Overview

The Coupons & Discounts system enables promotional campaigns through flexible coupon codes with configurable rules, usage limits, and fraud prevention mechanisms.

---

## Key Features

- 🎁 **Multiple Discount Types** - Percentage, fixed amount, free shipping
- 📅 **Time-Based** - Start/end dates, time-limited campaigns
- 👥 **User Targeting** - User-specific, user group, or public coupons
- 🛒 **Cart Requirements** - Minimum order value, specific products/categories
- 🔢 **Usage Limits** - Total uses, per-user limits
- 🔒 **Fraud Prevention** - Redis locking, usage tracking
- 📊 **Analytics** - Coupon performance tracking

---

## Coupon Types

### 1. Percentage Discount
```
Code: SAVE20
Type: percentage
Value: 20
Result: 20% off cart total
```

### 2. Fixed Amount Discount
```
Code: FLAT500
Type: fixed
Value: 500
Result: ₹500 off cart total
```

### 3. Free Shipping
```
Code: FREESHIP
Type: free_shipping
Value: 0
Result: Shipping cost = 0
```

### 4. Buy X Get Y
```
Code: BUY2GET1
Type: bxgy
Config: { buy: 2, get: 1, productId: "xyz" }
Result: Buy 2, get 1 free of same product
```

---

## Data Model

```javascript
{
  _id: ObjectId,
  code: String (unique, uppercase),  // e.g., "WELCOME10"
  
  // Discount Configuration
  type: String,                      // 'percentage', 'fixed', 'free_shipping', 'bxgy'
  value: Number,                     // Discount amount or percentage
  
  // Validity
  startDate: Date,
  endDate: Date,
  isActive: Boolean,
  
  // Usage Limits
  maxUses: Number,                   // Total redemptions allowed (null = unlimited)
  maxUsesPerUser: Number,            // Per-user limit (null = unlimited)
  currentUses: Number,               // Current usage count
  
  // Requirements
  minOrderValue: Number,             // Minimum cart value (null = no minimum)
  maxDiscountAmount: Number,         // Cap for percentage discounts
  
  // Targeting
  applicableProducts: [ObjectId],    // Specific products (empty = all)
  applicableCategories: [ObjectId],  // Specific categories (empty = all)
  applicableUsers: [ObjectId],       // Specific users (empty = all)
  userGroups: [String],              // 'new_user', 'vip', 'wholesale', etc.
  
  // Stacking
  isStackable: Boolean,              // Can be used with other coupons
  
  // Display
  title: String,                     // "Welcome Discount"
  description: String,               // Customer-facing description
  
  // Tracking
  usedBy: [
    {
      userId: ObjectId,
      orderId: ObjectId,
      usedAt: Date,
      discountAmount: Number
    }
  ],
  
  // Management
  cre atedBy: ObjectId (ref: User),  // Admin who created
  createdAt: Date,
  updatedAt: Date
}
```

---

## API Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/coupons` | Yes | Admin | Create coupon |
| GET | `/coupons` | Yes | Admin | List all coupons |
| GET | `/coupons/:code/validate` | Yes | Customer | Validate coupon for cart |
| POST | `/cart/coupon` | Yes | Customer | Apply coupon to cart |
| DELETE | `/cart/coupon` | Yes | Customer | Remove coupon from cart |
| PUT | `/coupons/:id` | Yes | Admin | Update coupon |
| DELETE | `/coupons/:id` | Yes | Admin | Delete coupon |
| GET | `/coupons/:id/analytics` | Yes | Admin | Coupon performance stats |

---

## Business Logic

### Coupon Validation

**Validation Checks (in order):**

1. **Code Exists** - Coupon code found in database
2. **Is Active** - `isActive = true`
3. **Date Range** - Current date between `startDate` and `endDate`
4. **Usage Limit** - `currentUses < maxUses`
5. **Per-User Limit** - User hasn't exceeded `maxUsesPerUser`
6. **Min Order Value** - Cart total ≥ `minOrderValue`
7. **Product/Category** - Cart contains applicable items
8. **User Targeting** - User in `applicableUsers` or `userGroups`
9. **Stacking Rules** - If cart has other coupons, check `isStackable`

**Validation Response:**
```javascript
{
  valid: true,
  coupon: { ... },
  discountAmount: 500,
  message: "Coupon applied successfully"
}

// Or invalid
{
  valid: false,
  message: "Coupon expired",
  code: "COUPON_EXPIRED"
}
```

---

### Discount Calculation

#### Percentage Discount
```javascript
cartSubtotal = 5000
couponValue = 20 // 20%
discountAmount = cartSubtotal * (couponValue / 100)
               = 5000 * 0.20 = 1000

// If maxDiscountAmount = 500
finalDiscount = min(1000, 500) = 500
```

#### Fixed Discount
```javascript
cartSubtotal = 5000
couponValue = 500
discountAmount = 500

// Cannot exceed cart total
finalDiscount = min(500, cartSubtotal) = 500
```

#### Free Shipping
```javascript
shippingCost = 100
discountAmount = shippingCost
finalDiscount = 100
```

---

### Coupon Locking (Concurrency Safety)

**Problem:** Multiple users redeeming same limited coupon simultaneously

**Solution:** Redis distributed lock

```javascript
// During order placement
1. Acquire Redis lock: `coupon:lock:{code}` (TTL: 30s)
2. Check current usage < max usage
3. If valid, increment usage counter
4. Save order with coupon reference
5. Release lock

// If lock acquisition fails
- Retry 3 times with 100ms backoff
- If still fails, return "Coupon unavailable"
```

---

### Usage Tracking

**Per-User Tracking:**
```javascript
usedBy: [
  {
    userId: "user_123",
    orderId: "order_456",
    usedAt: "2026-01-08T10:00:00Z",
    discountAmount: 500
  }
]

// Check if user can use coupon
userUsageCount = usedBy.filter(u => u.userId === currentUser.id).length
if (userUsageCount >= maxUsesPerUser) {
  return "You've already used this coupon"
}
```

---

## Fraud Prevention

### 1. Usage Limits
- Total redemptions capped
- Per-user limits prevent abuse
- Cooldown periods between uses

### 2. Code Complexity
- Minimum 6 characters
- Uppercase only (prevents case sensitivity issues)
- Alphanumeric only (no special chars)

### 3. Rate Limiting
- Max 5 validation attempts per minute per IP
- Max 10 apply attempts per hour per user

### 4. Audit Trail
- All coupon applications logged
- Failed validation reasons tracked
- Suspicious patterns detected (e.g., same IP, multiple accounts)

### 5. Expiration Enforcement
- Automatic deactivation on end date
- Cannot be reactivated once expired

---

## Advanced Features

### Targeted Campaigns

**New User Welcome:**
```javascript
{
  code: "WELCOME10",
  type: "percentage",
  value: 10,
  userGroups: ["new_user"],  // Only for first-time customers
  maxUsesPerUser: 1
}
```

**Cart Abandonment:**
```javascript
{
  code: "COMEBACK20",
  type: "percentage",
  value: 20,
  applicableUsers: [/* users who abandoned carts */],
  endDate: Date.now() + 24hours  // 24-hour urgency
}
```

**Category-Specific:**
```javascript
{
  code: "ELECTRONICS25",
  type: "percentage",
  value: 25,
  applicableCategories: [electronicsId],
  minOrderValue: 5000
}
```

---

### Coupon Stacking

**Example:**
```
Cart Total: ₹10,000

Coupon 1: SAVE10 (10% off, stackable)
Discount: ₹1,000

Coupon 2: FLAT500 (₹500 off, stackable)
Discount: ₹500

Total Discount: ₹1,500
Final Amount: ₹8,500
```

**Stacking Rules:**
- Both coupons must have `isStackable = true`
- Discounts calculated sequentially (first applied, then second on reduced total)
- Maximum 2 coupons per cart (configurable)

---

## Integration Points

### Cart Module
- Validates coupons during cart operations
- Calculates discount in cart total
- Stores applied coupon reference

### Orders Module
- Locks coupon during order placement
- Records coupon usage in order
- Increments coupon usage counter

### Analytics Module
- Tracks coupon performance
- Revenue vs discount analysis
- Popular coupons report

### Email Module
- Sends personalized coupon codes
- Cart abandonment coupons
- Birthday/anniversary coupons

---

## Admin Dashboard

### Coupon Management

**Create Coupon:**
```
1. Enter code (auto-uppercase)
2. Select type (percentage/fixed/free shipping)
3. Set discount value
4. Configure validity dates
5. Set usage limits
6. Define targeting rules
7. Save and activate
```

**Coupon Analytics:**
- Total redemptions
- Revenue generated vs discount given
- Conversion rate (applied vs used)
- User segmentation (new vs returning)
- Performance over time graph

---

## Security Considerations

### Access Control
- Only admins can create/edit coupons
- Customers can only validate/apply coupons
- Vendor-specific coupons (future feature)

### Validation
- Code format validation (alphanumeric, 6-20 chars)
- Date validation (endDate > startDate)
- Value validation (must be > 0, percentage ≤ 100)
- Usage limits validation (maxUsesPerUser ≤ maxUses)

### Injection Prevention
- Coupon codes sanitized (uppercase, alphanumeric only)
- No SQL/NoSQL injection via code parameter
- XSS prevention in coupon descriptions

---

## Performance Optimization

### Database Indexes
```javascript
{ code: 1 }                    // Unique, primary lookup
{ isActive: 1, endDate: 1 }    // Active coupons query
{ 'usedBy.userId': 1 }         // User usage lookup
```

### Caching
```
coupon:{code}     // Individual coupon (5 min TTL)
active:coupons    // List of active coupons (1 min TTL)
```

**Cache Invalidation:**
- On coupon update/delete
- On usage increment
- On activation/deactivation

---

## Common Use Cases

### Scenario 1: Flash Sale
```
Code: FLASH50
Type: percentage
Value: 50
StartDate: 2026-01-10 00:00
EndDate: 2026-01-10 23:59
MaxUses: 1000
MinOrderValue: 2000

Result: 50% off for first 1000 orders over ₹2000 on Jan 10
```

### Scenario 2: First Purchase
```
Code: FIRST15
Type: percentage
Value: 15
UserGroups: ["new_user"]
MaxUsesPerUser: 1

Result: 15% off for new customers, one-time use
```

### Scenario 3: Minimum Order Incentive
```
Code: BUY5KGET500
Type: fixed
Value: 500
MinOrderValue: 5000

Result: ₹500 off on orders over ₹5000
```

---

## Testing

### Unit Tests
- Coupon validation logic
- Discount calculation (all types)
- Usage limit enforcement
- Date range validation
- User targeting logic

### Integration Tests
- Apply coupon to cart
- Order placement with coupon
- Concurrent coupon redemption
- Stacking validation
- Expiration handling

---

## Error Handling

| Error Code | HTTP | Description | User Message |
|------------|------|-------------|--------------|
| COUPON_NOT_FOUND | 404 | Invalid code | "Invalid coupon code" |
| COUPON_EXPIRED | 400 | Past end date | "This coupon has expired" |
| COUPON_NOT_STARTED | 400 | Before start date | "This coupon is not valid yet" |
| COUPON_LIMIT_REACHED | 400 | Max uses exceeded | "This coupon has been fully redeemed" |
| COUPON_USER_LIMIT | 400 | User maxed out | "You've already used this coupon" |
| COUPON_MIN_VALUE | 400 | Cart below minimum | "Minimum order value is ₹{min}" |
| COUPON_NOT_APPLICABLE | 400 | Products don't match | "Coupon not applicable to cart items" |
| COUPON_STACKING_ERROR | 400 | Can't stack | "This coupon cannot be combined with others" |

---

## Monitoring & Alerts

### Key Metrics
- Coupon redemption rate
- Average discount per order
- Revenue impact (with vs without coupons)
- Fraud attempts (suspicious patterns)

### Alerts
- High fraud activity detected
- Coupon usage spike (→ verify campaign)
- Low redemption rate (→ review targeting)
- Budget exceeded (→ pause campaign)

---

## Related Documentation

- [Cart Logic](./INVENTORY_AND_CART_LOGIC.md)
- [Order Lifecycle](./ORDER_LIFECYCLE.md)
- [Analytics](./ANALYTICS_AND_REPORTING.md)
