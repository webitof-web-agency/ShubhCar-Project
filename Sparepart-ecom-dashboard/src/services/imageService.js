import { API_BASE_URL } from '@/helpers/apiBase';

/**
 * Upload images for a product
 */
export const uploadProductImages = async (productId, files, token) => {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append('images', file);
  });

  const response = await fetch(`${API_BASE_URL}/products/${productId}/images`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to upload images');
  }

  return response.json();
};

/**
 * Delete a product image
 */
export const deleteProductImage = async (imageId, token) => {
  const response = await fetch(`${API_BASE_URL}/products/images/${imageId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete image');
  }

  return response.json();
};

/**
 * Upload images for a variant
 */
export const uploadVariantImages = async (variantId, files, token) => {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append('images', file);
  });

  const response = await fetch(`${API_BASE_URL}/product-variants/${variantId}/images`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to upload images');
  }

  return response.json();
};

/**
 * Delete a variant image
 */
export const deleteVariantImage = async (variantId, index, token) => {
  const response = await fetch(`${API_BASE_URL}/product-variants/${variantId}/images/${index}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete image');
  }

  return response.json();
};

export default {
  uploadProductImages,
  deleteProductImage,
  uploadVariantImages,
  deleteVariantImage,
};
