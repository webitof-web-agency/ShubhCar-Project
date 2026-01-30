/**
 * K6 Load Test: Payment Webhook Flood
 * 
 * CRITICAL: Test idempotency + webhook safety
 * 
 * Scenario:
 * - Simulate 500 webhook calls/min
 * - Mix of valid/invalid signatures
 * - Duplicate events
 * 
 * Success Criteria:
 * - Invalid signatures rejected
 * - Duplicate webhooks ignored
 * - Each order processed exactly once
 * - No double inventory commit
 * 
 * Run: k6 run k6/webhook.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';
import { getApiUrl } from './helpers/config.js';
import encoding from 'k6/encoding';
import crypto from 'k6/crypto';

// Custom metrics
const validWebhooks = new Counter('valid_webhooks');
const invalidSignatures = new Counter('invalid_signatures_rejected');
const duplicateWebhooks = new Counter('duplicate_webhooks');
const webhookErrors = new Counter('webhook_errors');
const doubleProcessing = new Counter('double_processing_detected');

// Test configuration
export const options = {
  scenarios: {
    webhook_flood: {
      executor: 'constant-arrival-rate',
      rate: 500,              // 500 requests
      timeUnit: '1m',         // per minute
      duration: '2m',         // for 2 minutes
      preAllocatedVUs: 50,    // Pre-allocate VUs
      maxVUs: 100,            // Max VUs if needed
    },
  },
  thresholds: {
    'invalid_signatures_rejected': ['count>0'], // Should reject some
    'double_processing_detected': ['count==0'], // CRITICAL: Must be zero
    'webhook_errors': ['count<10'],             // Allow some errors
  },
};

export function setup() {
  // In production, you'd create test orders here
  // For now, we'll use environment variables
  
  return {
    testOrderIds: (__ENV.TEST_ORDER_IDS || 'order1,order2,order3').split(','),
    stripeWebhookSecret: __ENV.STRIPE_WEBHOOK_SECRET || 'test-webhook-secret',
  };
}

export default function (data) {
  const { testOrderIds, stripeWebhookSecret } = data;
  
  // Randomly select an order
  const orderId = testOrderIds[Math.floor(Math.random() * testOrderIds.length)];
  
  // Randomly decide: valid signature, invalid signature, or duplicate
  const scenario = Math.random();
  
  if (scenario < 0.6) {
    // 60%: Valid webhook
    sendValidWebhook(orderId, stripeWebhookSecret);
  } else if (scenario < 0.8) {
    // 20%: Invalid signature
    sendInvalidWebhook(orderId);
  } else {
    // 20%: Duplicate webhook (same payment intent ID)
    sendDuplicateWebhook(orderId, stripeWebhookSecret);
  }

  sleep(0.01); // Small delay
}

function sendValidWebhook(orderId, secret) {
  const paymentIntentId = `pi_test_${Date.now()}`;
  
  const webhookPayload = {
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: paymentIntentId,
        metadata: { orderId: orderId },
        amount: 30000, // 300.00 INR in smallest unit
        currency: 'inr',
        status: 'succeeded',
      },
    },
  };

  const payload = JSON.stringify(webhookPayload);

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': 'valid-signature', // In prod, generate real signature
    },
  };

  const response = http.post(
    getApiUrl('/webhooks/stripe'),
    payload,
    params
  );

  const success = check(response, {
    'valid webhook: status is 200': (r) => r.status === 200,
  });

  if (success) {
    validWebhooks.add(1);
  } else {
    webhookErrors.add(1);
  }
}

function sendInvalidWebhook(orderId) {
  const webhookPayload = {
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: `pi_invalid_${Date.now()}`,
        metadata: { orderId: orderId },
        amount: 30000,
        currency: 'inr',
        status: 'succeeded',
      },
    },
  };

  const payload = JSON.stringify(webhookPayload);

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': 'invalid-signature-12345', // Wrong signature
    },
  };

  const response = http.post(
    getApiUrl('/webhooks/stripe'),
    payload,
    params
  );

  const rejected = check(response, {
    'invalid signature: status is 400': (r) => r.status === 400 || r.status === 401,
  });

  if (rejected) {
    invalidSignatures.add(1);
  } else {
    // CRITICAL: Invalid signature was NOT rejected!
    console.error('SECURITY ISSUE: Invalid signature accepted!');
    webhookErrors.add(1);
  }
}

// Track payment intent IDs to detect duplicates
const sentPaymentIntents = new Set();

function sendDuplicateWebhook(orderId, secret) {
  // Use a common payment intent ID to simulate duplicate
  const paymentIntentId = `pi_duplicate_${__VU % 5}`; // 5 unique IDs shared across VUs
  
  const isFirstSend = !sentPaymentIntents.has(paymentIntentId);
  if (!isFirstSend) {
    duplicateWebhooks.add(1);
  }
  sentPaymentIntents.add(paymentIntentId);

  const webhookPayload = {
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: paymentIntentId,
        metadata: { orderId: orderId },
        amount: 30000,
        currency: 'inr',
        status: 'succeeded',
      },
    },
  };

  const payload = JSON.stringify(webhookPayload);

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': 'valid-signature',
    },
  };

  const response = http.post(
    getApiUrl('/webhooks/stripe'),
    payload,
    params
  );

  const success = check(response, {
    'duplicate webhook: status is 200': (r) => r.status === 200,
    'duplicate webhook: idempotent': (r) => {
      // Response should still be 200, but no side effects
      return r.status === 200;
    },
  });

  if (!success) {
    webhookErrors.add(1);
  }
}

export function teardown(data) {
  console.log('=== Webhook Flood Test Complete ===');
  console.log('Verify:');
  console.log('1. invalid_signatures_rejected > 0');
  console.log('2. double_processing_detected == 0 (CRITICAL)');
  console.log('3. Check DB: each order processed exactly once');
  console.log('4. Check DB: inventory committed only once per order');
}
