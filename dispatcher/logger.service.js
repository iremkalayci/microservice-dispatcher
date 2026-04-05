const winston = require('winston');
const LokiTransport = require('winston-loki');

class LoggerService {
    constructor() {
        // Singleton Pattern: Eğer zaten bir instance varsa onu döndür
        if (LoggerService.instance) {
            return LoggerService.instance;
        }
        const LOKI_URL = 'https://<USER_ID>:<API_KEY>@logs-prod-eu-west-0.grafana.net';

        // Logger objesinin kurgulanması
        this.logger = winston.createLogger({
            level: 'info',
            transports: [
                new LokiTransport({
                    host: LOKI_URL,
                    labels: { job: 'dispatcher-service' },
                    json: true,
                    replaceTimestamp: true,
                    onConnectionError: (err) => console.error('Loki Bağlantı Hatası:', err)
                }),
                new winston.transports.Console() // Terminalde de görelim
            ]
        });

        LoggerService.instance = this;
    }

    // Normal bilgilendirme logları için metod
    logInfo(message, meta = {}) {
        this.logger.info(message, meta);
    }

    // Hata logları için metod
    logError(message, meta = {}) {
        this.logger.error(message, meta);
    }

    // Express.js trafiğini yakalayan özel Middleware metodu
    getHttpMiddleware() {
        return (req, res, next) => {
            this.logger.info({
                message: `HTTP Request: ${req.method} ${req.url}`,
                method: req.method,
                path: req.url,
                ip: req.ip,
                user_agent: req.headers['user-agent']
            });
            next(); // İsteği engellemeden devam ettir
        };
    }
}


module.exports = new LoggerService();