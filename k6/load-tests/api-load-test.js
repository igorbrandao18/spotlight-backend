import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');

// Test configuration - lighter load for general API testing
export const options = {
  stages: [
    { duration: '30s', target: 5 },    // Ramp up to 5 users
    { duration: '1m', target: 20 },     // Ramp up to 20 users
    { duration: '2m', target: 50 },     // Ramp up to 50 users
    { duration: '2m', target: 50 },     // Stay at 50 users
    { duration: '1m', target: 20 },     // Ramp down to 20 users
    { duration: '30s', target: 0 },     // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.05'], // Allow 5% error rate for general API
    errors: ['rate<0.05'],
  },
};

// Base URL
const BASE_URL = __ENV.API_URL || 'http://localhost:8080/api';

// Helper to get auth token
function getAuthToken() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  
  // Register
  const registerRes = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({
      name: `Load Test User ${random}`,
      email: `loadtest${timestamp}${random}@example.com`,
      password: 'SecurePass123',
      areaActivity: 'Testing',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (registerRes.status !== 201 && registerRes.status !== 200) {
    return null;
  }

  try {
    const body = JSON.parse(registerRes.body);
    return body.tokens?.accessToken || null;
  } catch (e) {
    return null;
  }
}

export default function () {
  // Get auth token
  const token = getAuthToken();
  
  if (!token) {
    errorRate.add(1);
    sleep(1);
    return;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Test 1: Get current user
  const meStart = Date.now();
  const meRes = http.get(`${BASE_URL}/users/me`, {
    headers,
    tags: { name: 'GetMe' },
  });
  apiDuration.add(Date.now() - meStart);
  
  check(meRes, {
    'GetMe status is 200': (r) => r.status === 200,
    'GetMe has user data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id && body.email;
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);

  sleep(1);

  // Test 2: Search users
  const searchStart = Date.now();
  const searchRes = http.get(`${BASE_URL}/users?search=test`, {
    headers,
    tags: { name: 'SearchUsers' },
  });
  apiDuration.add(Date.now() - searchStart);
  
  check(searchRes, {
    'SearchUsers status is 200': (r) => r.status === 200,
    'SearchUsers returns array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body);
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);

  sleep(1);

  // Test 3: Get posts
  const postsStart = Date.now();
  const postsRes = http.get(`${BASE_URL}/posts`, {
    headers,
    tags: { name: 'GetPosts' },
  });
  apiDuration.add(Date.now() - postsStart);
  
  check(postsRes, {
    'GetPosts status is 200': (r) => r.status === 200,
    'GetPosts returns array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body);
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);

  sleep(1);

  // Test 4: Get projects
  const projectsStart = Date.now();
  const projectsRes = http.get(`${BASE_URL}/projects/list`, {
    headers,
    tags: { name: 'GetProjects' },
  });
  apiDuration.add(Date.now() - projectsStart);
  
  check(projectsRes, {
    'GetProjects status is 200': (r) => r.status === 200,
    'GetProjects returns array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body);
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);

  sleep(1);
}

export function setup() {
  console.log('🚀 Starting API load test...');
  console.log(`📍 API URL: ${BASE_URL}`);
  console.log(`⏱️  Test duration: ~7 minutes`);
  console.log(`👥 Max concurrent users: 50`);
}

export function teardown() {
  console.log('🏁 API load test completed');
}

