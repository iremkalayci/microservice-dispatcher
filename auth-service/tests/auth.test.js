const request = require('supertest');
const app = require('../app'); 

describe('Auth Service Basic Tests', () => {
  it('Should verify that auth service is up', async () => {
    
    const response = await request(app).get('/'); 
    expect(response.statusCode).toBeDefined();
  });
});
