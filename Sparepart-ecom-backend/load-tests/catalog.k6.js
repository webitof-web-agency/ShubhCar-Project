import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 20,
  duration: '1m',
  thresholds: {
    http_req_duration: ['p(95)<700', 'p(99)<1200'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';
const CATEGORY_ID = __ENV.CATEGORY_ID;
const PRODUCT_SLUG = __ENV.PRODUCT_SLUG || 'sample-slug';

export default function () {
  const categoriesRes = http.get(`${BASE_URL}/v1/categories`);
  check(categoriesRes, { 'categories ok': (r) => r.status === 200 });

  const categories = categoriesRes.json() || {};
  const categoryId =
    CATEGORY_ID ||
    (categories.data && categories.data[0] && (categories.data[0].id || categories.data[0]._id));

  if (categoryId) {
    const productsByCategory = http.get(
      `${BASE_URL}/v1/products?categoryId=${encodeURIComponent(categoryId)}`,
    );
    check(productsByCategory, { 'category products ok': (r) => r.status === 200 });
  }

  const productRes = http.get(`${BASE_URL}/v1/products/${PRODUCT_SLUG}`);
  check(productRes, { 'product by slug ok': (r) => r.status === 200 });

  sleep(1);
}
