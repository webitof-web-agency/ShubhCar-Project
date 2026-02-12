import APP_CONFIG from '@/config/app.config';

const API_BASE = APP_CONFIG.api.baseUrl;

export const getPaymentMethods = async () => {
  const response = await fetch(`${API_BASE}/payments/methods`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to load payment methods');
  }
  return (await response.json()).data;
};

export const initiatePayment = async (accessToken, { orderId, gateway }) => {
  const response = await fetch(`${API_BASE}/payments/initiate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ orderId, gateway }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to initiate payment');
  }

  return (await response.json()).data;
};

export const getPaymentStatus = async (accessToken, paymentId) => {
  const response = await fetch(`${API_BASE}/payments/${paymentId}/status`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to fetch payment status');
  }

  return (await response.json()).data;
};

export const confirmPayment = async (accessToken, paymentId, transactionId = null) => {
  const body = transactionId ? { transactionId } : {};
  
  const response = await fetch(`${API_BASE}/payments/${paymentId}/confirm`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to confirm payment');
  }

  return (await response.json()).data;
};
