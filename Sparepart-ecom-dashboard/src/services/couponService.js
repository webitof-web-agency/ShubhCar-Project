import { API_BASE_URL } from '@/helpers/apiBase';

/**
 * Fetch all coupons
 */
export const getCoupons = async (token) => {
  const response = await fetch(`${API_BASE_URL}/coupons`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch coupons');
  }

  return response.json();
};

/**
 * Get single coupon by ID
 */
export const getCoupon = async (id, token) => {
  const response = await fetch(`${API_BASE_URL}/coupons/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch coupon');
  }

  return response.json();
};

/**
 * Create new coupon
 */
export const createCoupon = async (couponData, token) => {
  const response = await fetch(`${API_BASE_URL}/coupons`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(couponData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create coupon');
  }

  return response.json();
};

/**
 * Update existing coupon
 */
export const updateCoupon = async (id, couponData, token) => {
  const response = await fetch(`${API_BASE_URL}/coupons/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(couponData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update coupon');
  }

  return response.json();
};

/**
 * Delete coupon
 */
export const deleteCoupon = async (id, token) => {
  const response = await fetch(`${API_BASE_URL}/coupons/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete coupon');
  }

  return response.json();
};

export default {
  getCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
};
