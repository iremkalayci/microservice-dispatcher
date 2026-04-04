const app = require('./app');

/**
 * @class DispatcherServer
 * @description API Gateway (Dispatcher) birimini başlatan Bootstrap sınıfı.
 * Sorumlulukların ayrılması (Separation of Concerns) prensibine uygun tasarlanmıştır.
 */
class DispatcherServer {
    constructor(appInstance, port) {
        this.app = appInstance;
        this.port = port || process.env.PORT || 3000;
    }

    /**
     * @method start
     * @description Sunucuyu güvenli bir şekilde ayağa kaldırır ve loglar.
     */
    start() {
        this.app.listen(this.port, () => {
            console.log(`=========================================`);
            console.log(`DISPATCHER (API GATEWAY) AKTIF`);
            console.log(`Giris Noktasi: http://localhost:${this.port}`);
            console.log(`Durum: TDD Onayli & OOP Yapilandirildi`);
            console.log(`Baslatilma: ${new Date().toLocaleString('tr-TR')}`);
            console.log(`=========================================`);
        });
    }
}

// Dispatcher'i 3000 portunda uyandiriyoruz
const server = new DispatcherServer(app, 3000);
server.start();