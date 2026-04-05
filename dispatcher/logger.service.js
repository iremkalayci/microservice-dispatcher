const winston = require('winston');
const LokiTransport = require('winston-loki');

class LoggerService {
    constructor() {
        if (LoggerService.instance) {
            return LoggerService.instance;
        }

        const LOKI_URL = 'https://logs-prod-039.grafana.net';
        const LOKI_USER = '1541023';
        const LOKI_TOKEN = 'glc_eyJvIjoiMTcyMTQwOCIsIm4iOiJtaWNyb3NlcnZpY2UtZGlzcGF0Y2hlci1pcmVta2FsYXljaSIsImsiOiJzVGE1NEw4WjQ1MDcxd0VwMHFIWkxlMWoiLCJtIjp7InIiOiJwcm9kLWV1LWNlbnRyYWwtMCJ9fQ==';

        this.logger = winston.createLogger({
            level: 'info',
            transports: [
                new LokiTransport({
                    host: LOKI_URL,
                    basicAuth: `${LOKI_USER}:${LOKI_TOKEN}`,
                    labels: { job: 'dispatcher-service' },
                    json: true,
                    // 🔥 BURASI KRİTİK: Bağlantı hatalarını engellemek için ekledik
                    batching: true, 
                    interval: 5, // Logları 5 saniyede bir toplu gönder (Sistemi yormaz)
                    timeout: 5000, // 5 saniye içinde cevap gelmezse zorlama
                    replaceTimestamp: true,
                    onConnectionError: (err) => {
                        console.error('Loki Bağlantı Hatası Detayı:', err.message);
                    }
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
            // Sağlık kontrollerini loglamayalım ki Grafana dolmasın
            if (req.url === '/health' || req.url === '/api/logs') {
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