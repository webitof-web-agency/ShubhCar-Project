import http from 'k6/http';
import { check, sleep } from 'k6';

// Run against staging/test data only; payment gateway should point to test/mocked credentials.

export const options = {
  vus: 10,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<1200', 'p(99)<2000'],
    http_req_failed: ['rate<0.005'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
const PAYMENT_GATEWAY = __ENV.PAYMENT_GATEWAY || 'stripe';

const HEADERS = {
  'Content-Type': 'application/json',
  ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
};

export default function () {
  const cartPayload = {
    items: [
      {
        productVariantId: __ENV.PRODUCT_VARIANT_ID || 'variant-test',
        quantity: Number(__ENV.PRODUCT_QUANTITY || 1),
      },
    ],
  };

  const cartRes = http.post(`${BASE_URL}/v1/cart`, JSON.stringify(cartPayload), {
    headers: HEADERS,
  });
  check(cartRes, { 'cart created': (r) => r.status === 200 || r.status === 201 });

  const orderPayload = {
    shippingAddressId: __ENV.SHIPPING_ADDRESS_ID || 'address-test',
    billingAddressId: __ENV.BILLING_ADDRESS_ID || 'address-test',
    paymentMethod: PAYMENT_GATEWAY,
    taxPercent: Number(__ENV.TAX_PERCENT || 0),
  };

  const orderRes = http.post(`${BASE_URL}/v1/orders`, JSON.stringify(orderPayload), {
    headers: HEADERS,
  });
  check(orderRes, { 'order created': (r) => r.status === 200 || r.status === 201 });

  const orderBody = orderRes.json() || {};
  const orderId = orderBody.data && (orderBody.data._id || orderBody.data.id);

  if (orderId) {
    const paymentRes = http.post(
      `${BASE_URL}/v1/payments/initiate`,
      JSON.stringify({ orderId, gateway: PAYMENT_GATEWAY }),
      { headers: HEADERS },
    );
    check(paymentRes, {
      'payment intent created': (r) => r.status === 200 || r.status === 201 || r.status === 409,
    });
  }

  sleep(1);
}
