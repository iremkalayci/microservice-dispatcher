const express = require('express');
const app = express();

app.use(express.json());

// Helper: generate ISO timestamp
const now = () => new Date().toISOString();

// In-memory user store with richer data model
let users = [
  {
    id: 1,
    name: "Ali Yılmaz",
    email: "ali@example.com",
    phone: "+90 532 111 2233",
    role: "admin",
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-01-15T10:00:00.000Z"
  },
  {
    id: 2,
    name: "Ayşe Demir",
    email: "ayse@example.com",
    phone: "+90 533 444 5566",
    role: "user",
    createdAt: "2026-02-20T14:30:00.000Z",
    updatedAt: "2026-02-20T14:30:00.000Z"
  },
  {
    id: 3,
    name: "Mehmet Kaya",
    email: "mehmet@example.com",
    phone: "+90 535 777 8899",
    role: "user",
    createdAt: "2026-03-01T09:15:00.000Z",
    updatedAt: "2026-03-01T09:15:00.000Z"
  }
];
let nextId = 4;

const VALID_ROLES = ['admin', 'user', 'moderator'];

// Validation helpers
function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validatePhone(phone) {
  // Accept format like +90 5XX XXX XXXX or digits with optional + prefix
  return typeof phone === 'string' && /^\+?[\d\s\-()]{7,20}$/.test(phone);
}

// GET all users (with search, filter and pagination)
app.get('/', (req, res) => {
  let result = [...users];

  // Search by name or email
  if (req.query.search) {
    const search = req.query.search.toLowerCase();
    result = result.filter(u =>
      u.name.toLowerCase().includes(search) ||
      u.email.toLowerCase().includes(search)
    );
  }

  // Filter by role
  if (req.query.role) {
    result = result.filter(u => u.role === req.query.role);
  }

  // Sort (default: id asc)
  const sortBy = req.query.sortBy || 'id';
  const order = req.query.order === 'desc' ? -1 : 1;
  result.sort((a, b) => {
    if (a[sortBy] < b[sortBy]) return -1 * order;
    if (a[sortBy] > b[sortBy]) return 1 * order;
    return 0;
  });

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedResult = result.slice(startIndex, endIndex);

  res.json({
    data: paginatedResult,
    pagination: {
      total: result.length,
      page,
      limit,
      totalPages: Math.ceil(result.length / limit)
    }
  });
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
  const { name, email, phone, role } = req.body;

  // Required fields
  if (!name || !email) {
    return res.status(400).json({ error: "name ve email zorunludur" });
  }

  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: "name geçerli bir string olmalıdır" });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ error: "Geçerli bir email adresi giriniz" });
  }

  // Duplicate email check
  const duplicate = users.find(u => u.email === email.trim());
  if (duplicate) {
    return res.status(409).json({ error: "Bu email zaten kayıtlı" });
  }

  // Optional field validations
  if (phone !== undefined && !validatePhone(phone)) {
    return res.status(400).json({ error: "Geçerli bir telefon numarası giriniz" });
  }

  if (role !== undefined && !VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `Geçersiz rol. Geçerli roller: ${VALID_ROLES.join(', ')}` });
  }

  const timestamp = now();
  const newUser = {
    id: nextId++,
    name: name.trim(),
    email: email.trim(),
    phone: phone ? phone.trim() : null,
    role: role || 'user',
    createdAt: timestamp,
    updatedAt: timestamp
  };
  users.push(newUser);
  res.status(201).json(newUser);
});

// PUT update user (full update - requires name and email)
app.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Geçersiz ID formatı" });
  }

  const userIndex = users.findIndex(u => u.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ error: "Kullanıcı bulunamadı" });
  }

  const { name, email, phone, role } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "PUT için name ve email zorunludur" });
  }

  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: "name geçerli bir string olmalıdır" });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ error: "Geçerli bir email adresi giriniz" });
  }

  const duplicateEmail = users.find(u => u.email === email.trim() && u.id !== id);
  if (duplicateEmail) {
    return res.status(409).json({ error: "Bu email zaten kayıtlı" });
  }

  if (phone !== undefined && phone !== null && !validatePhone(phone)) {
    return res.status(400).json({ error: "Geçerli bir telefon numarası giriniz" });
  }

  if (role !== undefined && !VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `Geçersiz rol. Geçerli roller: ${VALID_ROLES.join(', ')}` });
  }

  users[userIndex] = {
    ...users[userIndex],
    name: name.trim(),
    email: email.trim(),
    phone: phone ? phone.trim() : null,
    role: role || 'user',
    updatedAt: now()
  };

  res.json(users[userIndex]);
});

// PATCH partial update user
app.patch('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Geçersiz ID formatı" });
  }

  const userIndex = users.findIndex(u => u.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ error: "Kullanıcı bulunamadı" });
  }

  const { name, email, phone, role } = req.body;

  if (name === undefined && email === undefined && phone === undefined && role === undefined) {
    return res.status(400).json({ error: "Güncellenecek en az bir alan gerekli" });
  }

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: "name geçerli bir string olmalıdır" });
    }
    users[userIndex].name = name.trim();
  }

  if (email !== undefined) {
    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Geçerli bir email adresi giriniz" });
    }
    const duplicateEmail = users.find(u => u.email === email.trim() && u.id !== id);
    if (duplicateEmail) {
      return res.status(409).json({ error: "Bu email zaten kayıtlı" });
    }
    users[userIndex].email = email.trim();
  }

  if (phone !== undefined) {
    if (phone !== null && !validatePhone(phone)) {
      return res.status(400).json({ error: "Geçerli bir telefon numarası giriniz" });
    }
    users[userIndex].phone = phone ? phone.trim() : null;
  }

  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Geçersiz rol. Geçerli roller: ${VALID_ROLES.join(', ')}` });
    }
    users[userIndex].role = role;
  }

  users[userIndex].updatedAt = now();
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
    {
      id: 1,
      name: "Ali Yılmaz",
      email: "ali@example.com",
      phone: "+90 532 111 2233",
      role: "admin",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z"
    },
    {
      id: 2,
      name: "Ayşe Demir",
      email: "ayse@example.com",
      phone: "+90 533 444 5566",
      role: "user",
      createdAt: "2026-02-20T14:30:00.000Z",
      updatedAt: "2026-02-20T14:30:00.000Z"
    },
    {
      id: 3,
      name: "Mehmet Kaya",
      email: "mehmet@example.com",
      phone: "+90 535 777 8899",
      role: "user",
      createdAt: "2026-03-01T09:15:00.000Z",
      updatedAt: "2026-03-01T09:15:00.000Z"
    }
  ];
  nextId = 4;
};

module.exports = app;