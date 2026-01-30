/**
 * Payment webhooks must be idempotent and fail-safe; these tests ensure dedupe + queueing logic.
 */
jest.mock('../../modules/payments/webhooks.controller', () => jest.requireActual('../../modules/payments/webhooks.controller'));
jest.mock('../../services/stripe.service', () => ({
  verifyWebhook: jest.fn(),
}));
jest.mock('../../services/razorpay.service', () => ({
  verifyWebhook: jest.fn(),
}));
jest.mock('../../queues/paymentWebhook.queue', () => ({
  paymentWebhookQueue: { add: jest.fn() },
}));
jest.mock('../../config/redis', () => {
  const store = new Map();
  return {
    redis: {
      set: jest.fn((key, value, opts) => {
        if (opts?.NX && store.has(key)) return Promise.resolve(null);
        store.set(key, value);
        return Promise.resolve('OK');
      }),
    },
  };
});

const request = require('supertest');
const app = require('../../app');
const stripeService = require('../../services/stripe.service');
const razorpayService = require('../../services/razorpay.service');
const { paymentWebhookQueue } = require('../../queues/paymentWebhook.queue');

describe('Payment webhooks idempotency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('dedupes stripe events and enqueues processing', async () => {
    const fakeEvent = { id: 'evt_1', type: 'payment_intent.succeeded' };
    stripeService.verifyWebhook.mockReturnValue(fakeEvent);

    const res = await request(app)
      .post('/api/v1/payments/webhook/stripe')
      .set('stripe-signature', 'sig')
      .send(fakeEvent);

    expect(res.status).toBe(200);
    expect(paymentWebhookQueue.add).toHaveBeenCalledWith(
      'process',
      expect.objectContaining({
        gateway: 'stripe',
        eventId: 'evt_1',
        payload: fakeEvent,
      }),
      expect.objectContaining({ jobId: 'stripe:evt_1' }),
    );

    // second delivery should be ignored
    const res2 = await request(app)
      .post('/api/v1/payments/webhook/stripe')
      .set('stripe-signature', 'sig')
      .send(fakeEvent);

    expect(res2.status).toBe(200);
    expect(paymentWebhookQueue.add).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid razorpay signatures and accepts valid event once', async () => {
    razorpayService.verifyWebhook.mockImplementationOnce(() => {
      throw new Error('bad sig');
    });

    const badRes = await request(app)
      .post('/api/v1/payments/webhook/razorpay')
      .set('x-razorpay-signature', 'bad')
      .send({ payload: { payment: { entity: { id: 'pay_1' } } } });
    expect(badRes.status).toBe(400);

    razorpayService.verifyWebhook.mockReturnValue(true);
    const payload = { payload: { payment: { entity: { id: 'pay_1' } } } };

    const okRes = await request(app)
      .post('/api/v1/payments/webhook/razorpay')
      .set('x-razorpay-signature', 'sig')
      .send(payload);

    expect(okRes.status).toBe(200);
    expect(paymentWebhookQueue.add).toHaveBeenCalledWith(
      'process',
      expect.objectContaining({
        gateway: 'razorpay',
        eventId: 'pay_1',
        payload,
      }),
      expect.objectContaining({ jobId: 'razorpay:pay_1' }),
    );

    const duplicateRes = await request(app)
      .post('/api/v1/payments/webhook/razorpay')
      .set('x-razorpay-signature', 'sig')
      .send(payload);
    expect(duplicateRes.status).toBe(200);
    expect(paymentWebhookQueue.add).toHaveBeenCalledTimes(1);
  });
});
