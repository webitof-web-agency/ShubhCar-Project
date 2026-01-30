import http from 'k6/http';
import { check } from 'k6';
import { config, getApiUrl } from './config.js';

/**
 * Register a new user
 */
export function register(email, password) {
  const payload = JSON.stringify({
    firstName: 'Load',
    lastName: 'Test',
    email: email,
    password: password,
    phone: '1234567890',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.post(getApiUrl('/auth/register'), payload, params);
  
  const success = check(response, {
    'registration successful': (r) => r.status === 201 || r.status === 400, // 400 if already exists
  });

  if (response.status === 201) {
    const body = JSON.parse(response.body);
    return {
      success: true,
      token: body.data.token,
      user: body.data.user,
    };
  }

  return { success: false };
}

/**
 * Login and get JWT token
 */
export function login(email, password) {
  const payload = JSON.stringify({
    email: email || config.testEmail,
    password: password || config.testPassword,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.post(getApiUrl('/auth/login'), payload, params);
  
  const success = check(response, {
    'login successful': (r) => r.status === 200,
    'login returns token': (r) => {
      if (r.status === 200) {
        const body = JSON.parse(r.body);
        return body.data && body.data.token;
      }
      return false;
    },
  });

  if (success && response.status === 200) {
    const body = JSON.parse(response.body);
    return {
      success: true,
      token: body.data.token,
      user: body.data.user,
    };
  }

  return { success: false, error: response.body };
}

/**
 * Get authorization headers with JWT
 */
export function getAuthHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Setup test user (register if needed, then login)
 */
export function setupTestUser() {
  const email = `loadtest-${__VU}-${Date.now()}@example.com`;
  const password = 'LoadTest123!';

  // Try to register (might already exist)
  register(email, password);

  // Login
  return login(email, password);
}
