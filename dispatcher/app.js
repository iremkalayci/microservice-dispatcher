const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');

/**
 * @class DispatcherGateway
 * @description Mikroservis trafiğini yöneten merkezi API Gateway.
 * OOP Prensiplerine (Encapsulation, Single Responsibility) uygun tasarlanmıştır.
 */
class DispatcherGateway {
  constructor() {
    this.app = express();
    this.secret = process.env.JWT_SECRET || '9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca7';
    
    // Servis Kayıt Defteri (Registry)
    this.services = {
      users: { target: process.env.USER_SERVICE_URL || 'http://user-service:3001', secure: true },
      products: { target: process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002', secure: true },
      auth: { target: process.env.AUTH_SERVICE_URL || 'http://auth-service:3003', secure: false } // Giriş için token gerekmez!
    };

    this.initializeMiddlewares();
    this.setupRoutes();
  }

  initializeMiddlewares() {
    // Logging Middleware
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
      });
      next();
    });
  }

  /**
   * @method authenticate
   * @description JWT doğrulama işlemi. TDD testlerinde bu metodun davranışı ölçülür.
   */
  authenticate(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: 'Token gerekli' });

    try {
      const decoded = jwt.verify(token, this.secret);
      req.user = decoded;
      next();
    } catch (err) {
      // RMM Seviye 2: Hatalı bilet için 403 (Forbidden) dönüyoruz.
      res.status(403).json({ error: 'Geçersiz veya süresi dolmuş token' });
    }
  }

  setupRoutes() {
    // 1. Sağlık Kontrolü (Health Check)
    this.app.get('/health', (req, res) => {
      res.status(200).json({ status: 'ok', service: 'dispatcher', timestamp: new Date() });
    });

    // 2. Dinamik Proxy Yönlendirmesi
    Object.entries(this.services).forEach(([path, config]) => {
      const middlewares = config.secure ? [this.authenticate.bind(this)] : [];
      
      this.app.use(`/${path}`, ...middlewares, createProxyMiddleware({
        target: config.target,
        changeOrigin: true,
        pathRewrite: { [`^/${path}`]: '' },
        on: {
          proxyReq: (proxyReq, req) => {
            if (req.user) proxyReq.setHeader('X-User-Info', JSON.stringify(req.user));
          },
          error: (err, req, res) => {
            console.error(`[PROXY ERROR] ${config.target}: ${err.message}`);
            if (!res.headersSent) {
              res.status(502).json({ error: 'Servis şu anda erişilemiyor', service: path });
            }
          }
        }
      }));
    });

    // 3. 404 Handler
    this.app.use((req, res) => {
      res.status(404).json({ error: 'Route bulunamadı' });
    });
  }
}

// TDD ve Server.js için export ediyoruz.
const gateway = new DispatcherGateway();
module.exports = gateway.app;