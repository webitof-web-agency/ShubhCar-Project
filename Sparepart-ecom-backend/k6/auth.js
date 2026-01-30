/**
 * K6 Load Test: Browse & Auth
 * 
 * Goal: Ensure authentication and browsing are cheap and scalable
 * 
 * Scenario:
 * - 200 virtual users
 * - Login
 * - Fetch product list
 * - Fetch product detail
 * - Think time (1-2s)
 * 
 * Success Criteria:
 * - 95% requests < 300ms
 * - Error rate < 1%
 * 
 * Run: k6 run k6/auth.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { login, getAuthHeaders } from './helpers/auth.js';
import { getApiUrl } from './helpers/config.js';
import { assertSuccess, assertResponseTime } from './helpers/assertions.js';

// Custom metrics
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const productListDuration = new Trend('product_list_duration');
const productDetailDuration = new Trend('product_detail_duration');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '1m', target: 200 },   // Ramp up to 200 users
    { duration: '3m', target: 200 },   // Stay at 200 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<300'], // 95% of requests must complete below 300ms
    'errors': ['rate<0.01'],            // Error rate must be below 1%
    'http_req_failed': ['rate<0.01'],   // Failed requests must be below 1%
  },
};

export default function () {
  const email = `loadtest-auth-${__VU}@example.com`;
  const password = 'LoadTest123!';

  // STEP 1: Login
  const authResult = login(email, password);
  
  if (!authResult.success) {
    errorRate.add(1);
    sleep(1);
    return;
  }

  loginDuration.add(authResult.duration || 0);
  const token = authResult.token;
  const headers = { headers: getAuthHeaders(token) };

  errorRate.add(0);

  // STEP 2: Browse products
  const listResponse = http.get(getApiUrl('/products?page=1&limit=20'), headers);
  
  productListDuration.add(listResponse.timings.duration);
  
  const listSuccess = assertSuccess(listResponse, 'product list');
  const listFast = assertResponseTime(listResponse, 300, 'product list');
  
  if (!listSuccess) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }

  // Simulate user reading the list
  sleep(Math.random() * 2 + 1); // 1-3 seconds

  // STEP 3: View product detail
  let productId = null;
  
  try {
    const listBody = JSON.parse(listResponse.body);
    if (listBody.data && listBody.data.length > 0) {
      const randomIndex = Math.floor(Math.random() * listBody.data.length);
      productId = listBody.data[randomIndex]._id;
    }
  } catch (e) {
    console.error('Failed to parse product list:', e);
  }

  if (productId) {
    const detailResponse = http.get(getApiUrl(`/products/${productId}`), headers);
    
    productDetailDuration.add(detailResponse.timings.duration);
    
    const detailSuccess = assertSuccess(detailResponse, 'product detail');
    const detailFast = assertResponseTime(detailResponse, 300, 'product detail');
    
    if (!detailSuccess) {
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }

    // Simulate user reading product details
    sleep(Math.random() * 2 + 1); // 1-3 seconds
  }

  // STEP 4: Maybe browse another page
  if (Math.random() > 0.5) {
    const page2Response = http.get(getApiUrl('/products?page=2&limit=20'), headers);
    
    check(page2Response, {
      'page 2: status is 200': (r) => r.status === 200,
    });

    sleep(Math.random() + 0.5); // 0.5-1.5 seconds
  }
}
