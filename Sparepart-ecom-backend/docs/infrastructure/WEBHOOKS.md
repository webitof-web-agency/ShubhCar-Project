# Webhooks System

## Overview

Comprehensive webhook handling system for receiving real-time event notifications from external services (payment gateways, shipping carriers, etc.) with signature verification, retry logic, and idempotency.

---

## Supported Webhooks

### 1. **Stripe Webhooks**
**Purpose:** Payment event notifications from Stripe

**Events Handled:**
- `payment_intent.succeeded` - Payment successful
- `payment_intent.payment_failed` - Payment failed
- `charge.refunded` - Refund processed
- `checkout.session.completed` - Checkout completed

**Endpoint:** `POST /api/v1/payments/webhook/stripe`

---

### 2. **Razorpay Webhooks**
**Purpose:** Payment event notifications from Razorpay

**Events Handled:**
- `payment.captured` - Payment captured
- `payment.failed` - Payment failed
- `refund.created` - Refund initiated
- `order.paid` - Order payment completed

**Endpoint:** `POST /api/v1/payments/webhook/razorpay`

---

## Webhook Processing Architecture

```
┌─────────────────┐
│ Payment Gateway │
│(Stripe/Razorpay)│
└────────┬────────┘
         │ HTTP POST
         ↓
┌─────────────────────┐
│ Webhook Endpoint    │
│ (Express Route)     │
└────────┬────────────┘
         │
         ├─→ Signature Verification
         │
         ├─→ Idempotency Check
         │
         ├─→ Add to Queue (async)
         │
         └─→ Return 200 OK
         
         
┌─────────────────────┐
│ Webhook Queue       │
│ (BullMQ)            │
└────────┬────────────┘
         │
         ↓
┌─────────────────────┐
│ Webhook Worker      │
│ (Background Job)    │
└────────┬────────────┘
         │
         ├─→ Process Event
         ├─→ Update Order
         ├─→ Send Notifications
         └─→ Log Result
```

---

## Implementation Details

### Stripe Webhook Handler

**File:** `/modules/payments/payment.controller.js`

```javascript
async handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    // 1. Verify signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      endpointSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // 2. Check idempotency (prevent duplicate processing)
  const eventId = event.id;
  const processed = await WebhookLog.findOne({ eventId });
  if (processed) {
    return res.status(200).json({ received: true, duplicate: true });
  }
  
  // 3. Queue for async processing
  await paymentWebhookQueue.add('stripe-webhook', {
    eventId: event.id,
    type: event.type,
    data: event.data.object
  }, {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  });
  
  // 4. Immediately return 200 OK
  res.status(200).json({ received: true });
}
```

---

### Razorpay Webhook Handler

**File:** `/modules/payments/payment.controller.js`

```javascript
async handleRazorpayWebhook(req, res) {
  const webhookSignature = req.headers['x-razorpay-signature'];
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  
  try {
    // 1. Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');
    
    if (expectedSignature !== webhookSignature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
    
    // 2. Check idempotency
    const eventId = req.body.event;
    const processed = await WebhookLog.findOne({ eventId });
    if (processed) {
      return res.status(200).json({ received: true, duplicate: true });
    }
    
    // 3. Queue for async processing
    await paymentWebhookQueue.add('razorpay-webhook', {
      eventId: req.body.event,
      entity: req.body.payload.payment.entity,
      data: req.body.payload
    }, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
    
    // 4. Return 200 OK
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('Razorpay webhook error:', error);
    res.status(400).json({ error: error.message });
  }
}
```

---

## Webhook Worker Processing

**File:** `/workers/payment-webhook.worker.js`

```javascript
const { Worker } = require('bullmq');
const orderService = require('../modules/orders/order.service');
const paymentService = require('../modules/payments/payment.service');

const paymentWebhookWorker = new Worker('payment-webhook-queue', async (job) => {
  const { eventId, type, data } = job.data;
  
  try {
    // Log webhook received
    await WebhookLog.create({
      eventId,
      type,
      data,
      processedAt: new Date()
    });
    
    // Process based on event type
    switch (type) {
      case 'payment_intent.succeeded':
      case 'payment.captured':
        await handlePaymentSuccess(data);
        break;
        
      case 'payment_intent.payment_failed':
      case 'payment.failed':
        await handlePaymentFailure(data);
        break;
        
      case 'charge.refunded':
      case 'refund.created':
        await handleRefund(data);
        break;
        
      default:
        console.log(`Unhandled webhook type: ${type}`);
    }
    
    return { success: true, eventId };
    
  } catch (error) {
    console.error(`Webhook processing failed:`, error);
    throw error; // Trigger retry
  }
}, {
  connection: redis,
  concurrency: 20,
  limiter: {
    max: 100,
    duration: 1000
  }
});

async function handlePaymentSuccess(paymentData) {
  const orderId = paymentData.metadata.orderId;
  
  // Confirm order
  await orderService.confirmOrder(orderId);
  
  // Update payment record
  await paymentService.markPaid(orderId, paymentData);
  
  // Send confirmation email (queued)
  await emailQueue.add('order-confirmation', { orderId });
}

async function handlePaymentFailure(paymentData) {
  const orderId = paymentData.metadata.orderId;
  
  // Fail order
  await orderService.failOrder(orderId, {
    reason: 'Payment failed',
    paymentError: paymentData.last_payment_error
  });
  
  // Release inventory
  await inventoryReleaseQueue.add('release', { orderId });
}

async function handleRefund(refundData) {
  const orderId = refundData.metadata.orderId;
  
  // Mark order as refunded
  await orderService.markRefunded(orderId, true, {
    refundId: refundData.id,
    amount: refundData.amount
  });
  
  // Send refund notification
  await emailQueue.add('refund-processed', { orderId });
}
```

---

## Security Measures

### 1. Signature Verification

**Stripe:**
```javascript
stripe.webhooks.constructEvent(payload, signature, secret);
```

**Razorpay:**
```javascript
const expectedSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(payload))
  .digest('hex');
```

### 2. Idempotency

**Prevents duplicate processing:**
```javascript
// Check if event already processed
const processed = await WebhookLog.findOne({ eventId });
if (processed) {
  return res.status(200).json({ received: true, duplicate: true });
}

// Store event ID after processing
await WebhookLog.create({ eventId, processedAt: new Date() });
```

### 3. IP Whitelisting (Optional)

```javascript
const STRIPE_IPS = [
  '3.18.12.63',
  '3.130.192.231',
  '13.235.14.237',
  // ... more IPs
];

if (!STRIPE_IPS.includes(req.ip)) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

---

## Retry Logic

### Automatic Retries

**Queue Configuration:**
```javascript
{
  attempts: 5,              // Retry up to 5 times
  backoff: {
    type: 'exponential',
    delay: 2000             // 2s, 4s, 8s, 16s, 32s
  },
  removeOnComplete: true,
  removeOnFail: false       // Keep failed jobs for investigation
}
```

### Gateway-Side Retries

**Stripe:**
- Retries for 3 days
- Exponential backoff
- Stops after multiple 410 Gone responses

**Razorpay:**
- Retries for 2 days
- Configurable in dashboard
- Stops after 5xx errors

---

## Webhook Logging

### WebhookLog Schema

```javascript
{
  eventId: String (unique, indexed),
  gateway: String,              // 'stripe', 'razorpay'
  type: String,                 // Event type
  data: Object,                 // Webhook payload
  signature: String,            // Request signature
  ipAddress: String,
  processedAt: Date,
  success: Boolean,
  error: String,
  retryCount: Number,
  createdAt: Date
}
```

### Query Logs

```javascript
// Get recent webhooks
const recentWebhooks = await WebhookLog.find()
  .sort({ createdAt: -1 })
  .limit(100);

// Get failed webhooks
const failed = await WebhookLog.find({ success: false });

// Get duplicates
const duplicates = await WebhookLog.aggregate([
  { $group: { _id: '$eventId', count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
]);
```

---

## Testing Webhooks

### Local Development

**Use Stripe CLI:**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to localhost
stripe listen --forward-to localhost:8081/api/v1/payments/webhook/stripe

# Trigger test event
stripe trigger payment_intent.succeeded
```

**Use ngrok for Razorpay:**
```bash
# Expose local server
ngrok http 8081

# Use ngrok URL in Razorpay dashboard
https://abc123.ngrok.io/api/v1/payments/webhook/razorpay
```

---

### Test Webhooks in Postman

**Stripe Test Webhook:**
```json
POST /api/v1/payments/webhook/stripe
Headers:
  stripe-signature: [computed signature]
  
Body:
{
  "id": "evt_test_123",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_test_123",
      "amount": 2000,
      "currency": "inr",
      "metadata": {
        "orderId": "order_123"
      }
    }
  }
}
```

**Razorpay Test Webhook:**
```json
POST /api/v1/payments/webhook/razorpay
Headers:
  x-razorpay-signature: [computed HMAC]
  
Body:
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_test_123",
        "amount": 200000,
        "currency": "INR",
        "order_id": "order_test_123"
      }
    }
  }
}
```

---

## Monitoring & Alerts

### Key Metrics

- **Webhook Success Rate:** Should be > 99%
- **Processing Time:** Should be < 500ms (endpoint response)
- **Queue Depth:** Monitor webhook queue backlog
- **Failed Webhooks:** Alert if > 5 in 1 hour

### Datadog/Sentry Integration

```javascript
// Log webhook received
logger.info('Webhook received', {
  gateway: 'stripe',
  eventType: event.type,
  eventId: event.id
});

// Track processing time
const start = Date.now();
await processWebhook(event);
const duration = Date.now() - start;

metrics.histogram('webhook.processing.time', duration, {
  gateway: 'stripe',
  eventType: event.type
});
```

---

## Common Issues & Solutions

### Issue 1: Signature Verification Failed

**Cause:** Incorrect webhook secret or payload modification

**Solution:**
```javascript
// Ensure raw body is used (not parsed JSON)
app.post('/webhook', express.raw({ type: 'application/json' }), handler);

// Verify webhook secret matches
console.log('Using secret:', process.env.STRIPE_WEBHOOK_SECRET);
```

---

### Issue 2: Duplicate Webhooks

**Cause:** Gateway retries or network issues

**Solution:**
- Always check `eventId` before processing
- Return 200 OK for duplicates
- Log duplicate attempts

---

### Issue 3: Webhook Timeout

**Cause:** Slow processing in webhook handler

**Solution:**
- Return 200 OK immediately
- Queue processing asynchronously
- Process in background worker

---

### Issue 4: Lost Webhooks

**Cause:** Server downtime or network issues

**Solution:**
- Implement webhook reconciliation job
- Periodically poll payment gateway for order status
- Alert on missing webhook events

---

## Best Practices

### ✅ DO:
- Verify signatures on every webhook
- Return 200 OK quickly (< 3 seconds)
- Process webhooks asynchronously via queue
- Implement idempotency checks
- Log all webhook events
- Monitor webhook success rate
- Handle duplicate events gracefully

### ❌ DON'T:
- Don't process complex logic in webhook handler
- Don't trust webhook data without verification
- Don't throw errors without retry logic
- Don't skip logging
- Don't expose webhook URLs publicly without auth
- Don't ignore failed webhooks

---

## API Endpoints Reference

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/payments/webhook/stripe` | Stripe webhook receiver | Signature |
| POST | `/payments/webhook/razorpay` | Razorpay webhook receiver | Signature |
| GET | `/admin/webhooks/logs` | View webhook logs | Admin |
| POST | `/admin/webhooks/replay/:id` | Replay failed webhook | Admin |

---

## Environment Variables

```env
# Stripe
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Razorpay
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here

# Optional: IP Whitelist
WEBHOOK_IP_WHITELIST=3.18.12.63,3.130.192.231
```

---

## Related Documentation

- [Payment Flow](../payments/PAYMENT_FLOW.md) - Payment processing
- [Background Jobs](./BACKGROUND_JOBS.md) - Queue system
- [Order Lifecycle](../orders/ORDER_LIFECYCLE.md) - Order state changes
- [Observability](./OBSERVABILITY.md) - Logging and monitoring
