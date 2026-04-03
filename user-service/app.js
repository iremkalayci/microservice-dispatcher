const express = require('express');
const mongoose = require('mongoose');

/**
 * @class UserService
 * @description Kullanıcı verilerini ve profil işlemlerini yöneten servis.
 * MongoDB (Mongoose) ile kalıcı veri depolama.
 * OOP Prensiplerine (SOLID) uygun olarak tasarlanmıştır.
 */
class UserService {
  constructor() {
    this.app = express();
    this.app.use(express.json());
    
    this.VALID_ROLES = ['admin', 'user', 'moderator'];

    this.defineModels();
    this.setupRoutes();

    // Test ortamı için resetData metodunu app üzerine bağla
    this.app.resetData = this.resetData.bind(this);
    // DB bağlantı metodu
    this.app.connectDB = this.connectDB.bind(this);
  }

  // --- VERİTABANI BAĞLANTISI ---
  async connectDB(uri) {
    const mongoUri = uri || process.env.MONGO_URI || 'mongodb://user-db:27017/user_db';
    try {
      await mongoose.connect(mongoUri);
      console.log('User DB: MongoDB bağlantısı başarılı.');
      await this.seedData();
    } catch (err) {
      console.error('User DB: Bağlantı hatası!', err.message);
    }
  }

  // --- MODEL TANIMLARI ---
  defineModels() {
    // Counter schema for auto-increment id
    const counterSchema = new mongoose.Schema({
      _id: { type: String, required: true },
      seq: { type: Number, default: 0 }
    });
    
    // Eğer model zaten tanımlı ise (test ortamı için) tekrar tanımlama
    try {
      this.Counter = mongoose.model('UserCounter');
    } catch {
      this.Counter = mongoose.model('UserCounter', counterSchema);
    }

    const userSchema = new mongoose.Schema({
      id: { type: Number, unique: true, index: true },
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      phone: { type: String, default: null },
      role: { type: String, enum: this.VALID_ROLES, default: 'user' },
      createdAt: { type: String },
      updatedAt: { type: String }
    }, { 
      versionKey: false,
      toJSON: {
        transform: (doc, ret) => {
          delete ret._id;
          return ret;
        }
      }
    });

    // Auto-increment middleware
    userSchema.pre('save', async function() {
      if (this.isNew) {
        const counter = await mongoose.model('UserCounter').findByIdAndUpdate(
          'userId',
          { $inc: { seq: 1 } },
          { returnDocument: 'after', upsert: true }
        );
        this.id = counter.seq;
      }
    });

    try {
      this.User = mongoose.model('User');
    } catch {
      this.User = mongoose.model('User', userSchema);
    }
  }

  // --- SEED DATA ---
  async seedData() {
    const count = await this.User.countDocuments();
    if (count === 0) {
      const now = new Date().toISOString();
      const seedUsers = [
        { name: "Ali Yılmaz", email: "ali@example.com", phone: "+90 532 111 2233", role: "admin", createdAt: now, updatedAt: now },
        { name: "Ayşe Demir", email: "ayse@example.com", phone: "+90 533 444 5566", role: "user", createdAt: now, updatedAt: now },
        { name: "Mehmet Kaya", email: "mehmet@example.com", phone: "+90 535 777 8899", role: "user", createdAt: now, updatedAt: now }
      ];
      
      for (const userData of seedUsers) {
        const user = new this.User(userData);
        await user.save();
      }
      console.log('User DB: Seed data yüklendi (3 kullanıcı).');
    }
  }

  // Test ortamı için veriyi sıfırla
  async resetData() {
    await this.User.deleteMany({});
    await this.Counter.deleteMany({});
    
    const now = new Date().toISOString();
    const seedUsers = [
      { name: "Ali Yılmaz", email: "ali@example.com", phone: "+90 532 111 2233", role: "admin", createdAt: now, updatedAt: now },
      { name: "Ayşe Demir", email: "ayse@example.com", phone: "+90 533 444 5566", role: "user", createdAt: now, updatedAt: now },
      { name: "Mehmet Kaya", email: "mehmet@example.com", phone: "+90 535 777 8899", role: "user", createdAt: now, updatedAt: now }
    ];
    
    for (const userData of seedUsers) {
      const user = new this.User(userData);
      await user.save();
    }
  }

  // --- VALIDASYON METODLARI ---
  validateEmail(email) {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  validatePhone(phone) {
    return typeof phone === 'string' && /^\+?[\d\s\-()]{7,20}$/.test(phone);
  }

  // --- ROUTE TANIMLARI ---
  setupRoutes() {
    // 1. Sağlık Kontrolü (Health Check)
    this.app.get('/health', (req, res) => {
      const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
      res.status(200).json({ status: 'UP', service: 'user-service', database: dbState });
    });

    // 2. Kullanıcı İşlemleri (RMM Seviye 2)
    this.app.get('/', this.getAllUsers.bind(this));
    this.app.get('/:id', this.getUserById.bind(this));
    this.app.post('/', this.createUser.bind(this));
    this.app.put('/:id', this.updateUser.bind(this));
    this.app.patch('/:id', this.partialUpdateUser.bind(this));
    this.app.delete('/:id', this.deleteUser.bind(this));
  }

  // --- MANTIK KATMANI (LOGIC) ---

  async getAllUsers(req, res) {
    try {
      let query = {};

      // Arama
      if (req.query.search) {
        const search = req.query.search.toLowerCase();
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      // Filtreleme
      if (req.query.role) query.role = req.query.role;

      // Sıralama
      let sort = {};
      if (req.query.sortBy) {
        const order = req.query.order === 'desc' ? -1 : 1;
        sort[req.query.sortBy] = order;
      } else {
        sort.id = 1;
      }

      const total = await this.User.countDocuments(query);

      // Sayfalama
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || total || 10;
      const skip = (page - 1) * limit;
      const totalPages = Math.ceil(total / limit) || 1;

      const users = await this.User.find(query).sort(sort).skip(skip).limit(limit);

      res.status(200).json({
        data: users,
        total: users.length,
        pagination: {
          total,
          page,
          limit,
          totalPages
        }
      });
    } catch (err) {
      res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
    }
  }

  async getUserById(req, res) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Geçersiz ID formatı" });

      const user = await this.User.findOne({ id });
      if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı" });
      res.status(200).json(user);
    } catch (err) {
      res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
    }
  }

  async createUser(req, res) {
    try {
      const { name, email, phone, role } = req.body;

      // Validasyonlar
      if (!name || !email) return res.status(400).json({ error: "İsim ve email zorunludur" });
      if (typeof name !== 'string') return res.status(400).json({ error: "İsim metin olmalıdır" });
      if (name.trim().length === 0) return res.status(400).json({ error: "İsim boş olamaz" });
      if (!this.validateEmail(email)) return res.status(400).json({ error: "Geçersiz email" });
      if (phone && !this.validatePhone(phone)) return res.status(400).json({ error: "Geçersiz telefon numarası" });
      if (role && !this.VALID_ROLES.includes(role)) return res.status(400).json({ error: "Geçersiz rol" });

      // Duplicate email kontrolü
      const existing = await this.User.findOne({ email: email.trim() });
      if (existing) return res.status(409).json({ error: "Bu email zaten kayıtlı" });

      const now = new Date().toISOString();
      const newUser = new this.User({
        name: name.trim(),
        email: email.trim(),
        phone: phone || null,
        role: role || 'user',
        createdAt: now,
        updatedAt: now
      });

      await newUser.save();
      res.status(201).json(newUser);
    } catch (err) {
      res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
    }
  }

  async updateUser(req, res) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Geçersiz ID formatı" });

      const user = await this.User.findOne({ id });
      if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı" });

      const { name, email, phone, role } = req.body;

      // PUT validasyonları — name ve email zorunlu
      if (!name || !email) return res.status(400).json({ error: "İsim ve email zorunludur" });
      if (typeof name !== 'string') return res.status(400).json({ error: "İsim metin olmalıdır" });
      if (name.trim().length === 0) return res.status(400).json({ error: "İsim boş olamaz" });
      if (!this.validateEmail(email)) return res.status(400).json({ error: "Geçersiz email" });
      if (phone && !this.validatePhone(phone)) return res.status(400).json({ error: "Geçersiz telefon numarası" });
      if (role && !this.VALID_ROLES.includes(role)) return res.status(400).json({ error: "Geçersiz rol" });

      // Duplicate email (başka kullanıcıya ait mi?)
      const emailOwner = await this.User.findOne({ email: email.trim(), id: { $ne: id } });
      if (emailOwner) return res.status(409).json({ error: "Bu email başka bir kullanıcıya ait" });

      user.name = name.trim();
      user.email = email.trim();
      user.phone = phone !== undefined ? phone : user.phone;
      user.role = role || user.role;
      user.updatedAt = new Date().toISOString();

      await user.save();
      res.status(200).json(user);
    } catch (err) {
      res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
    }
  }

  async partialUpdateUser(req, res) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Geçersiz ID formatı" });

      const user = await this.User.findOne({ id });
      if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı" });

      const { name, email, phone, role } = req.body;
      const allowedFields = ['name', 'email', 'phone', 'role'];
      const providedFields = Object.keys(req.body).filter(k => allowedFields.includes(k));
      
      if (providedFields.length === 0) return res.status(400).json({ error: "En az bir alan gerekli" });

      // PATCH validasyonları — sadece gönderilen alanlar
      if (name !== undefined) {
        if (typeof name !== 'string') return res.status(400).json({ error: "İsim metin olmalıdır" });
        if (name.trim().length === 0) return res.status(400).json({ error: "İsim boş olamaz" });
        user.name = name.trim();
      }
      if (email !== undefined) {
        if (!this.validateEmail(email)) return res.status(400).json({ error: "Geçersiz email" });
        const emailOwner = await this.User.findOne({ email: email.trim(), id: { $ne: id } });
        if (emailOwner) return res.status(409).json({ error: "Bu email başka bir kullanıcıya ait" });
        user.email = email.trim();
      }
      if (phone !== undefined) {
        if (phone && !this.validatePhone(phone)) return res.status(400).json({ error: "Geçersiz telefon numarası" });
        user.phone = phone;
      }
      if (role !== undefined) {
        if (!this.VALID_ROLES.includes(role)) return res.status(400).json({ error: "Geçersiz rol" });
        user.role = role;
      }

      user.updatedAt = new Date().toISOString();
      await user.save();
      res.status(200).json(user);
    } catch (err) {
      res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
    }
  }

  async deleteUser(req, res) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Geçersiz ID formatı" });

      const user = await this.User.findOneAndDelete({ id });
      if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı" });

      res.status(200).json({ message: "Kullanıcı silindi", user });
    } catch (err) {
      res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
    }
  }
}

const service = new UserService();
module.exports = service.app;