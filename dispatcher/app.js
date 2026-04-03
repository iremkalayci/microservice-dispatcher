const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const path = require('path');
const mongoose = require('mongoose'); // Mükemmel izolasyon için eklendi

class DispatcherGateway {
    constructor() {
        this.app = express();
        this.secret = process.env.JWT_SECRET || 'irem_secret_key';
        
        // --- 1. DISPATCHER ÖZEL VERİTABANI BAĞLANTISI ---
        const mongoUri = process.env.DISPATCHER_DB_URI || 'mongodb://dispatcher-db:27017/dispatcher_db';
        mongoose.connect(mongoUri)
            .then(() => console.log("Dispatcher Özel DB Bağlantısı Başarılı ✅"))
            .catch(err => console.error("Dispatcher DB Bağlantı Hatası ❌:", err));

        // --- 2. LOG ŞEMASI (İster 4.2 & 4.3 Uyumu) ---
        this.LogModel = mongoose.model('TrafficLog', new mongoose.Schema({
            method: String,
            path: String,
            status: Number,
            duration: Number,
            timestamp: { type: Date, default: Date.now },
            clientIp: String
        }));

        this.SERVICES = {
            users: { 
                target: process.env.USER_SERVICE_URL || 'http://user-service:3002', 
                secure: true, 
                description: 'User Management Service', 
                pathRewrite: { '^/users': '' } 
            },
            products: { 
                target: process.env.PRODUCT_SERVICE_URL || 'http://product-service:3005', 
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
                try {
                    await this.LogModel.create({
                        method: req.method,
                        path: req.originalUrl,
                        status: res.statusCode,
                        duration: duration,
                        clientIp: req.ip
                    });
                } catch (e) { console.error("Log kaydedilemedi ❌"); }

                console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
            });
            next();
        });
    }

    authenticate = (req, res, next) => {
        const authHeader = req.headers['authorization'];
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
        this.app.get('/dispatcher/logs', async (req, res) => {
            const logs = await this.LogModel.find().sort({ timestamp: -1 }).limit(50);
            res.json(logs);
        });

        this.app.get('/health', (req, res) => {
            res.status(200).json({ status: 'ok', service: 'dispatcher', uptime: process.uptime() });
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
            res.status(404).json({ error: 'Route bulunamadı', path: req.originalUrl });
        });
    }
}

const gateway = new DispatcherGateway();
module.exports = gateway.app;