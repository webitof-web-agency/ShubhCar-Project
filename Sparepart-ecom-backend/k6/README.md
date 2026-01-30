# K6 Load Testing Suite

This directory contains realistic k6 load tests for the Ecommerce Backend. These tests simulate actual user behavior, verify inventory safety, check payment idempotency, and ensure system stability.

## Prerequisites

1. Install [k6](https://k6.io/docs/getting-started/installation/)
2. Backend server running (usually on `http://localhost:3000`)
3. Redis running (for queue/rate-limit tests)

## Configuration

Control tests using environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3000` | API base URL |
| `TEST_EMAIL` | `loadtest@example.com` | Default test user email |
| `TEST_PASSWORD` | `LoadTest123!` | Default test user password |
| `TEST_VARIANT_ID` | `(required for cart/checkout)` | Product Variant ID to use |
| `TEST_INITIAL_STOCK` | `20` | Initial stock assumption for cart tests |
| `STRIPE_WEBHOOK_SECRET` | `test-webhook-secret` | For webhook signature generation |

## Running Tests

### 1. Browse & Auth Load
Validates general system performance and scalability.
```bash
k6 run k6/auth.js
```
*Goal: 200 concurrent users, <300ms response time*

### 2. Cart Concurrency (Oversell Detector)
**CRITICAL**: Hammers the same product variant to detecting race conditions.
```bash
k6 run -e TEST_VARIANT_ID=65e... k6/cart.js
```
*Goal: 100 concurrent add/updates. Must NOT oversell beyond stock.*

### 3. Checkout Load
Validates full order cycle under pressure.
```bash
k6 run -e TEST_VARIANT_ID=65e... k6/checkout.js
```
*Goal: 50 concurrent checkouts. Orders must have addresses and valid schema.*

### 4. Payment Webhook Flood
Tests idempotency and double-processing protection.
```bash
k6 run k6/webhook.js
```
*Goal: 500 webhooks/min. Must reject invalid sigs and ignore duplicates.*

### 5. Rate-Limit Abuse
Ensures brute-force protection works.
```bash
k6 run k6/rate-limit.js
```
*Goal: Should trigger HTTP 429 errors.*

## Test Structure

```
k6/
├── helpers/
│   ├── auth.js        # Login & JWT handling
│   ├── config.js      # Env config
│   └── assertions.js  # Shared checks including JSON parsing
├── auth.js            # Scenario 1: Browsing
├── cart.js            # Scenario 2: Concurrency
├── checkout.js        # Scenario 3: Order Placement
├── webhook.js         # Scenario 4: Webhook Idempotency
└── rate-limit.js      # Scenario 5: Security Limits
```

## Success Criteria Checklist

- [ ] **Auth**: 95th percentile latency < 300ms
- [ ] **Cart**: `oversell_detected` metric is 0
- [ ] **Checkout**: `missing_address_id` metric is 0
- [ ] **Webhooks**: `double_processing_detected` metric is 0
- [ ] **Rate Limit**: `rate_limit_hits` > 0
- [ ] **General**: Error rates < 1-2%
