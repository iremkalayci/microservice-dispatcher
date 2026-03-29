const express = require('express');

/**
 * @class UserService
 * @description Kullanıcı verilerini ve profil işlemlerini yöneten servis.
 * OOP Prensiplerine (SOLID) uygun olarak tasarlanmıştır.
 */
class UserService {
  constructor() {
    this.app = express();
    this.app.use(express.json());
    
    // In-memory User Store
    this.users = this.getInitialData();
    this.nextId = 4;
    this.VALID_ROLES = ['admin', 'user', 'moderator'];

    this.setupRoutes();
  }

  // ISO Zaman Damgası Yardımcısı
  now() { return new Date().toISOString(); }

  // Başlangıç Verileri (Mock Data)
  getInitialData() {
    return [
      { id: 1, name: "Ali Yılmaz", email: "ali@example.com", phone: "+90 532 111 2233", role: "admin", createdAt: this.now(), updatedAt: this.now() },
      { id: 2, name: "Ayşe Demir", email: "ayse@example.com", phone: "+90 533 444 5566", role: "user", createdAt: this.now(), updatedAt: this.now() },
      { id: 3, name: "Mehmet Kaya", email: "mehmet@example.com", phone: "+90 535 777 8899", role: "user", createdAt: this.now(), updatedAt: this.now() }
    ];
  }

  // --- VALIDASYON METODLARI ---
  validateEmail(email) {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  validatePhone(phone) {
    return typeof phone === 'string' && /^\+?[\d\s\-()]{7,20}$/.test(phone);
  }

  setupRoutes() {
    // 1. Sağlık Kontrolü (Health Check)
    this.app.get('/health', (req, res) => res.status(200).json({ status: 'UP', service: 'user-service' }));

    // 2. Kullanıcı İşlemleri (RMM Seviye 2)
    this.app.get('/', this.getAllUsers.bind(this));
    this.app.get('/:id', this.getUserById.bind(this));
    this.app.post('/', this.createUser.bind(this));
    this.app.put('/:id', this.updateUser.bind(this));
    this.app.patch('/:id', this.partialUpdateUser.bind(this));
    this.app.delete('/:id', this.deleteUser.bind(this));
  }

  // --- MANTIK KATMANI (LOGIC) ---

  getAllUsers(req, res) {
    let result = [...this.users];
    
    // Arama ve Filtreleme
    if (req.query.search) {
      const search = req.query.search.toLowerCase();
      result = result.filter(u => u.name.toLowerCase().includes(search) || u.email.toLowerCase().includes(search));
    }
    if (req.query.role) result = result.filter(u => u.role === req.query.role);

    res.status(200).json({ data: result, total: result.length });
  }

  getUserById(req, res) {
    const id = parseInt(req.params.id);
    const user = this.users.find(u => u.id === id);
    if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı" });
    res.status(200).json(user);
  }

  createUser(req, res) {
    const { name, email, phone, role } = req.body;

    // Validasyonlar
    if (!name || !email) return res.status(400).json({ error: "İsim ve email zorunludur" });
    if (!this.validateEmail(email)) return res.status(400).json({ error: "Geçersiz email" });
    
    if (this.users.find(u => u.email === email.trim())) {
      return res.status(409).json({ error: "Bu email zaten kayıtlı" });
    }

    const newUser = {
      id: this.nextId++,
      name: name.trim(),
      email: email.trim(),
      phone: phone || null,
      role: role || 'user',
      createdAt: this.now(),
      updatedAt: this.now()
    };

    this.users.push(newUser);
    res.status(201).json(newUser);
  }

  updateUser(req, res) {
    const id = parseInt(req.params.id);
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return res.status(404).json({ error: "Kullanıcı bulunamadı" });

    // Mevcut veriyi güncelle ve updatedAt damgasını bas
    this.users[index] = { ...this.users[index], ...req.body, updatedAt: this.now() };
    res.status(200).json(this.users[index]);
  }

  deleteUser(req, res) {
    const id = parseInt(req.params.id);
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return res.status(404).json({ error: "Kullanıcı bulunamadı" });

    const deleted = this.users.splice(index, 1);
    res.status(200).json({ message: "Kullanıcı silindi", user: deleted[0] });
  }

  partialUpdateUser(req, res) {
    this.updateUser(req, res);
  }
}

module.exports = new UserService().app;