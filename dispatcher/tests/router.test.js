const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock Mongoose to bypass actual DB operations in route tests
jest.mock('mongoose', () => {
  return {
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true),
    model: jest.fn().mockReturnValue({
      create: jest.fn().mockResolvedValue(true),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([])
        })
      })
    }),
    Schema: jest.fn()
  };
});

const { app, auth, SERVICES } = require('../app');

jest.setTimeout(10000);
// ─── Token Helpers ──────────────────────────────────────────────

function generateToken(payload = { user: 'testuser', role: 'admin' }) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'irem_secret_key', { expiresIn: '1h' });
}

function generateExpiredToken() {
  return jwt.sign({ user: 'testuser' }, process.env.JWT_SECRET || 'irem_secret_key', { expiresIn: '-1s' });
}

function generateInvalidToken() {
  return jwt.sign({ user: 'testuser' }, 'WRONG_SECRET', { expiresIn: '1h' });
}

// ═══════════════════════════════════════════════════════════════
//  HEALTH & SERVICE DISCOVERY
// ═══════════════════════════════════════════════════════════════

describe('Dispatcher - Health & Service Discovery', () => {

  it('GET /health should return status ok without auth', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('dispatcher');
    expect(res.body.uptime).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.routes).toBeInstanceOf(Array);
    expect(res.body.routes.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /health routes should include /users and /products', async () => {
    const res = await request(app).get('/health');
    const paths = res.body.routes.map(r => r.path);
    expect(paths).toContain('/users');
    expect(paths).toContain('/products');
  });

  it('GET /services should list all registered services', async () => {
    const res = await request(app).get('/services');
    expect(res.statusCode).toBe(200);
    expect(res.body.services).toBeInstanceOf(Array);
    expect(res.body.services.length).toBeGreaterThanOrEqual(2);

    const routes = res.body.services.map(s => s.route);
    expect(routes).toContain('/users');
    expect(routes).toContain('/products');
  });

  it('GET /services each service should have target and description', async () => {
    const res = await request(app).get('/services');
    res.body.services.forEach(svc => {
      expect(svc.route).toBeDefined();
      expect(svc.target).toBeDefined();
      expect(svc.description).toBeDefined();
      expect(typeof svc.target).toBe('string');
      expect(typeof svc.description).toBe('string');
    });
  });
});

// ═══════════════════════════════════════════════════════════════
//  AUTH MIDDLEWARE - /users
// ═══════════════════════════════════════════════════════════════

describe('Dispatcher - /users Auth', () => {

  it('should return 401 for GET /users without token', async () => {
    const res = await request(app).get('/users');
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('should return 403 for GET /users with invalid token', async () => {
    const res = await request(app)
      .get('/users')
      .set('Authorization', 'invalidtoken123');
    expect(res.statusCode).toBe(403);
  });

  it('should return 403 for GET /users with expired token', async () => {
    const res = await request(app)
      .get('/users')
      .set('Authorization', generateExpiredToken());
    expect(res.statusCode).toBe(403);
  });

  it('should return 403 for GET /users with wrong secret token', async () => {
    const res = await request(app)
      .get('/users')
      .set('Authorization', generateInvalidToken());
    expect(res.statusCode).toBe(403);
  });

  it('should return 401 for GET /users with empty authorization header', async () => {
    const res = await request(app)
      .get('/users')
      .set('Authorization', '');
    expect(res.statusCode).toBe(401);
  });

  it('should return 401 for POST /users without token', async () => {
    const res = await request(app)
      .post('/users')
      .send({ name: 'Test', email: 'test@test.com' });
    expect(res.statusCode).toBe(401);
  });

  it('should return 401 for PUT /users/1 without token', async () => {
    const res = await request(app)
      .put('/users/1')
      .send({ name: 'Updated', email: 'u@u.com' });
    expect(res.statusCode).toBe(401);
  });

  it('should return 401 for PATCH /users/1 without token', async () => {
    const res = await request(app)
      .patch('/users/1')
      .send({ name: 'Patched' });
    expect(res.statusCode).toBe(401);
  });

  it('should return 401 for DELETE /users/1 without token', async () => {
    const res = await request(app).delete('/users/1');
    expect(res.statusCode).toBe(401);
  });

  it('should return 403 for POST /users with invalid token', async () => {
    const res = await request(app)
      .post('/users')
      .set('Authorization', generateInvalidToken())
      .send({ name: 'Test', email: 'test@test.com' });
    expect(res.statusCode).toBe(403);
  });

  it('should return 403 for PUT /users/1 with expired token', async () => {
    const res = await request(app)
      .put('/users/1')
      .set('Authorization', generateExpiredToken())
      .send({ name: 'Test', email: 'test@test.com' });
    expect(res.statusCode).toBe(403);
  });

  it('should return 403 for DELETE /users/1 with wrong secret', async () => {
    const res = await request(app)
      .delete('/users/1')
      .set('Authorization', generateInvalidToken());
    expect(res.statusCode).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════
//  AUTH MIDDLEWARE - /products
// ═══════════════════════════════════════════════════════════════

describe('Dispatcher - /products Auth', () => {

  it('should return 401 for GET /products without token', async () => {
    const res = await request(app).get('/products');
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('should return 403 for GET /products with invalid token', async () => {
    const res = await request(app)
      .get('/products')
      .set('Authorization', 'invalidtoken123');
    expect(res.statusCode).toBe(403);
  });

  it('should return 403 for GET /products with expired token', async () => {
    const res = await request(app)
      .get('/products')
      .set('Authorization', generateExpiredToken());
    expect(res.statusCode).toBe(403);
  });

  it('should return 403 for GET /products with wrong secret token', async () => {
    const res = await request(app)
      .get('/products')
      .set('Authorization', generateInvalidToken());
    expect(res.statusCode).toBe(403);
  });

  it('should return 401 for GET /products with empty authorization header', async () => {
    const res = await request(app)
      .get('/products')
      .set('Authorization', '');
    expect(res.statusCode).toBe(401);
  });

  it('should return 401 for POST /products without token', async () => {
    const res = await request(app)
      .post('/products')
      .send({ name: 'Test', price: 100 });
    expect(res.statusCode).toBe(401);
  });

  it('should return 401 for PUT /products/1 without token', async () => {
    const res = await request(app)
      .put('/products/1')
      .send({ name: 'Updated', price: 200 });
    expect(res.statusCode).toBe(401);
  });

  it('should return 401 for PATCH /products/1 without token', async () => {
    const res = await request(app)
      .patch('/products/1')
      .send({ price: 300 });
    expect(res.statusCode).toBe(401);
  });

  it('should return 401 for DELETE /products/1 without token', async () => {
    const res = await request(app).delete('/products/1');
    expect(res.statusCode).toBe(401);
  });

  it('should return 403 for POST /products with expired token', async () => {
    const res = await request(app)
      .post('/products')
      .set('Authorization', generateExpiredToken())
      .send({ name: 'Test', price: 100 });
    expect(res.statusCode).toBe(403);
  });

  it('should return 403 for PUT /products/1 with invalid token', async () => {
    const res = await request(app)
      .put('/products/1')
      .set('Authorization', generateInvalidToken())
      .send({ name: 'Test', price: 200 });
    expect(res.statusCode).toBe(403);
  });

  it('should return 403 for DELETE /products/1 with wrong secret', async () => {
    const res = await request(app)
      .delete('/products/1')
      .set('Authorization', generateInvalidToken());
    expect(res.statusCode).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════
//  UNKNOWN ROUTES - 404
// ═══════════════════════════════════════════════════════════════

describe('Dispatcher - Unknown Routes (404)', () => {

  it('should return 404 for GET /unknown', async () => {
    const res = await request(app).get('/unknown');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBeDefined();
    expect(res.body.availableRoutes).toBeInstanceOf(Array);
  });

  it('should return 404 for GET /nonexistent with valid token', async () => {
    const res = await request(app)
      .get('/nonexistent')
      .set('Authorization', generateToken());
    expect(res.statusCode).toBe(404);
  });

  it('should return 404 for GET /', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(404);
  });

  it('should return 404 for POST /unknown', async () => {
    const res = await request(app)
      .post('/unknown')
      .send({ data: 'test' });
    expect(res.statusCode).toBe(404);
  });

  it('404 response should list available routes', async () => {
    const res = await request(app).get('/doesnotexist');
    expect(res.body.availableRoutes).toContain('/health');
    expect(res.body.availableRoutes).toContain('/services');
    expect(res.body.availableRoutes).toContain('/users');
    expect(res.body.availableRoutes).toContain('/products');
  });

  it('404 response should include requested path', async () => {
    const res = await request(app).get('/foo/bar');
    expect(res.body.path).toBe('/foo/bar');
  });
});

// ═══════════════════════════════════════════════════════════════
//  AUTH MIDDLEWARE UNIT TESTS
// ═══════════════════════════════════════════════════════════════

describe('Dispatcher - Auth Middleware (Unit)', () => {
  const { auth } = require('../app');

  function createMockReq(headers = {}) {
    return { headers };
  }

  function createMockRes() {
    const res = {
      statusCode: null,
      body: null,
      status(code) { res.statusCode = code; return res; },
      json(data) { res.body = data; return res; }
    };
    return res;
  }

  it('should call next() with valid token', () => {
    const req = createMockReq({ authorization: generateToken() });
    const res = createMockRes();
    const next = jest.fn();

    auth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.user).toBe('testuser');
  });

  it('should return 401 when no token provided', () => {
    const req = createMockReq({});
    const res = createMockRes();
    const next = jest.fn();

    auth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it('should return 401 when authorization header is empty string', () => {
    const req = createMockReq({ authorization: '' });
    const res = createMockRes();
    const next = jest.fn();

    auth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it('should return 403 for expired token', () => {
    const req = createMockReq({ authorization: generateExpiredToken() });
    const res = createMockRes();
    const next = jest.fn();

    auth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('should return 403 for token with wrong secret', () => {
    const req = createMockReq({ authorization: generateInvalidToken() });
    const res = createMockRes();
    const next = jest.fn();

    auth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });

  it('should attach decoded user to req.user on valid token', () => {
    const token = generateToken({ user: 'admin', role: 'admin', id: 42 });
    const req = createMockReq({ authorization: token });
    const res = createMockRes();
    const next = jest.fn();

    auth(req, res, next);

    expect(req.user.user).toBe('admin');
    expect(req.user.role).toBe('admin');
    expect(req.user.id).toBe(42);
  });
});

// ═══════════════════════════════════════════════════════════════
//  SERVICE REGISTRY
// ═══════════════════════════════════════════════════════════════

describe('Dispatcher - Service Registry', () => {
  const { SERVICES } = require('../app');

  it('should have users service configured', () => {
    expect(SERVICES.users).toBeDefined();
    expect(SERVICES.users.target).toContain('3001');
    expect(SERVICES.users.pathRewrite).toBeDefined();
    expect(SERVICES.users.description).toBeDefined();
  });

  it('should have products service configured', () => {
    expect(SERVICES.products).toBeDefined();
    expect(SERVICES.products.target).toContain('3002');
    expect(SERVICES.products.pathRewrite).toBeDefined();
    expect(SERVICES.products.description).toBeDefined();
  });

  it('users pathRewrite should strip /users prefix', () => {
    expect(SERVICES.users.pathRewrite['^/users']).toBe('');
  });

  it('products pathRewrite should strip /products prefix', () => {
    expect(SERVICES.products.pathRewrite['^/products']).toBe('');
  });

  it('all services should have required fields', () => {
    Object.entries(SERVICES).forEach(([name, config]) => {
      expect(config.target).toBeDefined();
      expect(config.pathRewrite).toBeDefined();
      expect(config.description).toBeDefined();
      expect(typeof config.target).toBe('string');
      expect(typeof config.description).toBe('string');
    });
  });
});