# Testing Guide

## Testing Strategy

We employ a pyramid testing strategy:

### 1. Unit Testing (Jest)
- **Scope**: Utilities, Helpers, isolated Service logic.
- **Goal**: Verify correct calculations (Tax, math, regex).
- **Run**: `npm run test:unit`

### 2. Integration Testing (Jest + Supertest)
- **Scope**: API Routes → Controller → Service → **Real Test DB**.
- **Goal**: Verify component interaction. "Does creating an order actually reserve stock in the DB?"
- **Setup**: Requires a running MongoDB instance (or Mongo Memory Server).
- **Run**: `npm run test:integration`

### 3. Load Testing (k6)
- **Scope**: Critical flows (Checkout, Search).
- **Goal**: Ensure system handles 1000+ RPS.
- **Scripts**: Located in `k6/` folder.
- **Run**: `k6 run k6/checkout_flow.js`

---

## Test Coverage Requirements
**Contract Requirement**: 70% code coverage for critical functions

---

## Running Tests

### Unit Tests
```bash
# Run all unit tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.service.test.js

# Watch mode
npm test -- --watch
```

### Integration Tests
```bash
# Run integration tests
npm run test:integration

# Test specific module
npm run test:integration -- orders
```

### End-to-End Tests
```bash
# Run E2E tests
npm run test:e2e

# Run critical path only
npm run test:e2e:critical
```

---

## Critical Path Testing (Priority)

### 1. Authentication Flow
```bash
# Test file: __tests__/auth.e2e.test.js

✓ User can register with email
✓ User can login and receive tokens
✓ User can refresh token
✓ User can logout (token blacklisted)
✓ Invalid token rejected
✓ Expired token rejected
```

### 2. Order Placement Flow
```bash
# Test file: __tests__/order-flow.e2e.test.js

✓ User can add products to cart
✓ User can apply coupon
✓ User can place order
✓ Inventory reserved correctly
✓ Order status = 'created'
✓ Payment intent created
```

### 3. Payment Processing
```bash
# Test file: __tests__/payment.e2e.test.js

✓ Payment initiation returns client secret
✓ Webhook verification works (Stripe)
✓ Webhook verification works (Razorpay)
✓ Order confirmed after successful payment
✓ Inventory committed after confirmation
✓ Duplicate webhook ignored (idempotency)
✓ Failed payment cancels order
```

### 4. Concurrency Safety
```bash
# Test file: __tests__/concurrency.test.js

✓ Inventory overselling prevented
✓ Multiple users can't reserve same stock
✓ Payment idempotency enforced (no duplicate charges)
✓ Order state machine prevents illegal transitions
```

---

## Load Testing

### Objectives
- Test up to 500 concurrent users
- Identify bottlenecks
- Measure response times under load

### Setup
```bash
# Install k6
# macOS: brew install k6
# Ubuntu: sudo apt install k6

# Or use Artillery
npm install -g artillery
```

### Load Test Script (k6)
Create `tests/load/checkout-flow.js`:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 500 },  // Ramp to 500 users
    { duration: '5m', target: 500 },  // Stay at 500 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% requests < 2s
    http_req_failed: ['rate<0.01'],    // < 1% failures
  },
};

const BASE_URL = 'https://api.yourdomain.com/api/v1';

export default function () {
  // Login
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email: `user${__VU}@test.com`,
    password: 'Test123!'
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(loginRes, {
    'login successful': (r) => r.status === 200,
  });
  
  const token = loginRes.json('data.accessToken');
  
  // Browse products
  const productsRes = http.get(`${BASE_URL}/products`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  
  check(productsRes, {
    'products loaded': (r) => r.status === 200,
  });
  
  // Add to cart
  const cartRes = http.post(`${BASE_URL}/cart/items`, JSON.stringify({
    productVariantId: 'var_test_123',
    quantity: 1
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
  });
  
  check(cartRes, {
    'added to cart': (r) => r.status === 201,
  });
  
  sleep(1);
}
```

### Run Load Test
```bash
# Run k6 test
k6 run tests/load/checkout-flow.js

# Or Artillery
artillery run tests/load/checkout-flow.yml
```

### Expected Results
- **P95 latency**: < 2000ms
- **P99 latency**: < 3000ms
- **Error rate**: < 1%
- **Throughput**: 500+ req/s

---

## Security Testing

### 1. Authentication Tests
```bash
✓ Brute force protection active (5 attempts = lockout)
✓ Token blacklist works (logout invalidates token)
✓ Refresh token rotation prevents reuse
✓ Password strength validated
✓ XSS sanitization working
✓ SQL injection prevented
```

### 2. Authorization Tests
```bash
✓ Users can't access other users' orders
✓ Users can't initiate payment for other orders
✓ Users can't access other users' payment status
✓ Admin routes require admin role
✓ Vendor can only modify own products
```

### 3. Payment Security
```bash
✓ Webhook signature verification enforced
✓ Duplicate webhook ignored (replay attack prevention)
✓ Payment idempotency prevents double charges
✓ Amount tampering rejected
```

---

## Mobile Responsiveness Testing

### Devices to Test
- iOS Safari (iPhone 12, 13, 14)
- Android Chrome (Samsung, Pixel)
- Tablet (iPad, Android tablet)

### Test Scenarios
```
✓ Product browsing smooth on mobile
✓ Cart management works on touch
✓ Checkout flow mobile-optimized
✓ Payment forms responsive
✓ Order history readable on small screens
```

---

## Cross-Browser Testing

### Browsers (Latest 2 Versions)
- Chrome
- Safari
- Firefox
- Edge

### Test Coverage
```
✓ API calls work in all browsers
✓ Payment integration works
✓ No console errors
✓ CORS configured correctly
```

---

## User Acceptance Testing (UAT)

### UAT Checklist

**As a Customer:**
- [ ] I can register and login
- [ ] I can browse products
- [ ] I can add products to cart
- [ ] I can apply coupons
- [ ] I can place an order
- [ ] I can pay via Stripe/Razorpay
- [ ] I receive order confirmation
- [ ] I can view my order history
- [ ] I can track my order
- [ ] I can cancel an order
- [ ] I can write a review

**As an Admin:**
- [ ] I can login to admin panel
- [ ] I can view all orders
- [ ] I can update order status
- [ ] I can manage products
- [ ] I can approve vendor products
- [ ] I can view analytics
- [ ] I can manage coupons
- [ ] I can view reports

**As a Vendor:**
- [ ] I can create products
- [ ] I can update my products
- [ ] I can view my sales
- [ ] I cannot modify other vendors' products

---

## Test Data Setup

### Seed Database
```bash
# Development
npm run seed:dev

# Creates:
# - 10 test users
# - 50 products
# - 20 orders
# - Sample categories
```

### Test Payment Cards (Stripe Test Mode)
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0027 6000 3184
```

---

## Bug Tracking

### Critical Bugs
| ID | Description | Status | Fixed In |
|----|-------------|--------|----------|
| BUG-001 | Auth crash on missing import | Fixed | v1.1.0 |
| BUG-002 | Duplicate payment index | Fixed | v1.1.0 |
| BUG-003 | Webhook worker wrong method | Fixed | v1.1.0 |

### Known Issues (Low Priority)
- Health check returns 200 on degraded state
- Reconciliation error handling too broad
- Request correlation not in all log types

---

## Coverage Report

Generate coverage report:
```bash
npm run test:coverage

# View report
open coverage/lcov-report/index.html
```

### Minimum Coverage Targets
- **Statements**: 70%
- **Branches**: 65%
- **Functions**: 70%
- **Lines**: 70%

### Critical Modules (Priority)
- `modules/auth/` - 80%+
- `modules/payments/` - 80%+
- `modules/orders/` - 75%+
- `modules/inventory/` - 75%+

---

## Continuous Integration

### GitHub Actions Example
```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:6
        ports:
          - 27017:27017
      redis:
        image: redis:7
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Performance Benchmarks

### Target Metrics
| Endpoint | P50 | P95 | P99 |
|----------|-----|-----|-----|
| GET /products | 100ms | 300ms | 500ms |
| POST /auth/login | 200ms | 500ms | 1000ms |
| POST /orders | 500ms | 1500ms | 2500ms |
| POST /payments/initiate | 800ms | 2000ms | 3000ms |
| GET /orders/:id | 100ms | 250ms | 400ms |

---

## Test Execution Schedule

### Pre-Deploy (Mandatory)
1. Unit tests (5 min)
2. Integration tests (10 min)
3. E2E critical path (15 min)
4. Security tests (10 min)

### Weekly (Recommended)
1. Full E2E suite (30 min)
2. Load testing (30 min)
3. Coverage analysis (5 min)

### Pre-Production (Required)
1. Full test suite (1 hour)
2. Load test (500 users, 1 hour)
3. UAT sign-off
4. Security audit

---

## Rollback Testing

Test rollback procedure:
```bash
# Deploy to staging
./deploy.sh staging v2.0.0

# Run tests
npm run test:e2e

# If tests fail, rollback
./deploy.sh staging v1.9.0

# Verify rollback
npm run test:e2e
```

---

## Sign-Off

**Testing Sign-Off Criteria:**
- ✅ Unit test coverage ≥ 70%
- ✅ All E2E critical paths passing
- ✅ Load test completed (500 concurrent users)
- ✅ Security tests passing
- ✅ UAT approved by client
- ✅ No critical bugs
- ✅ Performance benchmarks met

**Signed Off By**: _________________  
**Date**: _________________
