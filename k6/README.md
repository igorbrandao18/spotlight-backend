# K6 Load Testing

## 📋 Overview

This directory contains load tests for the Spotlight Backend API using [k6](https://k6.io/).

## 🚀 Installation

### macOS
```bash
brew install k6
```

### Linux
```bash
# Download and install
wget https://github.com/grafana/k6/releases/download/v0.48.0/k6-v0.48.0-linux-amd64.tar.gz
tar xzvf k6-v0.48.0-linux-amd64.tar.gz
sudo mv k6-v0.48.0-linux-amd64/k6 /usr/local/bin/
```

### Windows
```bash
# Using Chocolatey
choco install k6

# Or download from: https://github.com/grafana/k6/releases
```

### Verify Installation
```bash
k6 version
```

## 📁 Test Files

### `auth-load-test.js`
Comprehensive load test for authentication endpoints:
- Registration
- Login
- Refresh Token
- Protected endpoints

**Load Profile:**
- Ramp up: 0 → 10 → 50 → 100 users over 3.5 minutes
- Sustained: 100 concurrent users for 2 minutes
- Ramp down: 100 → 50 → 0 users over 1.5 minutes
- **Total duration: ~7 minutes**

**Thresholds:**
- 95% of requests < 500ms
- 99% of requests < 1s
- Error rate < 1%

### `api-load-test.js`
General API load test:
- User endpoints
- Posts endpoints
- Projects endpoints
- Search endpoints

**Load Profile:**
- Ramp up: 0 → 5 → 20 → 50 users over 3.5 minutes
- Sustained: 50 concurrent users for 2 minutes
- Ramp down: 50 → 20 → 0 users over 1.5 minutes
- **Total duration: ~7 minutes**

## 🎯 Running Tests

### Auth Load Test
```bash
# Local development
k6 run k6/load-tests/auth-load-test.js

# Production (set API_URL)
API_URL=https://spotlight.brandaodeveloper.com.br/api k6 run k6/load-tests/auth-load-test.js

# With custom options
k6 run --vus 50 --duration 5m k6/load-tests/auth-load-test.js
```

### API Load Test
```bash
# Local development
k6 run k6/load-tests/api-load-test.js

# Production
API_URL=https://spotlight.brandaodeveloper.com.br/api k6 run k6/load-tests/api-load-test.js
```

## 📊 Understanding Results

### Key Metrics

**HTTP Metrics:**
- `http_req_duration` - Request duration (p95, p99)
- `http_req_failed` - Failed request rate
- `http_reqs` - Total requests per second

**Custom Metrics:**
- `auth_duration` - Authentication operations duration
- `register_duration` - Registration duration
- `login_duration` - Login duration
- `refresh_duration` - Token refresh duration
- `errors` - Custom error rate
- `auth_success` - Successful auth operations count
- `auth_failures` - Failed auth operations count

### Example Output
```
✓ Register status is 200 or 201
✓ Register has response body
✓ Register response time < 1s
✓ Login status is 200 or 201
✓ RefreshToken status is 200 or 201
✓ GetMe status is 200 or 201

checks.........................: 100.00% ✓ 1500  ✗ 0
data_received..................: 2.5 MB  60 kB/s
data_sent......................: 1.2 MB  28 kB/s
http_req_duration..............: avg=245ms min=120ms med=220ms max=850ms p(95)=420ms p(99)=680ms
http_req_failed................: 0.00%   ✓ 0     ✗ 1500
http_reqs.....................: 1500    35.71/s
vus............................: 1       min=1    max=100
```

## 🎛️ Customization

### Adjust Load Profile
Edit the `stages` array in the test file:
```javascript
stages: [
  { duration: '1m', target: 10 },   // 10 users for 1 minute
  { duration: '2m', target: 50 },    // 50 users for 2 minutes
  { duration: '1m', target: 0 },     // Ramp down to 0
],
```

### Adjust Thresholds
Edit the `thresholds` object:
```javascript
thresholds: {
  http_req_duration: ['p(95)<300'],  // 95% < 300ms
  http_req_failed: ['rate<0.01'],    // < 1% errors
},
```

### Change API URL
```bash
# Environment variable
API_URL=https://api.example.com/api k6 run k6/load-tests/auth-load-test.js

# Or edit BASE_URL in the test file
const BASE_URL = __ENV.API_URL || 'https://api.example.com/api';
```

## 🔍 Performance Analysis

### What to Look For

**Good Performance:**
- ✅ p95 < 500ms
- ✅ p99 < 1s
- ✅ Error rate < 1%
- ✅ No memory leaks (stable VU count)

**Warning Signs:**
- ⚠️ p95 > 1s
- ⚠️ Error rate > 5%
- ⚠️ Increasing response times over time
- ⚠️ High memory usage

**Critical Issues:**
- ❌ p99 > 5s
- ❌ Error rate > 10%
- ❌ Timeouts
- ❌ Server crashes

## 📈 Continuous Integration

### GitHub Actions Example
```yaml
name: Load Test

on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install k6
        run: |
          wget https://github.com/grafana/k6/releases/download/v0.48.0/k6-v0.48.0-linux-amd64.tar.gz
          tar xzvf k6-v0.48.0-linux-amd64.tar.gz
          sudo mv k6-v0.48.0-linux-amd64/k6 /usr/local/bin/
      - name: Run load test
        run: |
          API_URL=${{ secrets.API_URL }} k6 run k6/load-tests/auth-load-test.js
```

## 🐛 Troubleshooting

### Test Fails Immediately
- Check API URL is correct
- Verify API is running
- Check network connectivity

### High Error Rate
- Check server logs
- Verify database connection
- Check rate limiting settings
- Monitor server resources (CPU, memory)

### Slow Response Times
- Check database query performance
- Verify indexes are in place
- Check for N+1 queries
- Monitor database connection pool

## 📚 Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Examples](https://k6.io/docs/examples/)
- [Load Testing Best Practices](https://k6.io/docs/test-types/load-testing/)

