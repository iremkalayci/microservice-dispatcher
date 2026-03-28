const request = require('supertest');
const app = require('../app');

beforeEach(() => {
  app.resetData();
});

describe('Product Service - GET /', () => {

  it('should return all products', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBe(2);
  });

  it('should return products with correct fields', async () => {
    const res = await request(app).get('/');
    expect(res.body[0]).toHaveProperty('id');
    expect(res.body[0]).toHaveProperty('name');
    expect(res.body[0]).toHaveProperty('price');
  });

  it('should include default products', async () => {
    const res = await request(app).get('/');
    const names = res.body.map(p => p.name);
    expect(names).toContain('Laptop');
    expect(names).toContain('Telefon');
  });

});

describe('Product Service - GET /:id', () => {

  it('should return a product by valid id', async () => {
    const res = await request(app).get('/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Laptop');
    expect(res.body.price).toBe(15000);
  });

  it('should return 404 for non-existent product', async () => {
    const res = await request(app).get('/999');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 for invalid id format (string)', async () => {
    const res = await request(app).get('/abc');
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('should return 400 for special character id', async () => {
    const res = await request(app).get('/%23%24');
    expect(res.statusCode).toBe(400);
  });

});

describe('Product Service - POST /', () => {

  it('should create a new product with valid data', async () => {
    const res = await request(app)
      .post('/')
      .send({ name: 'Tablet', price: 5000 });
    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Tablet');
    expect(res.body.price).toBe(5000);
    expect(res.body.id).toBeDefined();
  });

  it('should return 400 when name is missing', async () => {
    const res = await request(app)
      .post('/')
      .send({ price: 1000 });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 when price is missing', async () => {
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
      .send({ name: '   ', price: 1000 });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for negative price', async () => {
    const res = await request(app)
      .post('/')
      .send({ name: 'Negative', price: -100 });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for string price', async () => {
    const res = await request(app)
      .post('/')
      .send({ name: 'StringPrice', price: 'expensive' });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for numeric name', async () => {
    const res = await request(app)
      .post('/')
      .send({ name: 12345, price: 100 });
    expect(res.statusCode).toBe(400);
  });

  it('should accept zero price', async () => {
    const res = await request(app)
      .post('/')
      .send({ name: 'Free Item', price: 0 });
    expect(res.statusCode).toBe(201);
    expect(res.body.price).toBe(0);
  });

  it('should trim whitespace from name', async () => {
    const res = await request(app)
      .post('/')
      .send({ name: '  Trimmed Product  ', price: 500 });
    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Trimmed Product');
  });

  it('should increment id for each new product', async () => {
    const res1 = await request(app)
      .post('/')
      .send({ name: 'Product A', price: 100 });
    const res2 = await request(app)
      .post('/')
      .send({ name: 'Product B', price: 200 });
    expect(res2.body.id).toBe(res1.body.id + 1);
  });

});

describe('Product Service - PUT /:id', () => {

  it('should update product name', async () => {
    const res = await request(app)
      .put('/1')
      .send({ name: 'Gaming Laptop' });
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Gaming Laptop');
    expect(res.body.price).toBe(15000);
  });

  it('should update product price', async () => {
    const res = await request(app)
      .put('/1')
      .send({ price: 20000 });
    expect(res.statusCode).toBe(200);
    expect(res.body.price).toBe(20000);
  });

  it('should update both name and price', async () => {
    const res = await request(app)
      .put('/1')
      .send({ name: 'Super Laptop', price: 25000 });
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Super Laptop');
    expect(res.body.price).toBe(25000);
  });

  it('should return 404 for non-existent product', async () => {
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

  it('should return 400 for negative price update', async () => {
    const res = await request(app)
      .put('/1')
      .send({ price: -500 });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for string price update', async () => {
    const res = await request(app)
      .put('/1')
      .send({ price: 'free' });
    expect(res.statusCode).toBe(400);
  });

  it('should allow updating price to zero', async () => {
    const res = await request(app)
      .put('/1')
      .send({ price: 0 });
    expect(res.statusCode).toBe(200);
    expect(res.body.price).toBe(0);
  });

});

describe('Product Service - DELETE /:id', () => {

  it('should delete an existing product', async () => {
    const res = await request(app).delete('/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBeDefined();
    expect(res.body.product.id).toBe(1);

    // Verify deletion
    const getRes = await request(app).get('/1');
    expect(getRes.statusCode).toBe(404);
  });

  it('should return 404 for non-existent product', async () => {
    const res = await request(app).delete('/999');
    expect(res.statusCode).toBe(404);
  });

  it('should return 400 for invalid id format', async () => {
    const res = await request(app).delete('/abc');
    expect(res.statusCode).toBe(400);
  });

  it('should reduce product count after deletion', async () => {
    await request(app).delete('/1');
    const res = await request(app).get('/');
    expect(res.body.length).toBe(1);
  });

  it('should not allow deleting same product twice', async () => {
    await request(app).delete('/2');
    const res = await request(app).delete('/2');
    expect(res.statusCode).toBe(404);
  });

});
