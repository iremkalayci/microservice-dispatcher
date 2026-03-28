const request = require('supertest');
const app = require('../app');

beforeEach(() => {
  app.resetData();
});

describe('Product Service - GET /', () => {

  it('should return all products with pagination', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBe(4);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBe(4);
  });

  it('should return products with correct fields', async () => {
    const res = await request(app).get('/');
    const product = res.body.data[0];
    expect(product).toHaveProperty('id');
    expect(product).toHaveProperty('name');
    expect(product).toHaveProperty('description');
    expect(product).toHaveProperty('price');
    expect(product).toHaveProperty('category');
    expect(product).toHaveProperty('stock');
    expect(product).toHaveProperty('createdAt');
    expect(product).toHaveProperty('updatedAt');
  });

  it('should search products by name', async () => {
    const res = await request(app).get('/?search=laptop');
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe('Laptop');
  });

  it('should search products by description', async () => {
    const res = await request(app).get('/?search=kablosuz');
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe('Kulaklık');
  });

  it('should filter products by category', async () => {
    const res = await request(app).get('/?category=Elektronik');
    expect(res.body.data.length).toBe(3);
  });

  it('should filter products by min price', async () => {
    const res = await request(app).get('/?minPrice=10000');
    expect(res.body.data.length).toBe(2);
  });

  it('should filter products by max price', async () => {
    const res = await request(app).get('/?maxPrice=5000');
    expect(res.body.data.length).toBe(1);
  });

  it('should filter products by price range', async () => {
    const res = await request(app).get('/?minPrice=5000&maxPrice=10000');
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe('Telefon');
  });

  it('should filter by stock availability', async () => {
    const res = await request(app).get('/?inStock=true');
    expect(res.body.data.length).toBe(4);
  });

  it('should paginate results', async () => {
    const res = await request(app).get('/?page=1&limit=2');
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination.totalPages).toBe(2);
  });

  it('should sort by price descending', async () => {
    const res = await request(app).get('/?sortBy=price&order=desc');
    expect(res.body.data[0].name).toBe('Laptop');
  });

  it('should include default products', async () => {
    const res = await request(app).get('/');
    const names = res.body.data.map(p => p.name);
    expect(names).toContain('Laptop');
    expect(names).toContain('Telefon');
    expect(names).toContain('Kulaklık');
    expect(names).toContain('Monitör');
  });

});

describe('Product Service - GET /:id', () => {

  it('should return a product by valid id', async () => {
    const res = await request(app).get('/1');
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Laptop');
    expect(res.body.price).toBe(15000);
    expect(res.body.category).toBe('Elektronik');
    expect(res.body.stock).toBe(25);
    expect(res.body.description).toBeDefined();
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

  it('should create a new product with all fields', async () => {
    const res = await request(app)
      .post('/')
      .send({
        name: 'Tablet',
        description: '10 inç ekran, kalem destekli',
        price: 5000,
        category: 'Elektronik',
        stock: 50
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Tablet');
    expect(res.body.description).toBe('10 inç ekran, kalem destekli');
    expect(res.body.price).toBe(5000);
    expect(res.body.category).toBe('Elektronik');
    expect(res.body.stock).toBe(50);
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
  });

  it('should create a product with only required fields', async () => {
    const res = await request(app)
      .post('/')
      .send({ name: 'Basic', price: 100 });
    expect(res.statusCode).toBe(201);
    expect(res.body.category).toBe('Diğer');
    expect(res.body.stock).toBe(0);
    expect(res.body.description).toBe('');
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

  it('should return 400 for invalid category', async () => {
    const res = await request(app)
      .post('/')
      .send({ name: 'Test', price: 100, category: 'InvalidCategory' });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for negative stock', async () => {
    const res = await request(app)
      .post('/')
      .send({ name: 'Test', price: 100, stock: -5 });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for non-integer stock', async () => {
    const res = await request(app)
      .post('/')
      .send({ name: 'Test', price: 100, stock: 2.5 });
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

  it('should full-update a product', async () => {
    const res = await request(app)
      .put('/1')
      .send({
        name: 'Gaming Laptop',
        description: 'RTX 4080, 32GB RAM',
        price: 35000,
        category: 'Elektronik',
        stock: 10
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Gaming Laptop');
    expect(res.body.description).toBe('RTX 4080, 32GB RAM');
    expect(res.body.price).toBe(35000);
    expect(res.body.stock).toBe(10);
  });

  it('should return 400 when name is missing on PUT', async () => {
    const res = await request(app)
      .put('/1')
      .send({ price: 20000 });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 when price is missing on PUT', async () => {
    const res = await request(app)
      .put('/1')
      .send({ name: 'Updated' });
    expect(res.statusCode).toBe(400);
  });

  it('should return 404 for non-existent product', async () => {
    const res = await request(app)
      .put('/999')
      .send({ name: 'Ghost', price: 100 });
    expect(res.statusCode).toBe(404);
  });

  it('should return 400 for invalid id format', async () => {
    const res = await request(app)
      .put('/abc')
      .send({ name: 'Test', price: 100 });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for negative price on PUT', async () => {
    const res = await request(app)
      .put('/1')
      .send({ name: 'Test', price: -500 });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for invalid category on PUT', async () => {
    const res = await request(app)
      .put('/1')
      .send({ name: 'Test', price: 100, category: 'BadCat' });
    expect(res.statusCode).toBe(400);
  });

  it('should update updatedAt timestamp', async () => {
    const before = await request(app).get('/1');
    const res = await request(app)
      .put('/1')
      .send({ name: 'Updated', price: 20000 });
    expect(res.body.updatedAt).not.toBe(before.body.updatedAt);
  });

});

describe('Product Service - PATCH /:id', () => {

  it('should partially update product name', async () => {
    const res = await request(app)
      .patch('/1')
      .send({ name: 'Gaming Laptop' });
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Gaming Laptop');
    expect(res.body.price).toBe(15000); // unchanged
  });

  it('should partially update product price', async () => {
    const res = await request(app)
      .patch('/1')
      .send({ price: 20000 });
    expect(res.statusCode).toBe(200);
    expect(res.body.price).toBe(20000);
  });

  it('should partially update product stock', async () => {
    const res = await request(app)
      .patch('/1')
      .send({ stock: 50 });
    expect(res.statusCode).toBe(200);
    expect(res.body.stock).toBe(50);
  });

  it('should partially update product category', async () => {
    const res = await request(app)
      .patch('/3')
      .send({ category: 'Elektronik' });
    expect(res.statusCode).toBe(200);
    expect(res.body.category).toBe('Elektronik');
  });

  it('should partially update description', async () => {
    const res = await request(app)
      .patch('/1')
      .send({ description: 'Yeni açıklama' });
    expect(res.statusCode).toBe(200);
    expect(res.body.description).toBe('Yeni açıklama');
  });

  it('should return 400 when no fields provided', async () => {
    const res = await request(app)
      .patch('/1')
      .send({});
    expect(res.statusCode).toBe(400);
  });

  it('should return 404 for non-existent product', async () => {
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

  it('should return 400 for negative price', async () => {
    const res = await request(app)
      .patch('/1')
      .send({ price: -500 });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for string price', async () => {
    const res = await request(app)
      .patch('/1')
      .send({ price: 'free' });
    expect(res.statusCode).toBe(400);
  });

  it('should return 400 for invalid category', async () => {
    const res = await request(app)
      .patch('/1')
      .send({ category: 'InvalidCat' });
    expect(res.statusCode).toBe(400);
  });

  it('should allow updating price to zero', async () => {
    const res = await request(app)
      .patch('/1')
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
    expect(res.body.data.length).toBe(3);
  });

  it('should not allow deleting same product twice', async () => {
    await request(app).delete('/2');
    const res = await request(app).delete('/2');
    expect(res.statusCode).toBe(404);
  });

});
