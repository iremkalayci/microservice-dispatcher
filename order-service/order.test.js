const request = require('supertest');
const app = require('./app'); // app.js henüz yok, bilerek hata verecek!

describe('Order Service API Tests', () => {
  
  // 1. Yeni sipariş oluşturma testi
  it('POST /orders - should create a new order and return 201', async () => {
    const newOrder = {
      userId: "101",
      productId: "202",
      quantity: 2
    };

    const response = await request(app)
      .post('/orders')
      .send(newOrder);

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('status', 'Hazırlanıyor');
  });

  // 2. Siparişleri listeleme testi
  it('GET /orders - should return all orders', async () => {
    const response = await request(app).get('/orders');
    
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body.data)).toBeTruthy();
  });
});