# Background Jobs & Queue System

## Overview

Asynchronous job processing system using BullMQ and Redis for handling time-intensive operations, scheduled tasks, and event-driven workflows.

---

## Architecture

```
┌──────────┐     ┌────────┐     ┌──────────┐
│  Queue   │────→│ Redis  │────→│  Worker  │
│ Producer │     │ Queue  │     │ Consumer │
└──────────┘     └────────┘     └──────────┘
```

---

## Queue Types

### 1. Email Queue
**Purpose:** Send transactional emails asynchronously

**Jobs:**
- Order confirmation
- Shipping notifications  
- Password reset
- Welcome emails

**Worker:** `email.worker.js`  
**Concurrency:** 5  
**Retry:** 3 attempts, exponential backoff

### 2. Order Queue
**Purpose:** Order processing workflows

**Jobs:**
- Auto-cancel pending orders (1 hour timeout)
- Generate invoices
- Update order status
- Sync with ERP

**Worker:** `order.worker.js`  
**Concurrency:** 10  
**Retry:** 2 attempts

### 3. Payment Webhook Queue
**Purpose:** Process payment webhooks asynchronously

**Jobs:**
- Stripe webhook processing
- Razorpay webhook processing
- Payment reconciliation

**Worker:** `payment-webhook.worker.js`  
**Concurrency:** 20  
**Retry:** 5 attempts (with idempotency)

### 4. Payment Retry Queue
**Purpose:** Retry failed payments

**Jobs:**
- Retry payment capture
- Retry refunds

**Worker:** `payment-retry.worker.js`  
**Concurrency:** 3  
**Retry:** 3 attempts, 1-hour delay

### 5. Inventory Release Queue
**Purpose:** Release reserved inventory

**Jobs:**
- Auto-release on payment failure
- Auto-release on order cancellation

**Worker:** `inventoryRelease.worker.js`  
**Concurrency:** 8  
**Retry:** 3 attempts

### 6. Manual Review Queue
**Purpose:** Queue items needing manual review

**Jobs:**
- High-value order review (> ₹50,000)
- Suspicious payment patterns
- Return requests

**Worker:** `manualReview.worker.js`  
**Concurrency:** 1 (admin-driven)

---

## Job Lifecycle

```
┌─────────┐
│ Created │ (Job added to queue)
└────┬────┘
     │
     ├──[Worker Available]──→  ┌─────────┐
     │                         │ Active  │ (Worker processing)
     │                         └────┬────┘
     │                              │
     │                         [Success]
     │                              ↓
     │                         ┌───────────┐
     │                         │ Completed │
     │                         └───────────┘
     │
     ├──[Worker Busy]──→  ┌─────────┐
     │                    │ Waiting │ (In queue)
     │                    └─────────┘
     │
     └──[Error During Processing]──→   ┌────────┐
                                       │ Failed │
                                       └────┬───┘
                                            │
                                       [Has Retries]
                                            ↓
                                       ┌─────────┐
                                       │ Delayed │ (Retry after backoff)
                                       └─────────┘
```

---

## Creating Jobs

### Email Job Example

```javascript
const { emailQueue } = require('../queues/email.queue');

// Add job to queue
await emailQueue.add('send-order-confirmation', {
  to: user.email,
  subject: 'Order Confirmed',
  template: 'order_confirmation',
  data: {
    orderNumber: order.orderNumber,
    items: order.items,
    total: order.grandTotal
  }
}, {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000  // 2s, 4s, 8s
  },
  removeOnComplete: true,
  removeOnFail: false
});
```

### Delayed Job Example

```javascript
// Auto-cancel order after 1 hour
await orderQueue.add('auto-cancel', {
  orderId: order._id
}, {
  delay: 60 * 60 * 1000,  // 1 hour
  jobId: `cancel-${order._id}`  // Unique ID for cancellation
});

// Cancel the job if payment received
await orderQueue.remove(`cancel-${order._id}`);
```

---

## Worker Implementation

### Basic Worker Structure

```javascript
const { Worker } = require('bullmq');
const redis = require('../config/redis');

const emailWorker = new Worker('email-queue', async (job) => {
  const { to, subject, template, data } = job.data;
  
  try {
    // Process job
    await sendEmail({ to, subject, template, data });
    
    // Return result
    return { sent: true, messageId: '...' };
  } catch (error) {
    // Log error
    console.error('Email job failed:', error);
    
    // Throw to trigger retry
    throw error;
  }
}, {
  connection: redis,
  concurrency: 5,
  limiter: {
    max: 100,      // Max 100 jobs
    duration: 1000 // per second
  }
});

// Event listeners
emailWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});
```

---

## Retry Strategy

### Exponential Backoff

```javascript
{
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 1000  // 1s → 2s → 4s → 8s → 16s
  }
}
```

### Fixed Delay

```javascript
{
  attempts: 3,
  backoff: {
    type: 'fixed',
    delay: 5000  // 5s between each retry
  }
}
```

### Custom Backoff

```javascript
{
  attempts: 3,
  backoff: {
    type: 'custom'
  }
}

// In worker
worker.on('failed', async (job, err, prev) => {
  if (job.attemptsMade < job.opts.attempts) {
    const delay = job.attemptsMade * 60000;  // 1 min, 2 min, 3 min
    await job.retry('custom', delay);
  }
});
```

---

## Monitoring & Observability

### Queue Metrics

```javascript
const counts = await emailQueue.getJobCounts();
// {
//   waiting: 5,
//   active: 2,
//   completed: 100,
//   failed: 3,
//   delayed: 1
// }
```

### Failed Job Inspection

```javascript
const failed = await emailQueue.getFailed();
failed.forEach(job => {
  console.log(`Job ${job.id} failed:`, job.failedReason);
  console.log('Data:', job.data);
  console.log('Attempts:', job.attemptsMade);
});
```

### Job Progress Tracking

```javascript
// In worker
worker.on('progress', async (job) => {
  await job.updateProgress(50);  // 50% complete
});

// Check progress
const job = await emailQueue.getJob(jobId);
console.log(`Progress: ${job.progress}%`);
```

---

## Cleanup & Maintenance

### Auto-Delete Completed Jobs

```javascript
{
  removeOnComplete: {
    age: 86400,   // Remove after 24 hours
    count: 1000   // Keep max 1000 completed jobs
  }
}
```

### Manual Cleanup

```javascript
// Clean all completed jobs
await emailQueue.clean(0, 0, 'completed');

// Clean failed jobs older than 7 days
await emailQueue.clean(7 * 24 * 60 * 60 * 1000, 0, 'failed');
```

---

## Scheduled Jobs (Cron)

```javascript
await orderQueue.add('daily-report', {}, {
  repeat: {
    cron: '0 9 * * *'  // Daily at 9 AM
  }
});

await inventoryQueue.add('stock-sync', {}, {
  repeat: {
    every: 3600000  // Every hour
  }
});
```

---

## Best Practices

1. **Idempotency:** Ensure jobs can be retried safely
2. **Small Payloads:** Store large data in DB, reference by ID in job
3. **Timeouts:** Set job timeout to prevent hanging workers
4. **Dead Letter Queue:** Move permanently failed jobs to DLQ for manual review
5. **Monitoring:** Track queue depth, processing time, failure rate
6. **Graceful Shutdown:** Close workers cleanly on deployment

---

## Security

- Queue access restricted to backend only
- Redis authentication enabled
- Job data doesn't contain sensitive info (passwords, tokens)
- Rate limiting prevents queue flooding

---

## Performance Tuning

### Concurrency
- Adjust based on workload type (I/O vs CPU)
- Email: 5 workers (I/O bound)
- Payments: 20 workers (fast processing)
- Reports: 2 workers (CPU intensive)

### Redis Memory
- Set `maxmemory` limit
- Use `allkeys-lru` eviction policy
- Monitor memory usage

---

## Related Documentation

- [Email Workflow](./EMAIL_WORKFLOW.md)
- [Order Lifecycle](./ORDER_LIFECYCLE.md)
- [Payment Flow](./PAYMENT_FLOW.md)
- [Observability](./OBSERVABILITY.md)
