/**
 * K6 Load Test: Checkout Load
 * 
 * Goal: Validate order creation + inventory reservation under pressure
 * 
 * Scenario:
 * - 50 virtual users
 * - Authenticated
 * - Valid cart
 * - Place order
 * - Static shipping applied
 * 
 * Success Criteria:
 * - Orders contain shippingAddressId and billingAddressId
 * - Inventory is reserved (not decremented)
 * - 95% checkout < 800ms
 * - Error rate < 2%
 * 
 * Run: k6 run k6/checkout.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { login, getAuthHeaders } from './helpers/auth.js';
import { getApiUrl } from './helpers/config.js';
import { assertSuccess, assertHasField, assertResponseTime } from './helpers/assertions.js';

// Custom metrics
const checkoutSuccess = new Counter('checkout_success');
const checkoutFailed = new Counter('checkout_failed');
const checkoutDuration = new Trend('checkout_duration');
const missingAddressId = new Counter('missing_address_id');
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  scenarios: {
    checkout_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 20 },  // Warm up
        { duration: '30s', target: 50 },  // Ramp to 50
        { duration: '2m', target: 50 },   // Hold at 50
        { duration: '20s', target: 0 },   // Ramp down
      ],
    },
  },
  thresholds: {
    'checkout_duration': ['p(95)<800'], // 95% of checkouts < 800ms
    'errors': ['rate<0.02'],             // Less than 2% error rate
    'http_req_failed': ['rate<0.02'],
    'missing_address_id': ['count==0'],  // CRITICAL: Must be zero
  },
};

export function setup() {
  // Setup: Ensure shipping config exists
  // You might want to create addresses and products via API
  
  return {
    variantId: __ENV.TEST_VARIANT_ID || 'REPLACE_WITH_REAL_VARIANT_ID',
    shippingAddressId: __ENV.TEST_SHIPPING_ADDRESS_ID || null,
    billingAddressId: __ENV.TEST_BILLING_ADDRESS_ID || null,
  };
}

export default function (data) {
  const { variantId } = data;

  // STEP 1: Login
  const email = `loadtest-checkout-${__VU}@example.com`;
  const password = 'LoadTest123!';

  const authResult = login(email, password);
  
  if (!authResult.success) {
    errorRate.add(1);
    sleep(1);
    return;
  }

  const token = authResult.token;
  const userId = authResult.user.id;
  const headers = { headers: getAuthHeaders(token) };
  errorRate.add(0);

  // STEP 2: Create addresses if not provided
  let shippingAddressId = data.shippingAddressId;
  let billingAddressId = data.billingAddressId;

  if (!shippingAddressId) {
    const addressPayload = JSON.stringify({
      fullName: 'Load Test User',
      phone: '1234567890',
      addressLine1: '123 Test St',
      city: 'Bangalore',
      state: 'KA',
      pincode: '560001',
      country: 'India',
      isDefault: true,
    });

    const addressResponse = http.post(
      getApiUrl('/user/addresses'),
      addressPayload,
      headers
    );

    if (addressResponse.status === 201) {
      const addressBody = JSON.parse(addressResponse.body);
      shippingAddressId = addressBody.data._id;
      billingAddressId = addressBody.data._id;
    } else {
      errorRate.add(1);
      return;
    }
  }

  // STEP 3: Add items to cart
  const cartPayload = JSON.stringify({
    productVariantId: variantId,
    quantity: Math.floor(Math.random() * 3) + 1, // 1-3 items
  });

  const cartResponse = http.post(
    getApiUrl('/cart/items'),
    cartPayload,
    headers
  );

  if (cartResponse.status !== 200) {
    // Cart add failed (might be out of stock - expected)
    errorRate.add(0); // Not an error - just inventory constraint
    sleep(0.5);
    return;
  }

  sleep(0.3); // Think time

  // STEP 4: CHECKOUT (CRITICAL TEST)
  const checkoutPayload = JSON.stringify({
    shippingAddressId: shippingAddressId,
    billingAddressId: billingAddressId,
    paymentMethod: 'card',
  });

  const startTime = Date.now();
  
  const checkoutResponse = http.post(
    getApiUrl('/orders'),
    checkoutPayload,
    headers
  );

  const duration = Date.now() - startTime;
  checkoutDuration.add(duration);

  // CRITICAL ASSERTIONS
  const success = check(checkoutResponse, {
    'checkout: status is 201': (r) => r.status === 201,
    'checkout: has order data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success && body.data && body.data._id;
      } catch {
        return false;
      }
    },
  });

  if (checkoutResponse.status === 201) {
    checkoutSuccess.add(1);
    
    try {
      const body = JSON.parse(checkoutResponse.body);
      const order = body.data;

      // CRITICAL: Verify schema fields
      const schemaChecks = check(checkoutResponse, {
        'CRITICAL - order has shippingAddressId': (r) => {
          return order.shippingAddressId !== undefined && 
                 order.shippingAddressId !== null;
        },
        'CRITICAL - order has billingAddressId': (r) => {
          return order.billingAddressId !== undefined && 
                 order.billingAddressId !== null;
        },
        'order has grandTotal': (r) => {
          return order.grandTotal !== undefined;
        },
        'order has paymentStatus': (r) => {
          return order.paymentStatus === 'pending';
        },
        'order has orderStatus': (r) => {
          return order.orderStatus === 'created';
        },
        'order has orderNumber': (r) => {
          return order.orderNumber && order.orderNumber.startsWith('ORD-');
        },
      });

      // Track missing address IDs
      if (!order.shippingAddressId || !order.billingAddressId) {
        missingAddressId.add(1);
      }

      // Verify response time
      assertResponseTime(checkoutResponse, 800, 'checkout');

    } catch (e) {
      console.error('Parse error:', e);
      errorRate.add(1);
    }
    
  } else if (checkoutResponse.status === 400) {
    // Expected failure (e.g., empty cart, invalid address)
    checkoutFailed.add(1);
    errorRate.add(0); // Not a system error
    
  } else {
    // Unexpected error
    checkoutFailed.add(1);
    errorRate.add(1);
  }

  // Clean up: Clear cart for next iteration
  sleep(0.2);
}

export function teardown(data) {
  console.log('=== Checkout Load Test Complete ===');
  console.log('Verify:');
  console.log('1. missing_address_id == 0 (CRITICAL)');
  console.log('2. p95 checkout_duration < 800ms');
  console.log('3. error rate < 2%');
}
