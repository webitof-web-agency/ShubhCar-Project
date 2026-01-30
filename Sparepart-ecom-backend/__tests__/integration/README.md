# Integration Tests

Comprehensive integration tests for the ecommerce backend that validate real behavior by hitting HTTP endpoints and asserting database side-effects.

## Setup

These tests use:
- **supertest** - HTTP assertions
- **Jest** - Test runner
- **Real MongoDB** - Separate test database
- **Real Express app** - Actual server bootstrap

## Running Tests

```bash
# Run all integration tests
NODE_ENV=test npm run test:integration

# Run specific test file
NODE_ENV=test npm test __tests__/integration/auth.test.js

# Run with coverage
NODE_ENV=test npm run test:integration:coverage
```

## Environment Variables

Create a `.env.test` file:

```env
NODE_ENV=test
MONGO_URI=mongodb://localhost:27017/test-ecommerce
JWT_SECRET=test-jwt-secret-key
STRIPE_SECRET_KEY=test_stripe_key
STRIPE_WEBHOOK_SECRET=test_stripe_webhook_secret
RAZORPAY_KEY_ID=test_razorpay_key
RAZORPAY_KEY_SECRET=test_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=test_razorpay_webhook_secret
```

## Test Structure

```
__tests__/integration/
├── setup.js                    # Test database & app bootstrap
├── helpers/
│   └── factories.js           # Test data factories
├── auth.test.js               # Authentication & JWT tests
├── cart.test.js               # Cart operations & oversell prevention
├── order.test.js              # Order placement & schema validation
├── payment-webhook.test.js    # Webhook validation & idempotency
└── analytics.test.js          # Revenue, products, inventory alerts
```

## What These Tests Validate

### 🔐 Authentication (`auth.test.js`)
- User registration succeeds
- Login returns valid JWT
- Protected routes reject unauthenticated requests
- Protected routes allow valid JWT tokens

### 🛒 Cart Safety (`cart.test.js`)
- **CRITICAL**: Cannot add items beyond `(stockQty - reservedQty)`
- **CRITICAL**: Quantity updates respect reserved stock
- Cart persists per user across sessions
- Clear error messages on insufficient stock

### 📦 Order Placement (`order.test.js`)
- **CRITICAL**: Order fails if shipping config missing
- **CRITICAL**: Order document contains `shippingAddressId` and `billingAddressId`
- Static shipping applied correctly
- **CRITICAL**: Inventory is reserved (not decremented) on order creation
- **CRITICAL**: Transaction rollback on failure

### 💳 Payment Webhooks (`payment-webhook.test.js`)
- **CRITICAL**: Invalid webhook signature → rejected
- Valid payment webhook marks order as paid
- **CRITICAL**: Inventory committed (stockQty decremented, reservedQty released)
- **CRITICAL**: Duplicate webhooks handled (idempotency)
- Failed payment releases reserved stock

### 📊 Analytics (`analytics.test.js`)
- **CRITICAL**: Revenue sums `Order.grandTotal` for `paymentStatus = 'paid'`
- **CRITICAL**: Orders with `paymentStatus !== 'paid'` excluded
- **CRITICAL**: Top products computed via `OrderItem` collection
- **CRITICAL**: Low-stock based on `availableQty = stockQty - reservedQty`

## Factory Functions

Use factories in `helpers/factories.js` to generate test data:

```javascript
const {
  createUser,
  createProduct,
  createShippingConfig,
  createAddress,
  createCart,
  createOrder,
} = require('./helpers/factories');

// Create user
const user = await createUser({ email: 'test@example.com' });

// Create product with variants
const { product, variants } = await createProduct({
  stockQty: 100,
  reservedQty: 10,
  variantsCount: 2,
});

// Create shipping config
await createShippingConfig({
  flatRate: 50,
  freeShippingAbove: 1000,
});
```

## Database Cleanup

Each test file:
- Connects to test DB in `beforeAll()`
- Clears all collections in `beforeEach()`
- Drops DB and disconnects in `afterAll()`

## Mocking Strategy

These tests mock:
- ✅ External payment APIs (Stripe, Razorpay)
- ✅ Email sending
- ✅ Redis queues (but assertions on enqueue calls remain)

These tests use REAL:
- ✅ MongoDB database
- ✅ Express app
- ✅ HTTP requests
- ✅ Mongoose models

## Critical Test Cases

### Overselling Prevention
```javascript
// Stock: 10, Reserved: 7, Available: 3
await request(app)
  .post('/api/cart/items')
  .send({ variantId: '...', quantity: 5 }) // Exceeds available
  .expect(400); // MUST FAIL
```

### Payment Idempotency
```javascript
// Send same webhook twice
await request(app).post('/api/webhooks/stripe').send(payload);
await request(app).post('/api/webhooks/stripe').send(payload);

// Stock should only decrement ONCE
const variant = await ProductVariant.findById(variantId);
expect(variant.stockQty).toBe(95); // Not 90
```

### Schema Validation
```javascript
const order = await Order.findById(orderId);
expect(order.shippingAddressId).toBeTruthy(); // CRITICAL
expect(order.grandTotal).toBeDefined(); // Not totalAmount
expect(order.paymentStatus).toBe('paid'); // Not status
```

## Success Criteria

✅ All tests pass  
✅ Overselling prevented  
✅ Missing shipping config caught  
✅ Order schema bugs caught  
✅ Payment double-processing prevented  
✅ Analytics accuracy validated

## Debugging

To see detailed request/response:

```javascript
const response = await request(app)
  .post('/api/cart/items')
  .send(data)
  .expect(200);

console.log('Response:', JSON.stringify(response.body, null, 2));
```

To inspect database state:

```javascript
const dbOrder = await Order.findById(orderId).lean();
console.log('DB Order:', dbOrder);
```

## Common Issues

**Test timeout**: Increase Jest timeout in test file:
```javascript
jest.setTimeout(30000); // 30 seconds
```

**MongoDB connection error**: Ensure MongoDB is running and `MONGO_URI` is set

**Port already in use**: Server uses random port (0) to avoid conflicts

## Adding New Tests

1. Create test file in `__tests__/integration/`
2. Import setup and factories
3. Follow existing test structure
4. Assert both API response AND database state
5. Test critical business rules (money, inventory)

## Notes

- These are NOT unit tests - they test real behavior
- Tests are slowerthan unit tests (database operations)
- Tests are isolated - no shared state between files
- Tests clean up after themselves
