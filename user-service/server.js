const app = require('./app');

/**
 * @class UserServer
 * @description Kullanıcı yönetim servisini başlatan Bootstrap sınıfı.
 * OOP prensiplerine (Encapsulation) uygun olarak ağ katmanını yönetir.
 */
class UserServer {
    constructor(appInstance, port) {
        this.app = appInstance;
        this.port = port || process.env.PORT || 3001;
    }

    /**
     * @method start
     * @description Sunucuyu 3001 portunda güvenli bir şekilde ayağa kaldırır.
     */
    async start() {
        await this.app.connectDB();
        this.app.listen(this.port, () => {
            console.log(`-----------------------------------------`);
            console.log(`USER SERVICE (Profile Management) AKTİF`);
            console.log(`Dahili Port: ${this.port}`);
            console.log(`Veritabanı: MongoDB (user_db)`);
            console.log(`Başlatılma: ${new Date().toLocaleString('tr-TR')}`);
            console.log(`-----------------------------------------`);
        });
    }
}

// Servisi 3001 portunda uyandırıyoruz
const server = new UserServer(app, 3001);
server.start();