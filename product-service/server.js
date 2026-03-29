const app = require('./app');

/**
 * @class ProductServer
 * @description Ürün servisini başlatan Bootstrap (Başlatıcı) sınıfı.
 * OOP prensiplerine (Encapsulation) uygun olarak sunucu yönetimini sağlar.
 */
class ProductServer {
    constructor(appInstance, port) {
        this.app = appInstance;
        this.port = port || process.env.PORT || 3002;
    }

    /**
     * @method start
     * @description Sunucuyu güvenli bir şekilde dinlemeye alır.
     */
    start() {
        this.app.listen(this.port, () => {
            console.log(`-----------------------------------------`);
            console.log(`PRODUCT SERVICE (Inventory) AKTİF`);
            console.log(` Dahili Port: ${this.port}`);
            console.log(` Mod: Mikroservis / OOP`);
            console.log(`Başlatılma: ${new Date().toLocaleString('tr-TR')}`);
            console.log(`-----------------------------------------`);
        });
    }
}

// Servisi 3002 portunda uyandırıyoruz
const server = new ProductServer(app, 3002);
server.start();