/**
 * Configuration for k6 load tests
 * 
 * Environment variables:
 * - BASE_URL: API base URL (e.g., http://localhost:3000)
 * - TEST_EMAIL: Test user email
 * - TEST_PASSWORD: Test user password
 */

export const config = {
  baseUrl: __ENV.BASE_URL || 'http://localhost:3000',
  testEmail: __ENV.TEST_EMAIL || 'loadtest@example.com',
  testPassword: __ENV.TEST_PASSWORD || 'LoadTest123!',
};

export function getApiUrl(path) {
  return `${config.baseUrl}/api${path}`;
}
