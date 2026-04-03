const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

/**
 * @class AuthServiceApp
 * @description Kimlik doğrulama mantığını ve NoSQL veritabanı bağlantısını yönetir.
 */
class AuthServiceApp {
  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.secret = process.env.JWT_SECRET || '9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca7';
    
    this.connectDB();
    this.defineModels();
    this.setupRoutes();
  }

  // 4.2 Teknik İsteri: Gerçek bir NoSQL (MongoDB) motoru kullanımı
  async connectDB() {
    const mongoUri = process.env.MONGO_URI || 'mongodb://mongodb:27017/auth_db';
    try {
      await mongoose.connect(mongoUri);
      console.log('Auth DB: MongoDB bağlantısı başarılı.');
    } catch (err) {
      console.error('Auth DB: Bağlantı hatası!', err.message);
    }
  }

  defineModels() {
    const userSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true },
      password: { type: String, required: true }
    });
    this.User = mongoose.model('User', userSchema);
  }

  setupRoutes() {
    // Richardson Maturity Model - Seviye 2 standartlarına uygun rotalar
    this.app.get('/health', (req, res) => res.status(200).json({ status: 'UP', service: 'auth-service' }));
    
    this.app.post('/register', this.register.bind(this));
    this.app.post('/login', this.login.bind(this));
  }

  async register(req, res) {
    try {
      const { username, password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new this.User({ username, password: hashedPassword });
      await user.save();
      res.status(201).json({ message: 'Kullanıcı başarıyla oluşturuldu.' });
    } catch (err) {
      res.status(400).json({ error: 'Kayıt başarısız: ' + err.message });
    }
  }

  async login(req, res) {
    try {
      const { username, password } = req.body;
      const user = await this.User.findOne({ username });
      
      if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ user: user.username }, this.secret, { expiresIn: '1h' });
        return res.status(200).json({ token });
      }
      res.status(401).json({ error: 'Geçersiz kimlik bilgileri' });
    } catch (err) {
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  }
}

module.exports = new AuthServiceApp().app;