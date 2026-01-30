/**
 * K6 Load Test: Rate-Limit Abuse
 * 
 * Goal: Ensure protection against brute force / bots
 * 
 * Scenario:
 * - 1 virtual user
 * - Rapid login attempts (10/sec)
 * 
 * Success Criteria:
 * - Rate-limit kicks in (HTTP 429)
 * - Server does not crash (returns 429 or 200/401, not 5xx)
 * 
 * Run: k6 run k6/rate-limit.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';
import { getApiUrl } from './helpers/config.js';
import { assertRateLimit } from './helpers/assertions.js';

// Custom metrics
const rateLimitHits = new Counter('rate_limit_hits');
const serverErrors = new Counter('server_errors');
const successfulRequests = new Counter('successful_requests');

// Test configuration
export const options = {
  scenarios: {
    brute_force: {
      executor: 'constant-arrival-rate',
      rate: 10,               // 10 requests
      timeUnit: '1s',         // per second
      duration: '30s',        // for 30 seconds (300 requests total)
      preAllocatedVUs: 5,     // Small number of VUs needed
      maxVUs: 20,
    },
  },
  thresholds: {
    'rate_limit_hits': ['count>0'], // CRITICAL: Must trigger at least once
    'server_errors': ['count==0'],  // CRITICAL: No server crashes (5xx)
  },
};

export default function () {
  // Simulate brute force on login endpoint
  const payload = JSON.stringify({
    email: 'victim@example.com',
    password: `WrongPassword${Math.random()}`, // Random password
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.post(getApiUrl('/auth/login'), payload, params);

  // Check response status
  if (response.status === 429) {
    // Expected behavior: Rate limit triggered
    rateLimitHits.add(1);
    assertRateLimit(response);
  } else if (response.status >= 500) {
    // Server crash/error - BAD
    serverErrors.add(1);
    console.error(`Server Error: ${response.status}`);
  } else if (response.status === 401 || response.status === 200) {
    // Application processed request (not rate limited yet)
    successfulRequests.add(1);
  } else {
    // Other statuses (maybe 400 for bad request) take as 'processed'
    successfulRequests.add(1);
  }
}

export function teardown(data) {
  console.log('=== Rate Limit Test Complete ===');
  console.log('Verify:');
  console.log('1. rate_limit_hits > 0 (Protection active)');
  console.log('2. server_errors == 0 (Resilience)');
}
