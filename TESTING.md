# Testing Guide

This document describes the testing strategy and how to run tests for the Spotlight Backend.

## 📋 Test Types

### Unit Tests
- **Location**: `src/**/*.spec.ts`
- **Purpose**: Test individual services, controllers, and utilities in isolation
- **Mocking**: All external dependencies are mocked
- **Run**: `npm run test:unit`

### Integration Tests
- **Location**: `src/**/*.integration.spec.ts`
- **Purpose**: Test controller + service + repository integration
- **Database**: Uses test database (can be mocked or real)
- **Run**: `npm run test:integration`

### E2E Tests
- **Location**: `test/**/*.e2e-spec.ts`
- **Purpose**: Test complete user flows end-to-end
- **Database**: Uses real test database
- **Run**: `npm run test:e2e`

## 🚀 Running Tests

### Prerequisites

1. **Start Docker services** (PostgreSQL, Redis, etc.):
   ```bash
   npm run docker:dev
   ```

2. **Set up test database**:
   ```bash
   # Create .env.test file
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/spotlight_test"
   
   # Run migrations
   npm run prisma:migrate
   ```

### Run All Tests
```bash
npm test
```

### Run Specific Test Types
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:cov
```

### Run Specific Test File
```bash
npm test -- auth.service.spec.ts
```

## 📁 Test Structure

```
src/
├── auth/
│   ├── auth.service.spec.ts          # Unit test
│   ├── auth.controller.spec.ts      # Unit test
│   └── auth.controller.integration.spec.ts  # Integration test
├── users/
│   └── users.service.spec.ts         # Unit test
└── ...

test/
├── helpers/
│   └── test-helpers.ts               # Test utilities
├── setup-e2e.ts                      # E2E setup
├── auth.e2e-spec.ts                  # E2E test
├── posts.e2e-spec.ts                 # E2E test
└── projects.e2e-spec.ts              # E2E test
```

## 🛠️ Test Helpers

### TestHelpers Class

Located in `test/helpers/test-helpers.ts`, provides utilities:

- `createUser(overrides?)` - Create a test user
- `createPost(authorId, overrides?)` - Create a test post
- `createProject(ownerId, overrides?)` - Create a test project
- `cleanup()` - Clean up test database
- `getAuthToken(email, password, app)` - Get auth token for tests

### Example Usage

```typescript
import { TestHelpers } from '../test/helpers/test-helpers';

describe('My Test', () => {
  beforeEach(async () => {
    await TestHelpers.cleanup();
  });

  it('should do something', async () => {
    const user = await TestHelpers.createUser({
      email: 'test@example.com',
    });
    
    // Test logic here
  });
});
```

## 📝 Writing Tests

### Unit Test Example

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MyService } from './my.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MyService', () => {
  let service: MyService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MyService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MyService>(MyService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

### Integration Test Example

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('MyController (Integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should do something', () => {
    return request(app.getHttpServer())
      .get('/api/my-endpoint')
      .expect(200);
  });
});
```

### E2E Test Example

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TestHelpers } from '../test/helpers/test-helpers';

describe('My E2E Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await TestHelpers.cleanup();
    await app.close();
  });

  beforeEach(async () => {
    await TestHelpers.cleanup();
  });

  it('should complete full flow', async () => {
    // Test complete user flow
  });
});
```

## 🎯 Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data in `beforeEach` or `afterEach`
3. **Descriptive Names**: Use descriptive test names that explain what is being tested
4. **AAA Pattern**: Arrange, Act, Assert
5. **Mock External Services**: Mock external APIs, email services, etc.
6. **Test Edge Cases**: Test error cases, validation failures, etc.

## 📊 Coverage Goals

- **Unit Tests**: Aim for 80%+ coverage
- **Integration Tests**: Cover critical paths
- **E2E Tests**: Cover main user flows

## 🔧 Configuration

### Jest Configuration

- **Unit/Integration**: `jest.config.js`
- **E2E**: `test/jest-e2e.json`

### Environment Variables

Create `.env.test` for test-specific configurations:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/spotlight_test"
JWT_SECRET="test-secret"
NODE_ENV="test"
```

## 🐛 Debugging Tests

### Debug Unit Tests
```bash
npm run test:debug
```

### Debug E2E Tests
```bash
node --inspect-brk node_modules/.bin/jest --config ./test/jest-e2e.json --runInBand
```

## 📚 Resources

- [Jest Documentation](https://jestjs.io/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Supertest Documentation](https://github.com/visionmedia/supertest)

