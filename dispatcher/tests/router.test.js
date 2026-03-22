const request = require('supertest');
const app = require('../app');

describe('Dispatcher Routing', () => {

  it('should return 401 without token', async () => {
    const res = await request(app).get('/users');
    expect(res.statusCode).toBe(401);
  });

});