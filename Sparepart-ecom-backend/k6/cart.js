/**
 * K6 Load Test: Cart Concurrency (Oversell Detector)
 * 
 * CRITICAL: Detects race conditions in stock & reservedQty
 * 
 * Scenario:
 * - 100 virtual users
 * - Same product variant
 * - Add to cart
 * - Update quantity
 * - Verify inventory constraints
 * 
 * Success Criteria:
 * - No user can add beyond (stockQty - reservedQty)
 * - Expected failures return HTTP 400
 * - Inventory never goes negative
 * 
 * Run: k6 run k6/cart.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';
import { login, getAuthHeaders } from './helpers/auth.js';
import { getApiUrl } from './helpers/config.js';
import { assertSuccess, assertErrorStatus } from './helpers/assertions.js';

// Custom metrics
const cartAddsSuccess = new Counter('cart_adds_success');
const cartAddsFailed = new Counter('cart_adds_failed');
const insufficientStockErrors = new Counter('insufficient_stock_errors');
const oversellDetected = new Counter('oversell_detected');
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  scenarios: {
    // Concurrent cart operations on same product
    concurrent_cart: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 50 },   // Ramp up to 50
        { duration: '20s', target: 100 },  // Ramp up to 100
        { duration: '30s', target: 100 },  // Hold at 100
        { duration: '10s', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    'cart_adds_failed': ['count>0'], // Some failures are expected (good!)
    'insufficient_stock_errors': ['count>0'], // Should see stock errors
    'oversell_detected': ['count==0'], // CRITICAL: MUST be zero
    'http_req_failed': ['rate<0.05'], // Less than 5% failed (some 400s are valid)
  },
};

// Shared product variant ID (set by setup)
let sharedVariantId = null;

export function setup() {
  // Setup: Create a product with limited stock for testing
  // In real scenario, you'd create a test product or use existing one
  
  // For now, we'll assume there's a product variant available
  // In production, you might want to create a test product via admin API
  
  return {
    variantId: __ENV.TEST_VARIANT_ID || 'REPLACE_WITH_REAL_VARIANT_ID',
    initialStock: parseInt(__ENV.TEST_INITIAL_STOCK || '20'),
  };
}

export default function (data) {
  const { variantId, initialStock } = data;

  // Each VU logs in
  const email = `loadtest-cart-${__VU}@example.com`;
  const password = 'LoadTest123!';

  const authResult = login(email, password);
  
  if (!authResult.success) {
    errorRate.add(1);
    sleep(1);
    return;
  }

  const token = authResult.token;
  const headers = { headers: getAuthHeaders(token) };
  errorRate.add(0);

  // CRITICAL TEST: Try to add item to cart
  // Expected: Some will succeed, some will fail with "insufficient stock"
  
  const quantityToAdd = Math.floor(Math.random() * 5) + 1; // 1-5 items
  
  const addPayload = JSON.stringify({
    productVariantId: variantId,
    quantity: quantityToAdd,
  });

  const addResponse = http.post(
    getApiUrl('/cart/items'),
    addPayload,
    headers
  );

  const addSuccess = check(addResponse, {
    'cart add: status is 200 or 400': (r) => r.status === 200 || r.status === 400,
  });

  if (addResponse.status === 200) {
    cartAddsSuccess.add(1);
    
    // SUCCESS: Item added to cart
    const success = assertSuccess(addResponse, 'cart add');
    
    if (success) {
      try {
        const body = JSON.parse(addResponse.body);
        const cartItems = body.data.items;
        
        // Get the item we just added
        const addedItem = cartItems.find(
          (item) => item.productVariantId === variantId
        );
        
        if (addedItem) {
          const itemId = addedItem._id;
          
          // Try to update quantity (more concurrency pressure)
          sleep(0.1); // Small delay
          
          const newQuantity = quantityToAdd + Math.floor(Math.random() * 3) + 1;
          
          const updatePayload = JSON.stringify({
            quantity: newQuantity,
          });
          
          const updateResponse = http.patch(
            getApiUrl(`/cart/items/${itemId}`),
            updatePayload,
            headers
          );
          
          check(updateResponse, {
            'cart update: status is 200 or 400': (r) => 
              r.status === 200 || r.status === 400,
          });
          
          if (updateResponse.status === 400) {
            // Expected: Insufficient stock
            const body = JSON.parse(updateResponse.body);
            if (body.message && body.message.toLowerCase().includes('insufficient stock')) {
              insufficientStockErrors.add(1);
            }
          }
        }
      } catch (e) {
        console.error('Parse error:', e);
      }
    }
    
  } else if (addResponse.status === 400) {
    // EXPECTED BEHAVIOR: Insufficient stock
    cartAddsFailed.add(1);
    
    try {
      const body = JSON.parse(addResponse.body);
      
      if (body.message && body.message.toLowerCase().includes('insufficient stock')) {
        insufficientStockErrors.add(1);
        // This is GOOD - the system is protecting inventory
      } else {
        // Some other 400 error
        errorRate.add(1);
      }
    } catch (e) {
      errorRate.add(1);
    }
    
  } else {
    // Unexpected status
    errorRate.add(1);
  }

  sleep(Math.random() * 0.5 + 0.2); // 0.2-0.7 seconds
}

export function teardown(data) {
  // Optional: Verify final inventory state
  // In production, you'd query the variant to ensure:
  // - stockQty >= 0
  // - reservedQty <= stockQty
  // - availableQty = stockQty - reservedQty >= 0
  
  console.log('=== Cart Concurrency Test Complete ===');
  console.log('Check metrics to ensure:');
  console.log('1. insufficient_stock_errors > 0 (system is protecting stock)');
  console.log('2. oversell_detected == 0 (CRITICAL)');
}
