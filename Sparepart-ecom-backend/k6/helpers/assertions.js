import { check } from 'k6';

/**
 * Common assertion helpers for k6 tests
 */

export function assertSuccess(response, name = 'request') {
  return check(response, {
    [`${name}: status is 2xx`]: (r) => r.status >= 200 && r.status < 300,
    [`${name}: has success=true`]: (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch {
        return false;
      }
    },
  });
}

export function assertResponseTime(response, maxMs, name = 'request') {
  return check(response, {
    [`${name}: response time < ${maxMs}ms`]: (r) => r.timings.duration < maxMs,
  });
}

export function assertHasField(response, fieldPath, name = 'response') {
  return check(response, {
    [`${name}: has field ${fieldPath}`]: (r) => {
      try {
        const body = JSON.parse(r.body);
        const fields = fieldPath.split('.');
        let value = body;
        for (const field of fields) {
          value = value[field];
          if (value === undefined) return false;
        }
        return true;
      } catch {
        return false;
      }
    },
  });
}

export function assertErrorStatus(response, expectedStatus = 400) {
  return check(response, {
    [`error: status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    'error: has success=false': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === false;
      } catch {
        return false;
      }
    },
  });
}

export function assertRateLimit(response) {
  return check(response, {
    'rate limit: status is 429': (r) => r.status === 429,
    'rate limit: has error message': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.message && body.message.toLowerCase().includes('rate');
      } catch {
        return false;
      }
    },
  });
}
