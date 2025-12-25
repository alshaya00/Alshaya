/**
 * K6 Load Testing Configuration
 * Performance and stress testing for Al-Shaye Family Tree API
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

// Test configuration
export const options = {
  // Load test scenarios
  scenarios: {
    // Smoke test - quick verification
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      gracefulStop: '5s',
      tags: { test_type: 'smoke' },
    },

    // Load test - typical load
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '5m', target: 50 },   // Stay at 50 users
        { duration: '2m', target: 100 },  // Ramp up to 100 users
        { duration: '5m', target: 100 },  // Stay at 100 users
        { duration: '2m', target: 0 },    // Ramp down
      ],
      gracefulStop: '30s',
      tags: { test_type: 'load' },
      startTime: '35s', // Start after smoke test
    },

    // Stress test - beyond normal capacity
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },  // Ramp to normal
        { duration: '3m', target: 200 },  // Push beyond
        { duration: '3m', target: 300 },  // Breaking point
        { duration: '2m', target: 0 },    // Recovery
      ],
      gracefulStop: '30s',
      tags: { test_type: 'stress' },
      startTime: '17m', // Start after load test
    },

    // Spike test - sudden traffic surge
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },   // Normal load
        { duration: '10s', target: 500 },  // Spike!
        { duration: '1m', target: 500 },   // Maintain spike
        { duration: '30s', target: 10 },   // Return to normal
        { duration: '1m', target: 0 },     // Wind down
      ],
      gracefulStop: '30s',
      tags: { test_type: 'spike' },
      startTime: '28m', // Start after stress test
    },
  },

  // Thresholds for pass/fail
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],  // 95% under 500ms, 99% under 1s
    http_req_failed: ['rate<0.01'],                   // Less than 1% errors
    errors: ['rate<0.05'],                            // Less than 5% custom errors
    api_duration: ['p(95)<400'],                      // API specific threshold
  },
};

// Base URL from environment or default
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

// Test data
const testCredentials = {
  email: __ENV.TEST_EMAIL || 'testuser@test.com',
  password: __ENV.TEST_PASSWORD || 'TestPassword123',
};

// Helper function to make authenticated requests
function authenticatedRequest(token, method, url, body = null) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  const startTime = Date.now();
  let response;

  switch (method) {
    case 'GET':
      response = http.get(url, params);
      break;
    case 'POST':
      response = http.post(url, JSON.stringify(body), params);
      break;
    case 'PUT':
      response = http.put(url, JSON.stringify(body), params);
      break;
    case 'DELETE':
      response = http.del(url, params);
      break;
    default:
      response = http.get(url, params);
  }

  apiDuration.add(Date.now() - startTime);
  return response;
}

// Main test function
export default function () {
  let authToken = null;

  // Group: Authentication
  group('Authentication', () => {
    // Login
    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify(testCredentials),
      { headers: { 'Content-Type': 'application/json' } }
    );

    const loginSuccess = check(loginRes, {
      'login status is 200': (r) => r.status === 200,
      'login has token': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.token !== undefined;
        } catch {
          return false;
        }
      },
    });

    if (loginSuccess) {
      try {
        const body = JSON.parse(loginRes.body);
        authToken = body.token;
        successfulRequests.add(1);
      } catch {
        failedRequests.add(1);
        errorRate.add(1);
      }
    } else {
      failedRequests.add(1);
      errorRate.add(1);
    }

    sleep(0.5);
  });

  // Skip remaining tests if authentication failed
  if (!authToken) {
    console.log('Authentication failed, skipping remaining tests');
    return;
  }

  // Group: Family Members API
  group('Family Members API', () => {
    // Get all members
    const membersRes = authenticatedRequest(authToken, 'GET', `${BASE_URL}/api/members`);

    const membersSuccess = check(membersRes, {
      'members status is 200': (r) => r.status === 200,
      'members returns array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.members) || body.members !== undefined;
        } catch {
          return false;
        }
      },
    });

    if (membersSuccess) {
      successfulRequests.add(1);
    } else {
      failedRequests.add(1);
      errorRate.add(1);
    }

    sleep(0.3);

    // Get members with pagination
    const paginatedRes = authenticatedRequest(
      authToken,
      'GET',
      `${BASE_URL}/api/members?page=1&limit=10`
    );

    check(paginatedRes, {
      'paginated members status is 200': (r) => r.status === 200,
    });

    sleep(0.3);

    // Search members
    const searchRes = authenticatedRequest(
      authToken,
      'GET',
      `${BASE_URL}/api/members?search=محمد`
    );

    check(searchRes, {
      'search status is 200': (r) => r.status === 200,
    });

    sleep(0.3);
  });

  // Group: Family Tree API
  group('Family Tree API', () => {
    // Get tree data
    const treeRes = authenticatedRequest(authToken, 'GET', `${BASE_URL}/api/tree`);

    const treeSuccess = check(treeRes, {
      'tree status is 200': (r) => r.status === 200,
      'tree has data': (r) => r.body.length > 0,
    });

    if (treeSuccess) {
      successfulRequests.add(1);
    } else {
      failedRequests.add(1);
      errorRate.add(1);
    }

    sleep(0.5);

    // Get generations
    const generationsRes = authenticatedRequest(
      authToken,
      'GET',
      `${BASE_URL}/api/tree/generations`
    );

    check(generationsRes, {
      'generations status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    });

    sleep(0.3);
  });

  // Group: User Profile API
  group('User Profile API', () => {
    // Get current user
    const meRes = authenticatedRequest(authToken, 'GET', `${BASE_URL}/api/auth/me`);

    check(meRes, {
      'me status is 200': (r) => r.status === 200,
      'me has user data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.user !== undefined || body.id !== undefined;
        } catch {
          return false;
        }
      },
    });

    sleep(0.3);
  });

  // Group: Broadcasts API
  group('Broadcasts API', () => {
    // Get broadcasts
    const broadcastsRes = authenticatedRequest(
      authToken,
      'GET',
      `${BASE_URL}/api/broadcasts`
    );

    check(broadcastsRes, {
      'broadcasts status is 200': (r) => r.status === 200,
    });

    sleep(0.3);
  });

  // Group: Statistics API
  group('Statistics API', () => {
    // Get stats
    const statsRes = authenticatedRequest(authToken, 'GET', `${BASE_URL}/api/stats`);

    check(statsRes, {
      'stats status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    });

    sleep(0.3);
  });

  // Think time between iterations
  sleep(1);
}

// Setup function - runs once before tests
export function setup() {
  console.log('Starting load test against:', BASE_URL);

  // Verify server is accessible
  const healthCheck = http.get(`${BASE_URL}/api/health`);

  if (healthCheck.status !== 200) {
    console.warn('Health check failed, server may not be fully ready');
  }

  return { startTime: Date.now() };
}

// Teardown function - runs once after tests
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration.toFixed(2)} seconds`);
}

// Handle results
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './k6/results/summary.json': JSON.stringify(data),
  };
}

// Text summary helper (built-in in k6)
function textSummary(data, options) {
  const indent = options.indent || '  ';
  const lines = [];

  lines.push('');
  lines.push('='.repeat(60));
  lines.push('LOAD TEST SUMMARY');
  lines.push('='.repeat(60));

  // Add metrics
  if (data.metrics) {
    for (const [name, metric] of Object.entries(data.metrics)) {
      if (metric.values) {
        lines.push(`${indent}${name}:`);
        for (const [key, value] of Object.entries(metric.values)) {
          lines.push(`${indent}${indent}${key}: ${value}`);
        }
      }
    }
  }

  lines.push('='.repeat(60));

  return lines.join('\n');
}
