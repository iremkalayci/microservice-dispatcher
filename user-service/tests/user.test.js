const request = require('supertest');
const app = require('../app');

beforeEach(() => {
  app.resetData();
});

describe('User Service - GET /', () => {

  it('should return all users with pagination', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBe(3);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBe(3);
  });

  it('should return users with correct fields', async () => {
    const res = await request(app).get('/');
    const user = res.body.data[0];
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('phone');
    expect(user).toHaveProperty('role');
    expect(user).toHaveProperty('createdAt');
    expect(user).toHaveProperty('updatedAt');
  });

  it('should search users by name', async () => {
    const res = await request(app).get('/?search=ali');
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toContain('Ali');
  });

  it('should search users by email', async () => {
    const res = await request(app).get('/?search=mehmet@');
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].email).toBe('mehmet@example.com');
  });

  it('should filter users by role', async () => {
    const res = await request(app).get('/?role=admin');
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].role).toBe('admin');
  });

  it('should paginate results', async () => {
    const res = await request(app).get('/?page=1&limit=2');
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination.totalPages).toBe(2);
    expect(res.body.pagination.page).toBe(1);
  });

  it('should return second page', async () => {
    const res = await request(app).get('/?page=2&limit=2');
    expect(res.body.data.length).toBe(1);
    expect(res.body.pagination.page).toBe(2);
  });

  it('should sort users by name descending', async () => {
    const res = await request(app).get('/?sortBy=name&order=desc');
    const names = res.body.data.map(u => u.name);
    expect(names[0]).toBe('Mehmet Kaya');
  });

});

describe('User Service - GET /:id', () => {

  it('should return a user by valid id', async () => {
    const res = await request(app).get('/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Ali Yılmaz');
    expect(res.body.email).toBe('ali@example.com');
    expect(res.body.phone).toBe('+90 532 111 2233');
    expect(res.body.role).toBe('admin');
  });

  it('should return 404 for non-existent user', async () => {
    const res = await request(app).get('/999');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 for invalid id format (string)', async () => {
    const res = await request(app).get('/abc');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

});

describe('User Service - POST /', () => {

  it('should create a new user with all fields', async () => {
    const res = await request(app)
      .post('/')
      .send({
        name: 'Fatma Şen',
        email: 'fatma@example.com',
        phone: '+90 536 999 0011',
        role: 'moderator'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Fatma Şen');
    expect(res.body.email).toBe('fatma@example.com');
    expect(res.body.phone).toBe('+90 536 999 0011');
    expect(res.body.role).toBe('moderator');
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.updatedAt).toBeDefined();
  });

  it('should create a user with only required fields', async () => {
    const res = await request(app)
      .post('/')
      .send({ name: 'MinUser', email: 'min@example.com' });
    expect(res.statusCode).toBe(201);
    expect(res.body.role).toBe('user');
    expect(res.body.phone).toBeNull();
  });

  it('should return 400 when name is missing', async () => {
    const res = await request(app)
      .post('/')
      .send({ email: 'test@example.com' });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 when email is missing', async () => {
    const res = await request(app)
      .post('/')
      .send({ name: 'Test' });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 when body is empty', async () => {
    const res = await request(app)
      .post('/')
      .send({});
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for empty string name', async () => {
    const res = await request(app)
      .post('/')
      .send({ name: '   ', email: 'test@example.com' });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for invalid email (no @)', async () => {
    const res = await request(app)
      .post('/')
      .send({ name: 'Test', email: 'invalidemail' });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for numeric name', async () => {
    const res = await request(app)
      .post('/')
      .send({ name: 12345, email: 'test@example.com' });
    expect(res.statusCode).toBe(400);
  });

  it('should return 409 for duplicate email', async () => {
    const res = await request(app)
      .post('/')
      .send({ name: 'Duplicate', email: 'ali@example.com' });
    expect(res.statusCode).toBe(409);
  });

  it('should return 400 for invalid role', async () => {
    const res = await request(app)
      .post('/')
      .send({ name: 'Test', email: 'role@example.com', role: 'superadmin' });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for invalid phone', async () => {
    const res = await request(app)
      .post('/')
      .send({ name: 'Test', email: 'phone@example.com', phone: 'not-a-phone' });
    expect(res.statusCode).toBe(400);
  });

  it('should trim whitespace from name and email', async () => {
    const res = await request(app)
      .post('/')
      .send({ name: '  Trimmed  ', email: '  trim@example.com  ' });
    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Trimmed');
    expect(res.body.email).toBe('trim@example.com');
  });

});

describe('User Service - PUT /:id', () => {

  it('should full-update a user', async () => {
    const res = await request(app)
      .put('/1')
      .send({ name: 'Ali Updated', email: 'ali_new@example.com', phone: '+90 532 000 0000', role: 'user' });
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Ali Updated');
    expect(res.body.email).toBe('ali_new@example.com');
    expect(res.body.phone).toBe('+90 532 000 0000');
    expect(res.body.role).toBe('user');
  });

  it('should return 400 when name is missing on PUT', async () => {
    const res = await request(app)
      .put('/1')
      .send({ email: 'ali@example.com' });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 when email is missing on PUT', async () => {
    const res = await request(app)
      .put('/1')
      .send({ name: 'Ali' });
    expect(res.statusCode).toBe(400);
  });

  it('should return 404 for non-existent user', async () => {
    const res = await request(app)
      .put('/999')
      .send({ name: 'Ghost', email: 'ghost@example.com' });
    expect(res.statusCode).toBe(404);
  });

  it('should return 400 for invalid id format', async () => {
    const res = await request(app)
      .put('/abc')
      .send({ name: 'Test', email: 'test@example.com' });
    expect(res.statusCode).toBe(400);
  });

  it('should return 409 for duplicate email update', async () => {
    const res = await request(app)
      .put('/1')
      .send({ name: 'Ali', email: 'ayse@example.com' });
    expect(res.statusCode).toBe(409);
  });

  it('should update updatedAt timestamp', async () => {
    const before = await request(app).get('/1');
    const res = await request(app)
      .put('/1')
      .send({ name: 'Ali Updated', email: 'ali@example.com' });
    expect(res.body.updatedAt).toBeDefined();
    // updatedAt should be a valid ISO date string
    expect(new Date(res.body.updatedAt).toISOString()).toBe(res.body.updatedAt);
    // createdAt should remain unchanged
    expect(res.body.createdAt).toBe(before.body.createdAt);
  });

});

describe('User Service - PATCH /:id', () => {

  it('should partially update user name', async () => {
    const res = await request(app)
      .patch('/1')
      .send({ name: 'Ali Güncel' });
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Ali Güncel');
    expect(res.body.email).toBe('ali@example.com'); // unchanged
  });

  it('should partially update user email', async () => {
    const res = await request(app)
      .patch('/1')
      .send({ email: 'ali_patch@example.com' });
    expect(res.statusCode).toBe(200);
    expect(res.body.email).toBe('ali_patch@example.com');
  });

  it('should partially update user role', async () => {
    const res = await request(app)
      .patch('/2')
      .send({ role: 'moderator' });
    expect(res.statusCode).toBe(200);
    expect(res.body.role).toBe('moderator');
  });

  it('should return 400 when no fields provided', async () => {
    const res = await request(app)
      .patch('/1')
      .send({});
    expect(res.statusCode).toBe(400);
  });

  it('should return 404 for non-existent user', async () => {
    const res = await request(app)
      .patch('/999')
      .send({ name: 'Ghost' });
    expect(res.statusCode).toBe(404);
  });

  it('should return 400 for empty string name', async () => {
    const res = await request(app)
      .patch('/1')
      .send({ name: '   ' });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for invalid email', async () => {
    const res = await request(app)
      .patch('/1')
      .send({ email: 'notanemail' });
    expect(res.statusCode).toBe(400);
  });

  it('should return 409 for duplicate email', async () => {
    const res = await request(app)
      .patch('/1')
      .send({ email: 'ayse@example.com' });
    expect(res.statusCode).toBe(409);
  });

  it('should return 400 for invalid role', async () => {
    const res = await request(app)
      .patch('/1')
      .send({ role: 'invalid_role' });
    expect(res.statusCode).toBe(400);
  });

});

describe('User Service - DELETE /:id', () => {

  it('should delete an existing user', async () => {
    const res = await request(app).delete('/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBeDefined();
    expect(res.body.user.id).toBe(1);

    // Verify deletion
    const getRes = await request(app).get('/1');
    expect(getRes.statusCode).toBe(404);
  });

  it('should return 404 for non-existent user', async () => {
    const res = await request(app).delete('/999');
    expect(res.statusCode).toBe(404);
  });

  it('should return 400 for invalid id format', async () => {
    const res = await request(app).delete('/abc');
    expect(res.statusCode).toBe(400);
  });

  it('should reduce user count after deletion', async () => {
    await request(app).delete('/1');
    const res = await request(app).get('/');
    expect(res.body.data.length).toBe(2);
  });

  it('should not allow deleting same user twice', async () => {
    await request(app).delete('/1');
    const res = await request(app).delete('/1');
    expect(res.statusCode).toBe(404);
  });

});
