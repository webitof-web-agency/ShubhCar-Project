const { randomUUID } = require('crypto');
const stripeService = require('../../services/stripe.service');
const razorpayService = require('../../services/razorpay.service');
const { paymentWebhookQueue } = require('../../queues/paymentWebhook.queue');
const { redis } = require('../../config/redis');
const logger = require('../../config/logger');

const WEBHOOK_TTL_SECONDS = 60 * 60 * 24; // 24h dedupe window

const reserveEvent = async (gateway, eventId, requestId) => {
  if (!eventId) return false;
  const key = `payment-webhook:${gateway}:${eventId}`;
  try {
    const result = await redis.set(key, requestId || '1', {
      NX: true,
      EX: WEBHOOK_TTL_SECONDS,
    });
    return result === 'OK';
  } catch (err) {
    logger.error('Webhook dedupe reservation failed', {
      gateway,
      eventId,
      error: err.message,
    });
    return true; // fail-open to avoid dropping gateway retries
  }
};

class WebhookController {
  /* =====================
     STRIPE WEBHOOK
  ===================== */
  async stripe(req, res) {
    let event;
    const requestId = randomUUID();

    try {
      event = stripeService.verifyWebhook(
        req.headers['stripe-signature'],
        req.body,
      );
    } catch (err) {
      return res.status(400).send('Invalid signature');
    }

    const isReserved = await reserveEvent('stripe', event.id, requestId);
    if (!isReserved) {
      return res.sendStatus(200);
    }

    try {
      await paymentWebhookQueue.add(
        'process',
        {
          gateway: 'stripe',
          eventId: event.id,
          requestId,
          payload: event,
        },
        {
          jobId: `stripe:${event.id}`,
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    } catch (err) {
      // IMPORTANT: force retry by gateway
      return res.status(500).send('Queue unavailable');
    }

    return res.sendStatus(200);
  }

  /* =====================
     RAZORPAY WEBHOOK
  ===================== */
  async razorpay(req, res) {
    const requestId = randomUUID();

    try {
      razorpayService.verifyWebhook(
        req.headers['x-razorpay-signature'],
        JSON.stringify(req.body),
      );
    } catch (err) {
      return res.status(400).send('Invalid signature');
    }

    const eventId = req.body?.payload?.payment?.entity?.id;
    if (!eventId) {
      return res.status(400).send('Event id missing');
    }

    const isReserved = await reserveEvent('razorpay', eventId, requestId);
    if (!isReserved) {
      return res.sendStatus(200);
    }

    try {
      await paymentWebhookQueue.add(
        'process',
        {
          gateway: 'razorpay',
          eventId,
          requestId,
          payload: req.body,
        },
        {
          jobId: `razorpay:${eventId}`,
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    } catch (err) {
      return res.status(500).send('Queue unavailable');
    }

    return res.sendStatus(200);
  }
}

module.exports = new WebhookController();
