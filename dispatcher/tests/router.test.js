const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');

// Helper: generate a valid JWT token
function generateToken(payload = { user: 'testuser' }) {
  return jwt.sign(payload, 'SECRET', { expiresIn: '1h' });
}

// Helper: generate an expired JWT token
function generateExpiredToken() {
  return jwt.sign({ user: 'testuser' }, 'SECRET', { expiresIn: '-1s' });
}

// Helper: generate a token with wrong secret
function generateInvalidToken() {
  return jwt.sign({ user: 'testuser' }, 'WRONG_SECRET', { expiresIn: '1h' });
}

describe('Dispatcher - Auth Middleware', () => {

  // --- /users route auth tests ---

  it('should return 401 for /users without token', async () => {
    const res = await request(app).get('/users');
    expect(res.statusCode).toBe(401);
  });

  it('should return 403 for /users with invalid token', async () => {
    const res = await request(app)
      .get('/users')
      .set('Authorization', 'invalidtoken123');
    expect(res.statusCode).toBe(403);
  });

  it('should return 403 for /users with expired token', async () => {
    const res = await request(app)
      .get('/users')
      .set('Authorization', generateExpiredToken());
    expect(res.statusCode).toBe(403);
  });

  it('should return 403 for /users with wrong secret token', async () => {
    const res = await request(app)
      .get('/users')
      .set('Authorization', generateInvalidToken());
    expect(res.statusCode).toBe(403);
  });

  it('should return 401 for /users with empty authorization header', async () => {
    const res = await request(app)
      .get('/users')
      .set('Authorization', '');
    expect(res.statusCode).toBe(401);
  });

  // --- /products route auth tests ---

  it('should return 401 for /products without token', async () => {
    const res = await request(app).get('/products');
    expect(res.statusCode).toBe(401);
  });

  it('should return 403 for /products with invalid token', async () => {
    const res = await request(app)
      .get('/products')
      .set('Authorization', 'invalidtoken123');
    expect(res.statusCode).toBe(403);
  });

  it('should return 403 for /products with expired token', async () => {
    const res = await request(app)
      .get('/products')
      .set('Authorization', generateExpiredToken());
    expect(res.statusCode).toBe(403);
  });

  it('should return 403 for /products with wrong secret token', async () => {
    const res = await request(app)
      .get('/products')
      .set('Authorization', generateInvalidToken());
    expect(res.statusCode).toBe(403);
  });

  it('should return 401 for /products with empty authorization header', async () => {
    const res = await request(app)
      .get('/products')
      .set('Authorization', '');
    expect(res.statusCode).toBe(401);
  });

});

describe('Dispatcher - POST/PUT/DELETE Auth', () => {

  it('should return 401 for POST /users without token', async () => {
    const res = await request(app)
      .post('/users')
      .send({ name: 'Test', email: 'test@test.com' });
    expect(res.statusCode).toBe(401);
  });

  it('should return 401 for PUT /users/1 without token', async () => {
    const res = await request(app)
      .put('/users/1')
      .send({ name: 'Updated' });
    expect(res.statusCode).toBe(401);
  });

  it('should return 401 for DELETE /users/1 without token', async () => {
    const res = await request(app).delete('/users/1');
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
      .send({ name: 'Updated' });
    expect(res.statusCode).toBe(401);
  });

  it('should return 401 for DELETE /products/1 without token', async () => {
    const res = await request(app).delete('/products/1');
    expect(res.statusCode).toBe(401);
  });

  it('should return 403 for POST /users with invalid token', async () => {
    const res = await request(app)
      .post('/users')
      .set('Authorization', generateInvalidToken())
      .send({ name: 'Test', email: 'test@test.com' });
    expect(res.statusCode).toBe(403);
  });

  it('should return 403 for POST /products with expired token', async () => {
    const res = await request(app)
      .post('/products')
      .set('Authorization', generateExpiredToken())
      .send({ name: 'Test', price: 100 });
    expect(res.statusCode).toBe(403);
  });

});

describe('Dispatcher - Unknown Routes', () => {

  it('should return 404 for unknown route without token', async () => {
    const res = await request(app).get('/unknown');
    expect(res.statusCode).toBe(404);
  });

  it('should return 404 for unknown route with valid token', async () => {
    const res = await request(app)
      .get('/nonexistent')
      .set('Authorization', generateToken());
    expect(res.statusCode).toBe(404);
  });

  it('should return 404 for root route', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(404);
  });

});