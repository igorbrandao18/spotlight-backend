import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const authDuration = new Trend('auth_duration');
const usersDuration = new Trend('users_duration');
const postsDuration = new Trend('posts_duration');
const projectsDuration = new Trend('projects_duration');
const portfolioDuration = new Trend('portfolio_duration');
const chatDuration = new Trend('chat_duration');
const reportsDuration = new Trend('reports_duration');
const partnerStoresDuration = new Trend('partner_stores_duration');

const authSuccess = new Counter('auth_success');
const usersSuccess = new Counter('users_success');
const postsSuccess = new Counter('posts_success');
const projectsSuccess = new Counter('projects_success');
const portfolioSuccess = new Counter('portfolio_success');
const chatSuccess = new Counter('chat_success');
const reportsSuccess = new Counter('reports_success');
const partnerStoresSuccess = new Counter('partner_stores_success');

// Test configuration - realistic load
export const options = {
  stages: [
    { duration: '2m', target: 20 },   // Ramp up to 20 users
    { duration: '5m', target: 50 },  // Ramp up to 50 users
    { duration: '10m', target: 100 }, // Stay at 100 users
    { duration: '3m', target: 50 },  // Ramp down to 50 users
    { duration: '1m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'], // 95% < 1s, 99% < 2s
    http_req_failed: ['rate<0.05'],                   // Error rate < 5%
    errors: ['rate<0.05'],                            // Custom error rate < 5%
    auth_duration: ['p(95)<500'],                     // Auth < 500ms
    users_duration: ['p(95)<500'],                    // Users < 500ms
    posts_duration: ['p(95)<800'],                    // Posts < 800ms
    projects_duration: ['p(95)<800'],                 // Projects < 800ms
    portfolio_duration: ['p(95)<800'],                 // Portfolio < 800ms
    chat_duration: ['p(95)<500'],                     // Chat < 500ms
    reports_duration: ['p(95)<500'],                  // Reports < 500ms
    partner_stores_duration: ['p(95)<500'],           // Partner Stores < 500ms
  },
};

// Base URL
const BASE_URL = __ENV.API_URL || 'http://localhost:8080/api';
const AUTH_URL = `${BASE_URL}/auth`;
const USERS_URL = `${BASE_URL}/users`;
const POSTS_URL = `${BASE_URL}/posts`;
const PROJECTS_URL = `${BASE_URL}/projects`;
const PORTFOLIO_URL = `${BASE_URL}/portfolio`;
const CHAT_URL = `${BASE_URL}/chat`;
const REPORTS_URL = `${BASE_URL}/reports`;
const PARTNER_STORES_URL = `${BASE_URL}/partner-stores`;

// Test data generators
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

function generatePostData() {
  return {
    content: `Test post content ${Date.now()}`,
    description: 'This is a test post description',
    equipment: 'Canon EOS R5',
    location: 'São Paulo, Brazil',
    software: 'Adobe Lightroom',
  };
}

function generateProjectData() {
  return {
    title: `Test Project ${Date.now()}`,
    description: 'This is a test project description',
    category: 'Photography',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
  };
}

function generatePortfolioData() {
  return {
    title: `Portfolio Item ${Date.now()}`,
    description: 'This is a test portfolio item',
  };
}

function generateComment() {
  return {
    content: `Test comment ${Date.now()}`,
  };
}

function generateReport() {
  return {
    reason: 'Inappropriate content',
    category: 'SPAM',
  };
}

// Helper function to check response
function checkResponse(res, operation, durationMetric = null) {
  const isSuccess = res.status >= 200 && res.status < 300;
  const hasBody = res.body && res.body.length > 0;
  const isFast = res.timings.duration < 2000;
  
  const success = check(res, {
    [`${operation} status is 2xx`]: (r) => isSuccess,
    [`${operation} has response body`]: (r) => hasBody,
    [`${operation} response time < 2s`]: (r) => isFast,
  });

  if (durationMetric) {
    durationMetric.add(res.timings.duration);
  }

  if (!success) {
    errorRate.add(1);
  }

  return success;
}

// User session state
class UserSession {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.userId = null;
    this.userData = null;
    this.posts = [];
    this.projects = [];
    this.portfolioItems = [];
    this.followedUsers = [];
    this.partnerStores = [];
  }

  setTokens(tokens) {
    if (tokens && tokens.accessToken) {
      this.accessToken = tokens.accessToken;
      this.refreshToken = tokens.refreshToken;
    }
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
    };
  }
}

// Main test function - simulates complete user journey
export default function () {
  const session = new UserSession();
  const userType = Math.random(); // 0-1, determines user behavior pattern

  // ============================================
  // 1. AUTHENTICATION FLOW
  // ============================================
  
  // Only register new users occasionally (10% chance)
  if (userType < 0.1) {
    const registerData = generateUserData();
    const registerStart = Date.now();
    const registerRes = http.post(
      `${AUTH_URL}/register`,
      JSON.stringify(registerData),
      { headers: { 'Content-Type': 'application/json' }, tags: { name: 'Auth-Register' } }
    );
    authDuration.add(Date.now() - registerStart);
    
    if (checkResponse(registerRes, 'Register', authDuration)) {
      try {
        const body = JSON.parse(registerRes.body);
        session.setTokens(body.tokens);
        session.userId = body.user?.id;
        session.userData = registerData;
        authSuccess.add(1);
      } catch (e) {
        // Continue
      }
    }
    sleep(2);
  } else {
    // Most users login (simulate existing users)
    const loginData = {
      email: `testuser${__VU % 10}@example.com`, // Consistent per VU
      password: 'SecurePass123',
    };
    
    const loginStart = Date.now();
    const loginRes = http.post(
      `${AUTH_URL}/login`,
      JSON.stringify(loginData),
      { headers: { 'Content-Type': 'application/json' }, tags: { name: 'Auth-Login' } }
    );
    authDuration.add(Date.now() - loginStart);
    
    if (checkResponse(loginRes, 'Login', authDuration)) {
      try {
        const body = JSON.parse(loginRes.body);
        session.setTokens(body.tokens);
        session.userId = body.user?.id;
        authSuccess.add(1);
      } catch (e) {
        // Continue without auth
        return;
      }
    }
    sleep(1);
  }

  // Refresh token occasionally
  if (session.refreshToken && Math.random() < 0.3) {
    const refreshStart = Date.now();
    const refreshRes = http.post(
      `${AUTH_URL}/refresh-token`,
      JSON.stringify({ refreshToken: session.refreshToken }),
      { headers: { 'Content-Type': 'application/json' }, tags: { name: 'Auth-Refresh' } }
    );
    authDuration.add(Date.now() - refreshStart);
    
    if (checkResponse(refreshRes, 'RefreshToken', authDuration)) {
      try {
        const body = JSON.parse(refreshRes.body);
        session.setTokens(body.tokens);
      } catch (e) {
        // Continue
      }
    }
    sleep(1);
  }

  if (!session.accessToken) {
    return; // Can't continue without auth
  }

  // ============================================
  // 2. USERS MODULE
  // ============================================
  
  // Get own profile
  const getMeStart = Date.now();
  const getMeRes = http.get(`${USERS_URL}/me`, {
    headers: session.getHeaders(),
    tags: { name: 'Users-GetMe' },
  });
  usersDuration.add(Date.now() - getMeStart);
  
  if (checkResponse(getMeRes, 'GetMe', usersDuration)) {
    try {
      const body = JSON.parse(getMeRes.body);
      session.userId = body.id;
      usersSuccess.add(1);
    } catch (e) {
      // Continue
    }
  }
  sleep(1);

  // Search users (30% chance)
  if (Math.random() < 0.3) {
    const searchStart = Date.now();
    const searchRes = http.get(`${USERS_URL}?search=test`, {
      headers: session.getHeaders(),
      tags: { name: 'Users-Search' },
    });
    usersDuration.add(Date.now() - searchStart);
    
    if (checkResponse(searchRes, 'SearchUsers', usersDuration)) {
      try {
        const body = JSON.parse(searchRes.body);
        if (body.content && body.content.length > 0) {
          const randomUser = body.content[Math.floor(Math.random() * body.content.length)];
          session.followedUsers.push(randomUser.id);
        }
        usersSuccess.add(1);
      } catch (e) {
        // Continue
      }
    }
    sleep(1);
  }

  // Follow a user (20% chance)
  if (session.followedUsers.length > 0 && Math.random() < 0.2) {
    const userId = session.followedUsers[0];
    const followStart = Date.now();
    const followRes = http.post(
      `${USERS_URL}/follow/${userId}`,
      null,
      { headers: session.getHeaders(), tags: { name: 'Users-Follow' } }
    );
    usersDuration.add(Date.now() - followStart);
    checkResponse(followRes, 'FollowUser', usersDuration);
    sleep(1);
  }

  // Get followers/following (10% chance)
  if (Math.random() < 0.1) {
    const followersStart = Date.now();
    const followersRes = http.get(`${USERS_URL}/followers?userId=${session.userId}`, {
      headers: session.getHeaders(),
      tags: { name: 'Users-Followers' },
    });
    usersDuration.add(Date.now() - followersStart);
    checkResponse(followersRes, 'GetFollowers', usersDuration);
    sleep(1);
  }

  // ============================================
  // 3. POSTS MODULE
  // ============================================
  
  // Get posts feed (80% chance - most common action)
  if (Math.random() < 0.8) {
    const postsStart = Date.now();
    const postsRes = http.get(`${POSTS_URL}`, {
      headers: session.getHeaders(),
      tags: { name: 'Posts-GetAll' },
    });
    postsDuration.add(Date.now() - postsStart);
    
    if (checkResponse(postsRes, 'GetPosts', postsDuration)) {
      try {
        const body = JSON.parse(postsRes.body);
        if (Array.isArray(body) && body.length > 0) {
          session.posts = body.map(p => p.id).slice(0, 5); // Store first 5 post IDs
        }
        postsSuccess.add(1);
      } catch (e) {
        // Continue
      }
    }
    sleep(1);
  }

  // Create a post (15% chance)
  if (Math.random() < 0.15) {
    const postData = generatePostData();
    const createPostStart = Date.now();
    const createPostRes = http.post(
      `${POSTS_URL}`,
      JSON.stringify(postData),
      { headers: session.getHeaders(), tags: { name: 'Posts-Create' } }
    );
    postsDuration.add(Date.now() - createPostStart);
    
    if (checkResponse(createPostRes, 'CreatePost', postsDuration)) {
      try {
        const body = JSON.parse(createPostRes.body);
        if (body.id) {
          session.posts.unshift(body.id);
        }
        postsSuccess.add(1);
      } catch (e) {
        // Continue
      }
    }
    sleep(2);
  }

  // Get single post (30% chance)
  if (session.posts.length > 0 && Math.random() < 0.3) {
    const postId = session.posts[Math.floor(Math.random() * session.posts.length)];
    const getPostStart = Date.now();
    const getPostRes = http.get(`${POSTS_URL}/${postId}`, {
      headers: session.getHeaders(),
      tags: { name: 'Posts-GetOne' },
    });
    postsDuration.add(Date.now() - getPostStart);
    checkResponse(getPostRes, 'GetPost', postsDuration);
    sleep(1);
  }

  // Add reaction to post (25% chance)
  if (session.posts.length > 0 && Math.random() < 0.25) {
    const postId = session.posts[Math.floor(Math.random() * session.posts.length)];
    const reactionData = { type: ['LIKE', 'LOVE', 'HAHA'][Math.floor(Math.random() * 3)] };
    const reactionStart = Date.now();
    const reactionRes = http.post(
      `${POSTS_URL}/${postId}/reactions`,
      JSON.stringify(reactionData),
      { headers: session.getHeaders(), tags: { name: 'Posts-Reaction' } }
    );
    postsDuration.add(Date.now() - reactionStart);
    checkResponse(reactionRes, 'CreateReaction', postsDuration);
    sleep(1);
  }

  // Add comment to post (20% chance)
  if (session.posts.length > 0 && Math.random() < 0.2) {
    const postId = session.posts[Math.floor(Math.random() * session.posts.length)];
    const commentData = generateComment();
    const commentStart = Date.now();
    const commentRes = http.post(
      `${POSTS_URL}/${postId}/comments`,
      JSON.stringify(commentData),
      { headers: session.getHeaders(), tags: { name: 'Posts-Comment' } }
    );
    postsDuration.add(Date.now() - commentStart);
    checkResponse(commentRes, 'CreateComment', postsDuration);
    sleep(1);
  }

  // ============================================
  // 4. PROJECTS MODULE
  // ============================================
  
  // Get projects list (40% chance)
  if (Math.random() < 0.4) {
    const projectsStart = Date.now();
    const projectsRes = http.get(`${PROJECTS_URL}/list`, {
      headers: session.getHeaders(),
      tags: { name: 'Projects-GetAll' },
    });
    projectsDuration.add(Date.now() - projectsStart);
    
    if (checkResponse(projectsRes, 'GetProjects', projectsDuration)) {
      try {
        const body = JSON.parse(projectsRes.body);
        if (Array.isArray(body) && body.length > 0) {
          session.projects = body.map(p => p.id).slice(0, 3);
        }
        projectsSuccess.add(1);
      } catch (e) {
        // Continue
      }
    }
    sleep(1);
  }

  // Create project (10% chance)
  if (Math.random() < 0.1) {
    const projectData = generateProjectData();
    const createProjectStart = Date.now();
    const createProjectRes = http.post(
      `${PROJECTS_URL}`,
      JSON.stringify(projectData),
      { headers: session.getHeaders(), tags: { name: 'Projects-Create' } }
    );
    projectsDuration.add(Date.now() - createProjectStart);
    
    if (checkResponse(createProjectRes, 'CreateProject', projectsDuration)) {
      try {
        const body = JSON.parse(createProjectRes.body);
        if (body.id) {
          session.projects.unshift(body.id);
        }
        projectsSuccess.add(1);
      } catch (e) {
        // Continue
      }
    }
    sleep(2);
  }

  // Get single project (20% chance)
  if (session.projects.length > 0 && Math.random() < 0.2) {
    const projectId = session.projects[Math.floor(Math.random() * session.projects.length)];
    const getProjectStart = Date.now();
    const getProjectRes = http.get(`${PROJECTS_URL}/${projectId}`, {
      headers: session.getHeaders(),
      tags: { name: 'Projects-GetOne' },
    });
    projectsDuration.add(Date.now() - getProjectStart);
    checkResponse(getProjectRes, 'GetProject', projectsDuration);
    sleep(1);
  }

  // Get project members (15% chance)
  if (session.projects.length > 0 && Math.random() < 0.15) {
    const projectId = session.projects[Math.floor(Math.random() * session.projects.length)];
    const membersStart = Date.now();
    const membersRes = http.get(`${PROJECTS_URL}/${projectId}/members`, {
      headers: session.getHeaders(),
      tags: { name: 'Projects-GetMembers' },
    });
    projectsDuration.add(Date.now() - membersStart);
    checkResponse(membersRes, 'GetMembers', projectsDuration);
    sleep(1);
  }

  // Get milestones (10% chance)
  if (session.projects.length > 0 && Math.random() < 0.1) {
    const projectId = session.projects[Math.floor(Math.random() * session.projects.length)];
    const milestonesStart = Date.now();
    const milestonesRes = http.get(`${PROJECTS_URL}/${projectId}/milestones`, {
      headers: session.getHeaders(),
      tags: { name: 'Projects-GetMilestones' },
    });
    projectsDuration.add(Date.now() - milestonesStart);
    checkResponse(milestonesRes, 'GetMilestones', projectsDuration);
    sleep(1);
  }

  // ============================================
  // 5. PORTFOLIO MODULE
  // ============================================
  
  // Get portfolio items (30% chance)
  if (Math.random() < 0.3) {
    const portfolioStart = Date.now();
    const portfolioRes = http.get(`${PORTFOLIO_URL}?userId=${session.userId}`, {
      headers: session.getHeaders(),
      tags: { name: 'Portfolio-GetAll' },
    });
    portfolioDuration.add(Date.now() - portfolioStart);
    
    if (checkResponse(portfolioRes, 'GetPortfolio', portfolioDuration)) {
      try {
        const body = JSON.parse(portfolioRes.body);
        if (Array.isArray(body) && body.length > 0) {
          session.portfolioItems = body.map(p => p.id).slice(0, 3);
        }
        portfolioSuccess.add(1);
      } catch (e) {
        // Continue
      }
    }
    sleep(1);
  }

  // Create portfolio item (8% chance)
  if (Math.random() < 0.08) {
    const portfolioData = generatePortfolioData();
    const createPortfolioStart = Date.now();
    const createPortfolioRes = http.post(
      `${PORTFOLIO_URL}`,
      JSON.stringify(portfolioData),
      { headers: session.getHeaders(), tags: { name: 'Portfolio-Create' } }
    );
    portfolioDuration.add(Date.now() - createPortfolioStart);
    
    if (checkResponse(createPortfolioRes, 'CreatePortfolio', portfolioDuration)) {
      try {
        const body = JSON.parse(createPortfolioRes.body);
        if (body.id) {
          session.portfolioItems.unshift(body.id);
        }
        portfolioSuccess.add(1);
      } catch (e) {
        // Continue
      }
    }
    sleep(2);
  }

  // Like portfolio item (15% chance)
  if (session.portfolioItems.length > 0 && Math.random() < 0.15) {
    const itemId = session.portfolioItems[Math.floor(Math.random() * session.portfolioItems.length)];
    const likeStart = Date.now();
    const likeRes = http.post(
      `${PORTFOLIO_URL}/${itemId}/like`,
      null,
      { headers: session.getHeaders(), tags: { name: 'Portfolio-Like' } }
    );
    portfolioDuration.add(Date.now() - likeStart);
    checkResponse(likeRes, 'LikePortfolio', portfolioDuration);
    sleep(1);
  }

  // View portfolio item (20% chance)
  if (session.portfolioItems.length > 0 && Math.random() < 0.2) {
    const itemId = session.portfolioItems[Math.floor(Math.random() * session.portfolioItems.length)];
    const viewStart = Date.now();
    const viewRes = http.post(
      `${PORTFOLIO_URL}/${itemId}/view`,
      null,
      { headers: session.getHeaders(), tags: { name: 'Portfolio-View' } }
    );
    portfolioDuration.add(Date.now() - viewStart);
    checkResponse(viewRes, 'ViewPortfolio', portfolioDuration);
    sleep(1);
  }

  // ============================================
  // 6. CHAT MODULE
  // ============================================
  
  // Get chat rooms (25% chance)
  if (Math.random() < 0.25) {
    const chatRoomsStart = Date.now();
    const chatRoomsRes = http.get(`${CHAT_URL}`, {
      headers: session.getHeaders(),
      tags: { name: 'Chat-GetRooms' },
    });
    chatDuration.add(Date.now() - chatRoomsStart);
    
    if (checkResponse(chatRoomsRes, 'GetChatRooms', chatDuration)) {
      try {
        const body = JSON.parse(chatRoomsRes.body);
        if (Array.isArray(body) && body.length > 0) {
          const roomId = body[0].id;
          // Get messages from first room (15% chance)
          if (Math.random() < 0.15) {
            const messagesStart = Date.now();
            const messagesRes = http.get(`${CHAT_URL}/${roomId}/messages?page=0&size=20`, {
              headers: session.getHeaders(),
              tags: { name: 'Chat-GetMessages' },
            });
            chatDuration.add(Date.now() - messagesStart);
            checkResponse(messagesRes, 'GetMessages', chatDuration);
          }
        }
        chatSuccess.add(1);
      } catch (e) {
        // Continue
      }
    }
    sleep(1);
  }

  // ============================================
  // 7. REPORTS MODULE
  // ============================================
  
  // Create report (5% chance - rare action)
  if (Math.random() < 0.05) {
    const reportData = generateReport();
    const reportStart = Date.now();
    const reportRes = http.post(
      `${REPORTS_URL}/new`,
      JSON.stringify(reportData),
      { headers: session.getHeaders(), tags: { name: 'Reports-Create' } }
    );
    reportsDuration.add(Date.now() - reportStart);
    
    if (checkResponse(reportRes, 'CreateReport', reportsDuration)) {
      reportsSuccess.add(1);
    }
    sleep(1);
  }

  // ============================================
  // 8. PARTNER STORES MODULE
  // ============================================
  
  // Get partner stores (20% chance)
  if (Math.random() < 0.2) {
    const storesStart = Date.now();
    const storesRes = http.get(`${PARTNER_STORES_URL}`, {
      headers: session.getHeaders(),
      tags: { name: 'PartnerStores-GetAll' },
    });
    partnerStoresDuration.add(Date.now() - storesStart);
    
    if (checkResponse(storesRes, 'GetPartnerStores', partnerStoresDuration)) {
      try {
        const body = JSON.parse(storesRes.body);
        if (Array.isArray(body) && body.length > 0) {
          session.partnerStores = body.map(s => s.id).slice(0, 3);
        }
        partnerStoresSuccess.add(1);
      } catch (e) {
        // Continue
      }
    }
    sleep(1);
  }

  // Get single store (10% chance)
  if (session.partnerStores.length > 0 && Math.random() < 0.1) {
    const storeId = session.partnerStores[Math.floor(Math.random() * session.partnerStores.length)];
    const storeStart = Date.now();
    const storeRes = http.get(`${PARTNER_STORES_URL}/${storeId}`, {
      headers: session.getHeaders(),
      tags: { name: 'PartnerStores-GetOne' },
    });
    partnerStoresDuration.add(Date.now() - storeStart);
    checkResponse(storeRes, 'GetPartnerStore', partnerStoresDuration);
    sleep(1);
  }

  // Get equipments (15% chance)
  if (Math.random() < 0.15) {
    const equipmentsStart = Date.now();
    const equipmentsRes = http.get(`${PARTNER_STORES_URL}/equipments`, {
      headers: session.getHeaders(),
      tags: { name: 'PartnerStores-GetEquipments' },
    });
    partnerStoresDuration.add(Date.now() - equipmentsStart);
    checkResponse(equipmentsRes, 'GetEquipments', partnerStoresDuration);
    sleep(1);
  }

  // Realistic delay between iterations (simulate user thinking/browsing time)
  sleep(Math.random() * 5 + 3); // 3-8 seconds
}

// Setup function - creates test users
export function setup() {
  console.log('🚀 Starting comprehensive API load test...');
  console.log(`📍 API URL: ${BASE_URL}`);
  console.log(`⏱️  Test duration: ~21 minutes`);
  console.log(`👥 Max concurrent users: 100`);
  console.log(`📊 Testing all modules: Auth, Users, Posts, Projects, Portfolio, Chat, Reports, Partner Stores`);
  
  // Create test users for login simulation
  const testUsers = [];
  for (let i = 1; i <= 10; i++) {
    const testUser = generateUserData();
    testUser.email = `testuser${i}@example.com`; // Consistent emails
    const res = http.post(
      `${AUTH_URL}/register`,
      JSON.stringify(testUser),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    if (res.status === 201 || res.status === 200) {
      testUsers.push(testUser);
      console.log(`✅ Created test user ${i}: ${testUser.email}`);
      sleep(1); // Space out registrations
    } else {
      console.log(`⚠️  Failed to create test user ${i} (may already exist)`);
    }
  }
  
  return { testUsers };
}

// Teardown function
export function teardown(data) {
  console.log('🏁 Comprehensive API load test completed');
  console.log('📊 Check the summary above for detailed metrics');
}

