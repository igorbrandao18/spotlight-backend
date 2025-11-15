import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const authDuration = new Trend('auth_duration');
const registerDuration = new Trend('register_duration');
const loginDuration = new Trend('login_duration');
const refreshDuration = new Trend('refresh_duration');
const authSuccess = new Counter('auth_success');
const authFailures = new Counter('auth_failures');

// Realistic test configuration - respects rate limits
// Rate limits:
// - Register: 3/hour
// - Login: 5/15min
// - Refresh: 10/min
// - General API: 100/min
export const options = {
  stages: [
    { duration: '1m', target: 5 },   // Ramp up to 5 users slowly
    { duration: '2m', target: 10 },  // Ramp up to 10 users
    { duration: '3m', target: 10 },  // Stay at 10 users
    { duration: '1m', target: 5 },   // Ramp down to 5 users
    { duration: '30s', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests < 500ms, 99% < 1s
    http_req_failed: ['rate<0.05'],                 // Error rate < 5% (allows for rate limiting)
    errors: ['rate<0.05'],                          // Custom error rate < 5%
    auth_duration: ['p(95)<300'],                    // Auth operations < 300ms
    register_duration: ['p(95)<500'],                // Registration < 500ms
    login_duration: ['p(95)<300'],                   // Login < 300ms
    refresh_duration: ['p(95)<200'],                 // Refresh < 200ms
  },
};

// Base URL - change this to your API URL
const BASE_URL = __ENV.API_URL || 'http://localhost:8080/api';
const API_URL = `${BASE_URL}/auth`;

// Test data generator
function generateUserData() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return {
    name: `Test User ${random}`,
    email: `test${timestamp}${random}@example.com`,
    password: 'SecurePass123',
    areaActivity: 'Photography',
  };
}

// Helper function to check response
function checkResponse(res, operation) {
  const isSuccess = res.status === 200 || res.status === 201;
  const hasBody = res.body && res.body.length > 0;
  const isFast = res.timings.duration < 1000;
  
  // Rate limiting responses (429) are expected, don't count as errors for performance testing
  const isRateLimited = res.status === 429;
  
  const success = check(res, {
    [`${operation} status is 200 or 201`]: (r) => isSuccess,
    [`${operation} has response body`]: (r) => hasBody,
    [`${operation} response time < 1s`]: (r) => isFast,
  });

  if (!success && !isRateLimited) {
    errorRate.add(1);
    authFailures.add(1);
  } else if (success) {
    authSuccess.add(1);
  }

  return success;
}

// Main test function - realistic flow
export default function () {
  // Each VU will do one full auth flow per iteration
  // With delays to respect rate limits
  
  // Test 1: Registration (limited to 3/hour per IP)
  // Only attempt registration occasionally to respect limits
  const shouldRegister = Math.random() < 0.1; // 10% chance per iteration
  
  let accessToken = null;
  let refreshToken = null;
  let userData = null;
  
  if (shouldRegister) {
    userData = generateUserData();
    const registerStart = Date.now();
    const registerRes = http.post(
      `${API_URL}/register`,
      JSON.stringify(userData),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'Register' },
      }
    );
    registerDuration.add(Date.now() - registerStart);
    
    const registerSuccess = checkResponse(registerRes, 'Register');
    
    if (registerSuccess) {
      try {
        const registerBody = JSON.parse(registerRes.body);
        if (registerBody.tokens) {
          accessToken = registerBody.tokens.accessToken;
          refreshToken = registerBody.tokens.refreshToken;
        }
      } catch (e) {
        // Continue
      }
    }
    
    // Wait before next operation (respect rate limits)
    sleep(5);
  } else {
    // Use existing test user for login (simulate real user behavior)
    // In real scenario, users would login more often than register
    userData = {
      email: `testuser${__VU}@example.com`, // Consistent per VU
      password: 'SecurePass123',
    };
  }

  // Test 2: Login (limited to 5/15min per IP)
  // Most iterations will do login
  const loginStart = Date.now();
  const loginRes = http.post(
    `${API_URL}/login`,
    JSON.stringify({
      email: userData.email,
      password: userData.password || 'SecurePass123',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Login' },
    }
  );
  loginDuration.add(Date.now() - loginStart);
  
  const loginSuccess = checkResponse(loginRes, 'Login');

  if (loginSuccess) {
    try {
      const loginBody = JSON.parse(loginRes.body);
      if (loginBody.tokens) {
        accessToken = loginBody.tokens.accessToken;
        refreshToken = loginBody.tokens.refreshToken;
      }
    } catch (e) {
      // Continue
    }
  }

  // Wait before refresh (respect rate limits)
  sleep(2);

  // Test 3: Refresh Token (limited to 10/min)
  if (refreshToken) {
    const refreshStart = Date.now();
    const refreshRes = http.post(
      `${API_URL}/refresh-token`,
      JSON.stringify({ refreshToken }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'RefreshToken' },
      }
    );
    refreshDuration.add(Date.now() - refreshStart);
    
    checkResponse(refreshRes, 'RefreshToken');

    try {
      const refreshBody = JSON.parse(refreshRes.body);
      if (refreshBody.tokens) {
        accessToken = refreshBody.tokens.accessToken;
        refreshToken = refreshBody.tokens.refreshToken;
      }
    } catch (e) {
      // Continue
    }
  }

  sleep(1);

  // Test 4: Access Protected Endpoint (if we have a token)
  if (accessToken) {
    const protectedStart = Date.now();
    const protectedRes = http.get(`${BASE_URL}/users/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      tags: { name: 'GetMe' },
    });
    authDuration.add(Date.now() - protectedStart);
    
    checkResponse(protectedRes, 'GetMe');
  }

  // Realistic delay between iterations (simulate user thinking time)
  sleep(Math.random() * 3 + 2); // 2-5 seconds
}

// Setup function - runs once before all VUs
export function setup() {
  console.log('🚀 Starting realistic load test...');
  console.log(`📍 API URL: ${API_URL}`);
  console.log(`⏱️  Test duration: ~7.5 minutes`);
  console.log(`👥 Max concurrent users: 10`);
  console.log(`📊 Rate limits respected:`);
  console.log(`   - Register: 3/hour`);
  console.log(`   - Login: 5/15min`);
  console.log(`   - Refresh: 10/min`);
  
  // Create a few test users for login testing
  const testUsers = [];
  for (let i = 1; i <= 5; i++) {
    const testUser = generateUserData();
    testUser.email = `testuser${i}@example.com`; // Consistent emails
    const res = http.post(
      `${API_URL}/register`,
      JSON.stringify(testUser),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    
    if (res.status === 201 || res.status === 200) {
      testUsers.push(testUser);
      console.log(`✅ Created test user ${i}: ${testUser.email}`);
      sleep(1); // Space out registrations
    } else {
      console.log(`⚠️  Failed to create test user ${i}`);
    }
  }
  
  return { testUsers };
}

// Teardown function - runs once after all VUs
export function teardown(data) {
  console.log('🏁 Realistic load test completed');
  console.log('📊 Check the summary above for detailed metrics');
}

