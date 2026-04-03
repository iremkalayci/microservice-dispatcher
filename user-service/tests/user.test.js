const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../app');

class UserServiceTestSuite {
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

        describe('User Service - GET /', () => {
            it('should return all users with pagination', async () => {
                const res = await request(this.app).get('/');
                expect(res.statusCode).toBe(200);
                expect(res.body.data).toBeInstanceOf(Array);
                expect(res.body.data.length).toBe(3);
                expect(res.body.pagination).toBeDefined();
            });

            it('should return users with correct fields', async () => {
                const res = await request(this.app).get('/');
                const user = res.body.data[0];
                const fields = ['id', 'name', 'email', 'phone', 'role', 'createdAt', 'updatedAt'];
                fields.forEach(field => expect(user).toHaveProperty(field));
            });

            it('should search users by name', async () => {
                const res = await request(this.app).get('/?search=ali');
                expect(res.body.data[0].name).toMatch(/Ali/i);
            });

            it('should filter users by role', async () => {
                const res = await request(this.app).get('/?role=admin');
                expect(res.body.data[0].role).toBe('admin');
            });

            it('should paginate results', async () => {
                const res = await request(this.app).get('/?page=1&limit=2');
                expect(res.body.data.length).toBe(2);
                expect(res.body.pagination.totalPages).toBe(2);
            });
        });

        describe('User Service - GET /:id', () => {
            it('should return a user by valid id', async () => {
                const res = await request(this.app).get('/1');
                expect(res.statusCode).toBe(200);
                expect(res.body.name).toBe('Ali Yılmaz');
            });

            it('should return 404 for non-existent user', async () => {
                const res = await request(this.app).get('/999');
                expect(res.statusCode).toBe(404);
            });
        });

        describe('User Service - POST /', () => {
            it('should create a new user with all fields', async () => {
                const newUser = {
                    name: 'Fatma Şen',
                    email: 'fatma@example.com',
                    phone: '+90 536 999 0011',
                    role: 'moderator'
                };
                const res = await request(this.app).post('/').send(newUser);
                expect(res.statusCode).toBe(201);
                expect(res.body.name).toBe(newUser.name);
            });

            it('should return 409 for duplicate email', async () => {
                const res = await request(this.app)
                    .post('/')
                    .send({ name: 'Duplicate', email: 'ali@example.com' });
                expect(res.statusCode).toBe(409);
            });

            it('should return 400 for invalid email', async () => {
                const res = await request(this.app)
                    .post('/')
                    .send({ name: 'Test', email: 'invalid' });
                expect(res.statusCode).toBe(400);
            });

            it('should trim whitespace from input', async () => {
                const res = await request(this.app)
                    .post('/')
                    .send({ name: '  Trim  ', email: ' trim@test.com ' });
                expect(res.body.name).toBe('Trim');
            });
        });

        describe('User Service - PUT & PATCH', () => {
            it('should full-update a user via PUT', async () => {
                const update = { name: 'Ali Upd', email: 'ali_up@test.com', phone: '+90 505 555 5555', role: 'user' };
                const res = await request(this.app).put('/1').send(update);
                expect(res.statusCode).toBe(200);
                expect(res.body.name).toBe(update.name);
            });

            it('should partial-update via PATCH', async () => {
                const res = await request(this.app).patch('/1').send({ name: 'Ali Patch' });
                expect(res.body.name).toBe('Ali Patch');
                expect(res.body.email).toBe('ali@example.com');
            });
        });

        describe('User Service - DELETE', () => {
            it('should delete an existing user', async () => {
                const res = await request(this.app).delete('/1');
                expect(res.statusCode).toBe(200);
                const check = await request(this.app).get('/1');
                expect(check.statusCode).toBe(404);
            });

            it('should return 404 for deleting non-existent user', async () => {
                const res = await request(this.app).delete('/999');
                expect(res.statusCode).toBe(404);
            });
        });
    }
}

const testSuite = new UserServiceTestSuite(app);

testSuite.run();