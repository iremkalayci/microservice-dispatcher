const app = require('./app');

/**
 * @class AuthServer
 * @description Sunucu başlatma sürecini yöneten Bootstrap sınıfı.
 */
class AuthServer {
    constructor(appInstance, port) {
        this.app = appInstance;
        this.port = port || process.env.PORT || 3003;
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`-----------------------------------------`);
            console.log(`Auth Service (OOP & NoSQL) Aktif!`);
            console.log(`Port: ${this.port}`);
            console.log(`Başlatılma: ${new Date().toLocaleString('tr-TR')}`);
            console.log(`-----------------------------------------`);
        });
    }
}

// 3003 portunda servisi uyandırıyoruz
const server = new AuthServer(app, 3003);
server.start();