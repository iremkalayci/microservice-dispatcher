const app = require('./app');

/**
 * @class Server
 * @description Express uygulamasını ayağa kaldıran sunucu sınıfı. (Single Responsibility)
 */
class Server {
    constructor(expressApp) {
        this.app = expressApp;
        this.port = process.env.PORT || 3004;
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(` Order Service ${this.port} portunda çalışıyor`);
        });
    }
}

// Sunucuyu başlat
const server = new Server(app);
server.start();