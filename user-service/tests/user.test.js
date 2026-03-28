const request = require('supertest');
const app = require('../app');

beforeEach(() => {
  app.resetData();
});

describe('User Service - GET /', () => {

  it('should return all users', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBe(2);
  });

  it('should return users with correct fields', async () => {
    const res = await request(app).get('/');
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0]).toHaveProperty('name');
    expect(res.body[0]).toHaveProperty('email');
  });

});

describe('User Service - GET /:id', () => {

  it('should return a user by valid id', async () => {
    const res = await request(app).get('/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Ali');
    expect(res.body.email).toBe('ali@example.com');
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

  it('should create a new user with valid data', async () => {
    const res = await request(app)
      .post('/')
      .send({ name: 'Mehmet', email: 'mehmet@example.com' });
    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Mehmet');
    expect(res.body.email).toBe('mehmet@example.com');
    expect(res.body.id).toBeDefined();
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

  it('should update user name', async () => {
    const res = await request(app)
      .put('/1')
      .send({ name: 'Ali Updated' });
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Ali Updated');
    expect(res.body.email).toBe('ali@example.com');
  });

  it('should update user email', async () => {
    const res = await request(app)
      .put('/1')
      .send({ email: 'ali_new@example.com' });
    expect(res.statusCode).toBe(200);
    expect(res.body.email).toBe('ali_new@example.com');
  });

  it('should update both name and email', async () => {
    const res = await request(app)
      .put('/1')
      .send({ name: 'New Ali', email: 'newali@example.com' });
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('New Ali');
    expect(res.body.email).toBe('newali@example.com');
  });

  it('should return 404 for non-existent user', async () => {
    const res = await request(app)
      .put('/999')
      .send({ name: 'Ghost' });
    expect(res.statusCode).toBe(404);
  });

  it('should return 400 for invalid id format', async () => {
    const res = await request(app)
      .put('/abc')
      .send({ name: 'Test' });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 when no fields provided', async () => {
    const res = await request(app)
      .put('/1')
      .send({});
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for empty string name update', async () => {
    const res = await request(app)
      .put('/1')
      .send({ name: '   ' });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for invalid email update', async () => {
    const res = await request(app)
      .put('/1')
      .send({ email: 'notanemail' });
    expect(res.statusCode).toBe(400);
  });

  it('should return 409 for duplicate email update', async () => {
    const res = await request(app)
      .put('/1')
      .send({ email: 'ayse@example.com' });
    expect(res.statusCode).toBe(409);
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
    expect(res.body.length).toBe(1);
  });

  it('should not allow deleting same user twice', async () => {
    await request(app).delete('/1');
    const res = await request(app).delete('/1');
    expect(res.statusCode).toBe(404);
  });

});
