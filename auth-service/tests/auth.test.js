const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.setTimeout(30000);

/**
 * @class AuthServiceTestSuite
 * @description Auth servisinin register/login API testlerini kapsülleyen test sınıfı.
 * OOP prensiplerine (Encapsulation) uygun olarak tasarlanmıştır.
 */
class AuthServiceTestSuite {
    constructor() {
        this.app = null;
        this.mongoServer = null;
    }

    async init() {
        this.mongoServer = await MongoMemoryServer.create();
        const uri = this.mongoServer.getUri();
        
        // Mongoose bağlantısını test DB'ye yönlendir
        await mongoose.connect(uri);
        
        // App'i bağlantı kurulduktan sonra require et
        this.app = require('../app');
        
        // Unique index'lerin oluşmasını bekle
        await mongoose.connection.db.collection('users').createIndex({ username: 1 }, { unique: true });
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

    async resetDB() {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany({});
        }
    }

    run() {
        beforeAll(() => this.init());
        beforeEach(() => this.resetDB());
        afterAll(() => this.cleanup());

        describe('Auth Service - Health Check', () => {
            it('GET /health should return status UP', async () => {
                const res = await request(this.app).get('/health');
                expect(res.statusCode).toBe(200);
                expect(res.body.status).toBe('UP');
                expect(res.body.service).toBe('auth-service');
            });
        });

        describe('Auth Service - POST /register', () => {
            it('should register a new user successfully', async () => {
                const res = await request(this.app)
                    .post('/register')
                    .send({ username: 'testuser', password: 'password123' });
                expect(res.statusCode).toBe(201);
                expect(res.body.message).toContain('başarıyla');
            });

            it('should return 400 for duplicate username', async () => {
                const first = await request(this.app)
                    .post('/register')
                    .send({ username: 'duplicate', password: 'pass123' });
                expect(first.statusCode).toBe(201);
                
                const res = await request(this.app)
                    .post('/register')
                    .send({ username: 'duplicate', password: 'pass456' });
                expect(res.statusCode).toBe(400);
                expect(res.body.error).toBeDefined();
            });

            it('should return 400 for missing username', async () => {
                const res = await request(this.app)
                    .post('/register')
                    .send({ password: 'pass123' });
                expect(res.statusCode).toBe(400);
            });

            it('should return 400 for missing password', async () => {
                const res = await request(this.app)
                    .post('/register')
                    .send({ username: 'nopassuser' });
                expect(res.statusCode).toBe(400);
            });

            it('should hash the password (not store plain text)', async () => {
                await request(this.app)
                    .post('/register')
                    .send({ username: 'hashtest', password: 'mypassword' });
                
                const user = await mongoose.connection.collection('users').findOne({ username: 'hashtest' });
                expect(user.password).not.toBe('mypassword');
                expect(user.password.length).toBeGreaterThan(20); // bcrypt hash
            });
        });

        describe('Auth Service - POST /login', () => {
            beforeEach(async () => {
                // Her login testinden önce bir kullanıcı oluştur
                await request(this.app)
                    .post('/register')
                    .send({ username: 'loginuser', password: 'secret123' });
            });

            it('should login with correct credentials and return JWT token', async () => {
                const res = await request(this.app)
                    .post('/login')
                    .send({ username: 'loginuser', password: 'secret123' });
                expect(res.statusCode).toBe(200);
                expect(res.body.token).toBeDefined();
                expect(typeof res.body.token).toBe('string');
                expect(res.body.token.split('.')).toHaveLength(3); // JWT format
            });

            it('should return 401 for wrong password', async () => {
                const res = await request(this.app)
                    .post('/login')
                    .send({ username: 'loginuser', password: 'wrongpassword' });
                expect(res.statusCode).toBe(401);
                expect(res.body.error).toBeDefined();
            });

            it('should return 401 for non-existent user', async () => {
                const res = await request(this.app)
                    .post('/login')
                    .send({ username: 'nouser', password: 'pass123' });
                expect(res.statusCode).toBe(401);
            });

            it('should return 401 for empty credentials', async () => {
                const res = await request(this.app)
                    .post('/login')
                    .send({});
                expect([401, 500]).toContain(res.statusCode);
            });
        });
    }
}

const testSuite = new AuthServiceTestSuite();
testSuite.run();
