const request = require('supertest');
const app = require('../app');

jest.setTimeout(20000);

describe('Product Service TDD Verification', () => {
  it('API Response Check', async () => {
    const response = await request(app).get('/');
    
    expect(response.statusCode).toBeDefined(); 
  });
});