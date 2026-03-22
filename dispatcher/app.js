const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');

const app = express();

// AUTH MIDDLEWARE
function auth(req, res, next) {
  const token = req.headers['authorization'];

  if (!token) return res.status(401).send("No token");

  try {
    jwt.verify(token, "SECRET");
    next();
  } catch {
    res.status(403).send("Invalid token");
  }
}

// ROUTING (GATEWAY)
app.use('/users', auth, createProxyMiddleware({
  target: 'http://user-service:3001',
  changeOrigin: true
}));

app.use('/products', auth, createProxyMiddleware({
  target: 'http://product-service:3002',
  changeOrigin: true
}));

module.exports = app;