const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');

jest.setTimeout(30000);

/**
 * @class ProductServiceTestSuite
 * @description Ürün servisinin CRUD API testlerini kapsülleyen test sınıfı.
 * OOP prensiplerine (Encapsulation) uygun olarak tasarlanmıştır.
 */
class ProductServiceTestSuite {
    constructor(appInstance) {
        this.app = appInstance;
        this.mongoServer = null;
    }

    async init() {
        this.mongoServer = await MongoMemoryServer.create();
        const uri = this.mongoServer.getUri();
        await this.app.connectDB(uri);
    }

    async cleanup() {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.dropDatabase();
            await mongoose.connection.close();
        }
        if (this.mongoServer) {
            await this.mongoServer.stop();
        }
    }

    async reset() {
        await this.app.resetData();
    }

    run() {
        beforeAll(() => this.init());
        beforeEach(() => this.reset());
        afterAll(() => this.cleanup());

        // ═══════════════════════════════════════════
        //  GET / — Tüm ürünleri listeleme
        // ═══════════════════════════════════════════
        describe('Product Service - GET /', () => {
            it('should return all products with pagination', async () => {
                const res = await request(this.app).get('/');
                expect(res.statusCode).toBe(200);
                expect(res.body.data).toBeInstanceOf(Array);
                expect(res.body.data.length).toBe(4); // 4 seed ürün
                expect(res.body.pagination).toBeDefined();
            });

            it('should return products with correct fields', async () => {
                const res = await request(this.app).get('/');
                const product = res.body.data[0];
                const fields = ['id', 'name', 'description', 'price', 'category', 'stock', 'createdAt', 'updatedAt'];
                fields.forEach(field => expect(product).toHaveProperty(field));
            });

            it('should search products by name', async () => {
                const res = await request(this.app).get('/?search=laptop');
                expect(res.body.data.length).toBeGreaterThanOrEqual(1);
                expect(res.body.data[0].name).toMatch(/Laptop/i);
            });

            it('should filter products by category', async () => {
                const res = await request(this.app).get('/?category=Elektronik');
                res.body.data.forEach(p => expect(p.category).toBe('Elektronik'));
            });

            it('should filter products by price range', async () => {
                const res = await request(this.app).get('/?minPrice=5000&maxPrice=16000');
                res.body.data.forEach(p => {
                    expect(p.price).toBeGreaterThanOrEqual(5000);
                    expect(p.price).toBeLessThanOrEqual(16000);
                });
            });

            it('should paginate results', async () => {
                const res = await request(this.app).get('/?page=1&limit=2');
                expect(res.body.data.length).toBe(2);
                expect(res.body.pagination.totalPages).toBe(2);
            });

            it('should sort products by price ascending', async () => {
                const res = await request(this.app).get('/?sortBy=price&order=asc');
                const prices = res.body.data.map(p => p.price);
                for (let i = 1; i < prices.length; i++) {
                    expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
                }
            });
        });

        // ═══════════════════════════════════════════
        //  GET /:id — Tekil ürün getirme
        // ═══════════════════════════════════════════
        describe('Product Service - GET /:id', () => {
            it('should return a product by valid id', async () => {
                const res = await request(this.app).get('/1');
                expect(res.statusCode).toBe(200);
                expect(res.body.name).toBe('Laptop');
            });

            it('should return 404 for non-existent product', async () => {
                const res = await request(this.app).get('/999');
                expect(res.statusCode).toBe(404);
                expect(res.body.error).toBeDefined();
            });

            it('should return 400 for invalid id format', async () => {
                const res = await request(this.app).get('/abc');
                expect(res.statusCode).toBe(400);
            });
        });

        // ═══════════════════════════════════════════
        //  POST / — Yeni ürün oluşturma
        // ═══════════════════════════════════════════
        describe('Product Service - POST /', () => {
            it('should create a new product with all fields', async () => {
                const newProduct = {
                    name: 'Tablet',
                    description: '10.5 inç, 256GB',
                    price: 6000,
                    category: 'Elektronik',
                    stock: 50
                };
                const res = await request(this.app).post('/').send(newProduct);
                expect(res.statusCode).toBe(201);
                expect(res.body.name).toBe('Tablet');
                expect(res.body.id).toBeDefined();
            });

            it('should create a product with minimum required fields', async () => {
                const res = await request(this.app)
                    .post('/')
                    .send({ name: 'Minimal Ürün', price: 100 });
                expect(res.statusCode).toBe(201);
                expect(res.body.category).toBe('Diğer');
                expect(res.body.stock).toBe(0);
            });

            it('should return 400 for missing name', async () => {
                const res = await request(this.app)
                    .post('/')
                    .send({ price: 100 });
                expect(res.statusCode).toBe(400);
            });

            it('should return 400 for missing price', async () => {
                const res = await request(this.app)
                    .post('/')
                    .send({ name: 'No Price' });
                expect(res.statusCode).toBe(400);
            });

            it('should return 400 for negative price', async () => {
                const res = await request(this.app)
                    .post('/')
                    .send({ name: 'Negative', price: -50 });
                expect(res.statusCode).toBe(400);
            });

            it('should return 400 for invalid category', async () => {
                const res = await request(this.app)
                    .post('/')
                    .send({ name: 'Bad Cat', price: 100, category: 'InvalidCat' });
                expect(res.statusCode).toBe(400);
            });

            it('should return 400 for negative stock', async () => {
                const res = await request(this.app)
                    .post('/')
                    .send({ name: 'Neg Stock', price: 100, stock: -5 });
                expect(res.statusCode).toBe(400);
            });

            it('should trim whitespace from name', async () => {
                const res = await request(this.app)
                    .post('/')
                    .send({ name: '  Trimmed Product  ', price: 200 });
                expect(res.body.name).toBe('Trimmed Product');
            });
        });

        // ═══════════════════════════════════════════
        //  PUT /:id — Tam güncelleme
        // ═══════════════════════════════════════════
        describe('Product Service - PUT /:id', () => {
            it('should full-update a product via PUT', async () => {
                const update = { name: 'Laptop Pro', price: 20000, category: 'Elektronik', stock: 10 };
                const res = await request(this.app).put('/1').send(update);
                expect(res.statusCode).toBe(200);
                expect(res.body.name).toBe('Laptop Pro');
                expect(res.body.price).toBe(20000);
            });

            it('should return 404 for updating non-existent product', async () => {
                const res = await request(this.app)
                    .put('/999')
                    .send({ name: 'Ghost', price: 100 });
                expect(res.statusCode).toBe(404);
            });

            it('should return 400 for PUT without required fields', async () => {
                const res = await request(this.app).put('/1').send({ name: 'NoPrice' });
                expect(res.statusCode).toBe(400);
            });
        });

        // ═══════════════════════════════════════════
        //  PATCH /:id — Kısmi güncelleme
        // ═══════════════════════════════════════════
        describe('Product Service - PATCH /:id', () => {
            it('should partial-update price via PATCH', async () => {
                const res = await request(this.app).patch('/1').send({ price: 18000 });
                expect(res.statusCode).toBe(200);
                expect(res.body.price).toBe(18000);
                expect(res.body.name).toBe('Laptop'); // Diğer alanlar korunmalı
            });

            it('should partial-update stock via PATCH', async () => {
                const res = await request(this.app).patch('/2').send({ stock: 999 });
                expect(res.body.stock).toBe(999);
            });

            it('should return 400 for empty PATCH body', async () => {
                const res = await request(this.app).patch('/1').send({});
                expect(res.statusCode).toBe(400);
            });

            it('should return 404 for patching non-existent product', async () => {
                const res = await request(this.app).patch('/999').send({ price: 100 });
                expect(res.statusCode).toBe(404);
            });
        });

        // ═══════════════════════════════════════════
        //  DELETE /:id — Ürün silme
        // ═══════════════════════════════════════════
        describe('Product Service - DELETE /:id', () => {
            it('should delete an existing product', async () => {
                const res = await request(this.app).delete('/1');
                expect(res.statusCode).toBe(200);
                const check = await request(this.app).get('/1');
                expect(check.statusCode).toBe(404);
            });

            it('should return 404 for deleting non-existent product', async () => {
                const res = await request(this.app).delete('/999');
                expect(res.statusCode).toBe(404);
            });

            it('should return 400 for invalid id format', async () => {
                const res = await request(this.app).delete('/abc');
                expect(res.statusCode).toBe(400);
            });
        });

        // ═══════════════════════════════════════════
        //  Health Check
        // ═══════════════════════════════════════════
        describe('Product Service - Health Check', () => {
            it('GET /health should return status UP', async () => {
                const res = await request(this.app).get('/health');
                expect(res.statusCode).toBe(200);
                expect(res.body.status).toBe('UP');
                expect(res.body.service).toBe('product-service');
                expect(res.body.database).toBeDefined();
            });
        });
    }
}

const testSuite = new ProductServiceTestSuite(app);
testSuite.run();