const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');

const app = express();

// ─── Service Registry ───────────────────────────────────────────
// Tüm downstream servislerin adresleri tek bir yerden yönetilir.
const SERVICES = {
  users: {
    target: process.env.USER_SERVICE_URL || 'http://user-service:3001',
    pathRewrite: { '^/users': '' },
    description: 'Kullanıcı Servisi'
  },
  products: {
    target: process.env.PRODUCT_SERVICE_URL || 'http://product-service:3002',
    pathRewrite: { '^/products': '' },
    description: 'Ürün Servisi'
  },
  auth: {
    target: process.env.AUTH_SERVICE_URL || 'http://auth-service:3003',
    pathRewrite: { '^/auth': '' },
    description: 'Kimlik Doğrulama Servisi'
  }

};

// ─── AUTH MIDDLEWARE ─────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers['authorization'];

  if (!token) return res.status(401).json({ error: 'Token gerekli' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca7');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Geçersiz veya süresi dolmuş token' });
  }
}

// ─── REQUEST LOGGING MIDDLEWARE ─────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ─── HEALTH CHECK ───────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'dispatcher',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    routes: Object.entries(SERVICES).map(([path, cfg]) => ({
      path: `/${path}`,
      target: cfg.target,
      description: cfg.description
    }))
  });
});

// ─── SERVICE INFO ───────────────────────────────────────────────
app.get('/services', (req, res) => {
  res.json({
    services: Object.entries(SERVICES).map(([path, cfg]) => ({
      route: `/${path}`,
      target: cfg.target,
      description: cfg.description
    }))
  });
});

// ─── PROXY ROUTES ───────────────────────────────────────────────
// Her servis için auth middleware + proxy yapılandırması
Object.entries(SERVICES).forEach(([path, config]) => {
  app.use(`/${path}`, auth, createProxyMiddleware({
    target: config.target,
    changeOrigin: true,
    pathRewrite: config.pathRewrite,
    on: {
      proxyReq: (proxyReq, req) => {
        // Forward user info from JWT
        if (req.user) {
          proxyReq.setHeader('X-User-Info', JSON.stringify(req.user));
        }
      },
      error: (err, req, res) => {
        console.error(`[PROXY ERROR] ${req.method} ${req.originalUrl} → ${config.target}: ${err.message}`);
        if (!res.headersSent) {
          res.status(502).json({
            error: 'Servis şu anda erişilemiyor',
            service: path,
            target: config.target
          });
        }
      }
    }
  }));
});

// ─── 404 HANDLER ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'Route bulunamadı',
    path: req.originalUrl,
    availableRoutes: ['/health', '/services', ...Object.keys(SERVICES).map(s => `/${s}`)]
  });
});

module.exports = app;
module.exports.SERVICES = SERVICES;
module.exports.auth = auth;