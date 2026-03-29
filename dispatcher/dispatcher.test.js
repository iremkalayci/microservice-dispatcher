const request = require('supertest');
const dispatcher = require('./app'); // Az önce oluşturduğumuz sınıf

describe('Dispatcher TDD Tests', () => {
    it('Bilet (Token) olmadan /users servisine erişilememeli', async () => {
        const res = await request(dispatcher.app).get('/users');
        expect(res.statusCode).toEqual(401); // Yetkisiz erişim testi
    });

    it('Health Check 200 OK dönmeli', async () => {
        const res = await request(dispatcher.app).get('/health');
        expect(res.statusCode).toEqual(200);
    });
});