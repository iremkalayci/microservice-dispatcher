const express = require('express');
const app = express();

app.use(express.json());

// In-memory user store
let users = [
  { id: 1, name: "Ali", email: "ali@example.com" },
  { id: 2, name: "Ayşe", email: "ayse@example.com" }
];
let nextId = 3;

// GET all users
app.get('/', (req, res) => {
  res.json(users);
});

// GET user by id
app.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Geçersiz ID formatı" });
  }
  const user = users.find(u => u.id === id);
  if (!user) {
    return res.status(404).json({ error: "Kullanıcı bulunamadı" });
  }
  res.json(user);
});

// POST create user
app.post('/', (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "name ve email zorunludur" });
  }

  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: "name geçerli bir string olmalıdır" });
  }

  if (typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: "Geçerli bir email adresi giriniz" });
  }

  const duplicate = users.find(u => u.email === email);
  if (duplicate) {
    return res.status(409).json({ error: "Bu email zaten kayıtlı" });
  }

  const newUser = { id: nextId++, name: name.trim(), email: email.trim() };
  users.push(newUser);
  res.status(201).json(newUser);
});

// PUT update user
app.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Geçersiz ID formatı" });
  }

  const userIndex = users.findIndex(u => u.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ error: "Kullanıcı bulunamadı" });
  }

  const { name, email } = req.body;

  if (!name && !email) {
    return res.status(400).json({ error: "Güncellenecek en az bir alan gerekli" });
  }

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: "name geçerli bir string olmalıdır" });
    }
    users[userIndex].name = name.trim();
  }

  if (email !== undefined) {
    if (typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: "Geçerli bir email adresi giriniz" });
    }
    const duplicate = users.find(u => u.email === email && u.id !== id);
    if (duplicate) {
      return res.status(409).json({ error: "Bu email zaten kayıtlı" });
    }
    users[userIndex].email = email.trim();
  }

  res.json(users[userIndex]);
});

// DELETE user
app.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Geçersiz ID formatı" });
  }

  const userIndex = users.findIndex(u => u.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ error: "Kullanıcı bulunamadı" });
  }

  const deleted = users.splice(userIndex, 1)[0];
  res.json({ message: "Kullanıcı silindi", user: deleted });
});

// Reset function for tests
app.resetData = () => {
  users = [
    { id: 1, name: "Ali", email: "ali@example.com" },
    { id: 2, name: "Ayşe", email: "ayse@example.com" }
  ];
  nextId = 3;
};

module.exports = app;