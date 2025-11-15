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

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '2m', target: 100 },   // Stay at 100 users
    { duration: '1m', target: 50 },     // Ramp down to 50 users
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests < 500ms, 99% < 1s
    http_req_failed: ['rate<0.01'],                 // Error rate < 1%
    errors: ['rate<0.01'],                           // Custom error rate < 1%
    auth_duration: ['p(95)<300'],                    // Auth operations < 300ms
    register_duration: ['p(95)<500'],                // Registration < 500ms
    login_duration: ['p(95)<300'],                   // Login < 300ms
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
  const success = check(res, {
    [`${operation} status is 200 or 201`]: (r) => r.status === 200 || r.status === 201,
    [`${operation} has response body`]: (r) => r.body && r.body.length > 0,
    [`${operation} response time < 1s`]: (r) => r.timings.duration < 1000,
  });

  if (!success) {
    errorRate.add(1);
    authFailures.add(1);
  } else {
    authSuccess.add(1);
  }

  return success;
}

// Main test function
export default function () {
  // Test 1: Registration
  const registerData = generateUserData();
  const registerStart = Date.now();
  const registerRes = http.post(
    `${API_URL}/register`,
    JSON.stringify(registerData),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Register' },
    }
  );
  registerDuration.add(Date.now() - registerStart);
  
  const registerSuccess = checkResponse(registerRes, 'Register');
  
  if (!registerSuccess) {
    sleep(1);
    return;
  }

  let accessToken = null;
  let refreshToken = null;

  try {
    const registerBody = JSON.parse(registerRes.body);
    if (registerBody.tokens) {
      accessToken = registerBody.tokens.accessToken;
      refreshToken = registerBody.tokens.refreshToken;
    }
  } catch (e) {
    errorRate.add(1);
    sleep(1);
    return;
  }

  sleep(1);

  // Test 2: Login (with same credentials)
  const loginStart = Date.now();
  const loginRes = http.post(
    `${API_URL}/login`,
    JSON.stringify({
      email: registerData.email,
      password: registerData.password,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'Login' },
    }
  );
  loginDuration.add(Date.now() - loginStart);
  
  checkResponse(loginRes, 'Login');

  try {
    const loginBody = JSON.parse(loginRes.body);
    if (loginBody.tokens) {
      accessToken = loginBody.tokens.accessToken;
      refreshToken = loginBody.tokens.refreshToken;
    }
  } catch (e) {
    // Continue even if parsing fails
  }

  sleep(1);

  // Test 3: Refresh Token
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
      // Continue even if parsing fails
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

  sleep(1);
}

// Setup function - runs once before all VUs
export function setup() {
  console.log('🚀 Starting load test...');
  console.log(`📍 API URL: ${API_URL}`);
  console.log(`⏱️  Test duration: ~7 minutes`);
  console.log(`👥 Max concurrent users: 100`);
  
  // Optional: Create a test user for setup
  const testUser = generateUserData();
  const res = http.post(
    `${API_URL}/register`,
    JSON.stringify(testUser),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
  
  if (res.status === 201 || res.status === 200) {
    console.log('✅ Setup user created successfully');
    return { testUser };
  } else {
    console.log('⚠️  Setup user creation failed, continuing anyway');
    return { testUser: null };
  }
}

// Teardown function - runs once after all VUs
export function teardown(data) {
  console.log('🏁 Load test completed');
  console.log('📊 Check the summary above for detailed metrics');
}

