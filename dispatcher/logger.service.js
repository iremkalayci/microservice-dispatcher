const winston = require('winston');
const LokiTransport = require('winston-loki');

class LoggerService {
    constructor() {
        if (LoggerService.instance) {
            return LoggerService.instance;
        }

        // Değişkenleri tanımlıyoruz
        const LOKI_URL = 'https://logs-prod-039.grafana.net';
        const LOKI_USER = '1541023';
        // Şifreyi Docker/Environment üzerinden çekiyoruz (GitHub engeline takılmamak için)
        const LOKI_TOKEN = process.env.LOKI_TOKEN; 

        this.logger = winston.createLogger({
            level: 'info',
            transports: [
                new LokiTransport({
                    host: LOKI_URL,
                    basicAuth: `${LOKI_USER}:${LOKI_TOKEN}`,
                    labels: { job: 'dispatcher-service' },
                    json: true,
                    batching: true, 
                    interval: 5,
                    timeout: 5000,
                    replaceTimestamp: true,
                    onConnectionError: (err) => console.error('Loki Bağlantı Hatası Detayı:', err.message)
                }),
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                })
            ]
        });

        LoggerService.instance = this;
    }

    logInfo(message, meta = {}) {
        this.logger.info(message, meta);
    }

    logError(message, meta = {}) {
        this.logger.error(message, meta);
    }

    getHttpMiddleware() {
        return (req, res, next) => {
            // Dashboard'un kendi isteklerini loglamıyoruz ki kalabalık olmasın
            if (req.url === '/health' || req.url === '/api/logs' || req.url.includes('/dashboard')) {
                return next();
            }

            this.logger.info({
                message: `HTTP Request: ${req.method} ${req.url}`,
                method: req.method,
                path: req.url,
                ip: req.ip
            });
            next();
        };
    }
}

// Singleton olarak dışarı aktar
module.exports = new LoggerService();