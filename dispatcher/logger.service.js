const winston = require('winston');
const LokiTransport = require('winston-loki');

class LoggerService {
    constructor() {
        if (LoggerService.instance) {
            return LoggerService.instance;
        }

        // Lokal Loki (Docker) veya fallback olarak Cloud
        const LOKI_URL = process.env.LOKI_URL || 'http://loki:3100';

        this.logger = winston.createLogger({
            level: 'info',
            transports: [
                new LokiTransport({
                    host: LOKI_URL,
                    labels: { job: 'dispatcher-service' },
                    json: true,
                    batching: true, 
                    interval: 5,
                    timeout: 5000,
                    replaceTimestamp: true,
                    onConnectionError: (err) => console.error('Loki Bağlantı Hatası:', err.message)
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
            if (req.url === '/health' || req.url === '/metrics' || req.url === '/api/logs' || req.url.includes('/dashboard')) {
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

module.exports = new LoggerService();