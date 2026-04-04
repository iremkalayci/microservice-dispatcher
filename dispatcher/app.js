const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const path = require('path');
const mongoose = require('mongoose'); // Mükemmel izolasyon için eklendi


class DispatcherGateway {
    constructor() {
        this.app = express();
        this.secret = process.env.JWT_SECRET || 'irem_secret_key';
        
        // EKLENDİ: CORS ve JSON Parsing
      
        this.app.use(express.json());
        
        // --- 1. DISPATCHER ÖZEL VERİTABANI BAĞLANTISI ---
        const mongoUri = process.env.DISPATCHER_DB_URI || 'mongodb://dispatcher-db:27017/dispatcher_db';
        if (process.env.NODE_ENV !== 'test') {
            mongoose.connect(mongoUri)
                .then(() => console.log("Dispatcher Özel DB Bağlantısı Başarılı ✅"))
                .catch(err => console.error("Dispatcher DB Bağlantı Hatası ❌:", err));
        }
        // --- 2. LOG ŞEMASI (İster 4.2 & 4.3 Uyumu) ---
        // GÜNCELLENDİ: Koleksiyon ismi 'trafficlogs' olarak sabitlendi ve alanlar Dashboard'a uygun hale getirildi
        this.LogModel = mongoose.model('TrafficLog', new mongoose.Schema({
            method: String,
            endpoint: String, // 'path' yerine 'endpoint' yapıldı (Dashboard ile uyum için)
            statusCode: Number, // 'status' yerine 'statusCode' yapıldı
            responseTime: Number, // 'duration' yerine 'responseTime' yapıldı
            timestamp: { type: Date, default: Date.now },
            clientIp: String
        }, { collection: 'trafficlogs' }));

        this.SERVICES = {
            users: { 
                target: process.env.USER_SERVICE_URL || 'http://user-service:3001', 
                secure: true, 
                description: 'User Management Service', 
                pathRewrite: { '^/users': '' } 
            },
            products: { 
                target: process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002', 
                secure: true, 
                description: 'Product Catalog Service', 
                pathRewrite: { '^/products': '' } 
            },
            orders: { 
                target: process.env.ORDER_SERVICE_URL || 'http://order-service:3004', 
                secure: true, 
                description: 'Order Processing Service', 
                pathRewrite: { '^/orders': '' } 
            },
            auth: { 
                target: process.env.AUTH_SERVICE_URL || 'http://auth-service:3003', 
                secure: false, 
                description: 'Authentication Service', 
                pathRewrite: { '^/auth': '' } 
            }
        };

        this.initializeMiddlewares();
        this.setupRoutes();
    }

    initializeMiddlewares() {
        // Detaylı Loglama Middleware
        this.app.use((req, res, next) => {
            const start = Date.now();
            res.on('finish', async () => {
                const duration = Date.now() - start;
                
                // --- 3. LOGLARI KENDİ DB'SİNE KAYDETME ---
                // EKLENDİ: /api/logs isteklerini loglama ki sonsuz döngü olmasın
                if (process.env.NODE_ENV !== 'test' && !req.path.includes('/api/logs') && !req.path.includes('/dashboard')) {
                    try {
                        await this.LogModel.create({
                            method: req.method,
                            endpoint: req.originalUrl,
                            statusCode: res.statusCode,
                            responseTime: duration,
                            clientIp: req.ip
                        });
                    } catch (e) { console.error("Log kaydedilemedi ❌", e.message); }
                }

                if (process.env.NODE_ENV !== 'test') {
                    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
                }
            });
            next();
        });
    }

    authenticate = (req, res, next) => {
        const authHeader = req.headers['authorization'] || req.headers['Authorization'] || (req.get && req.get('Authorization'));
        if (!authHeader) return res.status(401).json({ error: 'Token gerekli' });

        const parts = authHeader.split(' ');
        const token = parts.length === 2 ? parts[1] : authHeader;

        try {
            const decoded = jwt.verify(token, this.secret);
            req.user = decoded;
            return next();
        } catch (err) {
            return res.status(403).json({ error: 'Geçersiz veya süresi dolmuş token' });
        }
    }

    setupRoutes() {
        this.app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));

        // --- 4. ARAYÜZ İÇİN CANLI LOG ENDPOINT ---
        // GÜNCELLENDİ: '/dispatcher/logs' yerine Dashboard'un beklediği '/api/logs' yapıldı
        this.app.get('/api/logs', async (req, res) => {
            try {
                const logs = await this.LogModel.find().sort({ timestamp: -1 }).limit(50);
                res.json(logs);
            } catch (err) {
                res.status(500).json({ error: "Loglar getirilemedi" });
            }
        });

        this.app.get('/health', (req, res) => {
            const routes = Object.keys(this.SERVICES).map(r => ({ path: `/${r}` }));
            res.status(200).json({ status: 'ok', service: 'dispatcher', uptime: process.uptime(), timestamp: Date.now(), routes });
        });

        this.app.get('/services', (req, res) => {
            const services = Object.entries(this.SERVICES).map(([path, config]) => ({ route: `/${path}`, target: config.target, description: config.description }));
            res.status(200).json({ services });
        });

        // Proxy Yönlendirmeleri
        Object.entries(this.SERVICES).forEach(([path, config]) => {
            const middlewares = config.secure ? [this.authenticate] : [];
            
            this.app.use(`/${path}`, ...middlewares, createProxyMiddleware({
                target: config.target,
                changeOrigin: true,
                pathRewrite: config.pathRewrite,
                on: {
                    proxyReq: (proxyReq, req) => {
                        if (req.user) proxyReq.setHeader('X-User-Info', JSON.stringify(req.user));
                    },
                    error: (err, req, res) => {
                        if (!res.headersSent) {
                            res.status(502).json({ error: 'Servis şu anda erişilemiyor', service: path });
                        }
                    }
                }
            }));
        });

        this.app.use((req, res) => {
            res.status(404).json({ 
                error: 'Route bulunamadı', 
                path: req.originalUrl,
                availableRoutes: ['/health', '/services', ...Object.keys(this.SERVICES).map(s => `/${s}`)]
            });
        });
    }
}

const gateway = new DispatcherGateway();
module.exports = { 
    app: gateway.app, 
    auth: gateway.authenticate.bind(gateway), 
    SERVICES: gateway.SERVICES 
};