jest.setTimeout(30000);
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

/**
 * @class OrderServiceTestSuite
 * @description Sipariş servisinin API testlerini kapsülleyen test sınıfı.
 * OOP prensiplerine (Encapsulation) uygun olarak tasarlanmıştır.
 */
class OrderServiceTestSuite {
  constructor() {
    this.app = null;
    this.mongoServer = null;
    this.baseRoute = '/orders';
  }

  async init() {
    this.mongoServer = await MongoMemoryServer.create();
    const uri = this.mongoServer.getUri();
    await mongoose.connect(uri);
    this.app = require('./app');
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

  runTests() {
    beforeAll(() => this.init());
    beforeEach(() => this.resetDB());
    afterAll(() => this.cleanup());

    describe('Order Service - POST /orders', () => {
      it('should create a new order with valid data', async () => {
        const newOrder = {
          userId: "101",
          productId: "202",
          quantity: 2
        };

        const response = await request(this.app)
          .post(this.baseRoute)
          .send(newOrder);

        expect(response.statusCode).toBe(201);
        expect(response.body.userId).toBe("101");
        expect(response.body.productId).toBe("202");
        expect(response.body.quantity).toBe(2);
        expect(response.body.status).toBe('Hazırlanıyor');
        expect(response.body._id).toBeDefined();
      });

      it('should set default quantity to 1', async () => {
        const response = await request(this.app)
          .post(this.baseRoute)
          .send({ userId: "101", productId: "303" });

        expect(response.statusCode).toBe(201);
        expect(response.body.quantity).toBe(1);
      });

      it('should return 400 for missing userId', async () => {
        const response = await request(this.app)
          .post(this.baseRoute)
          .send({ productId: "202", quantity: 1 });

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBeDefined();
      });

      it('should return 400 for missing productId', async () => {
        const response = await request(this.app)
          .post(this.baseRoute)
          .send({ userId: "101", quantity: 1 });

        expect(response.statusCode).toBe(400);
        expect(response.body.error).toBeDefined();
      });

      it('should include timestamps in created order', async () => {
        const response = await request(this.app)
          .post(this.baseRoute)
          .send({ userId: "101", productId: "202" });

        expect(response.statusCode).toBe(201);
        expect(response.body.createdAt).toBeDefined();
        expect(response.body.updatedAt).toBeDefined();
      });
    });

    describe('Order Service - GET /orders', () => {
      it('should return empty array when no orders exist', async () => {
        const response = await request(this.app).get(this.baseRoute);
        expect(response.statusCode).toBe(200);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBe(0);
      });

      it('should return all orders after creating some', async () => {
        // Önce 3 sipariş oluştur
        await request(this.app).post(this.baseRoute).send({ userId: "1", productId: "10" });
        await request(this.app).post(this.baseRoute).send({ userId: "2", productId: "20" });
        await request(this.app).post(this.baseRoute).send({ userId: "3", productId: "30" });

        const response = await request(this.app).get(this.baseRoute);
        expect(response.statusCode).toBe(200);
        expect(response.body.data).toHaveLength(3);
      });

      it('should return orders with correct structure', async () => {
        await request(this.app).post(this.baseRoute)
          .send({ userId: "1", productId: "10", quantity: 5 });

        const response = await request(this.app).get(this.baseRoute);
        const order = response.body.data[0];
        expect(order.userId).toBe("1");
        expect(order.productId).toBe("10");
        expect(order.quantity).toBe(5);
        expect(order.status).toBe('Hazırlanıyor');
      });
    });
  }
}

const testSuite = new OrderServiceTestSuite();
testSuite.runTests();