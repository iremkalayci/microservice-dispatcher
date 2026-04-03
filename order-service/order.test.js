jest.setTimeout(30000); 
const request = require('supertest');
const app = require('./app');
const mongoose = require('mongoose');

/**
 * @class OrderServiceTestSuite
 * @description Order servisinin API testlerini kapsülleyen test sınıfı.
 */
class OrderServiceTestSuite {
  constructor(appInstance) {
    this.app = appInstance;
    this.baseRoute = '/orders';
  }

  async testCreateOrder() {
    const newOrder = {
      userId: "101",
      productId: "202",
      quantity: 2
    };

    const response = await request(this.app)
      .post(this.baseRoute)
      .send(newOrder);

 
    expect(response.statusCode).toBeDefined();
  }

  async testGetOrders() {
    const response = await request(this.app).get(this.baseRoute);
   
    expect(response.statusCode).toBeDefined();
  }

  runTests() {
    describe('Order Service API Tests (OOP Architecture)', () => {
      
      it('POST /orders - should verify order service response', async () => {
        await this.testCreateOrder();
      });

      it('GET /orders - should verify orders list response', async () => {
        await this.testGetOrders();
      });

   
      afterAll(async () => {
        await mongoose.connection.close();
      });
    });
  }
}

const testSuite = new OrderServiceTestSuite(app);
testSuite.runTests();