require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());

// Helper: generate ISO timestamp
const now = () => new Date().toISOString();

// In-memory product store with richer data model
let products = [
  {
    id: 1,
    name: "Laptop",
    description: "16GB RAM, 512GB SSD, Intel i7 işlemci",
    price: 15000,
    category: "Elektronik",
    stock: 25,
    createdAt: "2026-01-10T08:00:00.000Z",
    updatedAt: "2026-01-10T08:00:00.000Z"
  },
  {
    id: 2,
    name: "Telefon",
    description: "6.7 inç ekran, 128GB depolama, 5G destekli",
    price: 8000,
    category: "Elektronik",
    stock: 100,
    createdAt: "2026-01-20T12:00:00.000Z",
    updatedAt: "2026-01-20T12:00:00.000Z"
  },
  {
    id: 3,
    name: "Kulaklık",
    description: "Kablosuz, aktif gürültü engelleme, 30 saat pil",
    price: 2500,
    category: "Aksesuar",
    stock: 200,
    createdAt: "2026-02-05T16:30:00.000Z",
    updatedAt: "2026-02-05T16:30:00.000Z"
  },
  {
    id: 4,
    name: "Monitör",
    description: "27 inç 4K IPS, HDR destekli, USB-C bağlantı",
    price: 12000,
    category: "Elektronik",
    stock: 15,
    createdAt: "2026-02-15T10:45:00.000Z",
    updatedAt: "2026-02-15T10:45:00.000Z"
  }
];
let nextId = 5;

const VALID_CATEGORIES = ['Elektronik', 'Aksesuar', 'Giyim', 'Ev & Yaşam', 'Spor', 'Kitap', 'Diğer'];

// GET all products (with search, filter and pagination)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'product-service' });

  // Search by name or description
  if (req.query.search) {
    const search = req.query.search.toLowerCase();
    result = result.filter(p =>
      p.name.toLowerCase().includes(search) ||
      p.description.toLowerCase().includes(search)
    );
  }

  // Filter by category
  if (req.query.category) {
    result = result.filter(p => p.category === req.query.category);
  }

  // Filter by price range
  if (req.query.minPrice) {
    const minPrice = parseFloat(req.query.minPrice);
    if (!isNaN(minPrice)) {
      result = result.filter(p => p.price >= minPrice);
    }
  }
  if (req.query.maxPrice) {
    const maxPrice = parseFloat(req.query.maxPrice);
    if (!isNaN(maxPrice)) {
      result = result.filter(p => p.price <= maxPrice);
    }
  }

  // Filter by stock availability
  if (req.query.inStock === 'true') {
    result = result.filter(p => p.stock > 0);
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

// GET product by id
app.get('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Geçersiz ID formatı" });
  }
  const product = products.find(p => p.id === id);
  if (!product) {
    return res.status(404).json({ error: "Ürün bulunamadı" });
  }
  res.json(product);
});

// POST create product
app.post('/', (req, res) => {
  const { name, description, price, category, stock } = req.body;

  // Required fields
  if (!name || price === undefined || price === null) {
    return res.status(400).json({ error: "name ve price zorunludur" });
  }

  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: "name geçerli bir string olmalıdır" });
  }

  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({ error: "price pozitif bir sayı olmalıdır" });
  }

  // Optional field validations
  if (description !== undefined && (typeof description !== 'string')) {
    return res.status(400).json({ error: "description bir string olmalıdır" });
  }

  if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `Geçersiz kategori. Geçerli kategoriler: ${VALID_CATEGORIES.join(', ')}` });
  }

  if (stock !== undefined) {
    if (typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ error: "stock negatif olmayan bir tam sayı olmalıdır" });
    }
  }

  const timestamp = now();
  const newProduct = {
    id: nextId++,
    name: name.trim(),
    description: description ? description.trim() : "",
    price,
    category: category || 'Diğer',
    stock: stock !== undefined ? stock : 0,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

// PUT update product (full update - requires name and price)
app.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Geçersiz ID formatı" });
  }

  const productIndex = products.findIndex(p => p.id === id);
  if (productIndex === -1) {
    return res.status(404).json({ error: "Ürün bulunamadı" });
  }

  const { name, description, price, category, stock } = req.body;

  if (!name || price === undefined || price === null) {
    return res.status(400).json({ error: "PUT için name ve price zorunludur" });
  }

  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: "name geçerli bir string olmalıdır" });
  }

  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({ error: "price pozitif bir sayı olmalıdır" });
  }

  if (description !== undefined && typeof description !== 'string') {
    return res.status(400).json({ error: "description bir string olmalıdır" });
  }

  if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `Geçersiz kategori. Geçerli kategoriler: ${VALID_CATEGORIES.join(', ')}` });
  }

  if (stock !== undefined) {
    if (typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ error: "stock negatif olmayan bir tam sayı olmalıdır" });
    }
  }

  products[productIndex] = {
    ...products[productIndex],
    name: name.trim(),
    description: description !== undefined ? description.trim() : "",
    price,
    category: category || 'Diğer',
    stock: stock !== undefined ? stock : 0,
    updatedAt: now()
  };

  res.json(products[productIndex]);
});

// PATCH partial update product
app.patch('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Geçersiz ID formatı" });
  }

  const productIndex = products.findIndex(p => p.id === id);
  if (productIndex === -1) {
    return res.status(404).json({ error: "Ürün bulunamadı" });
  }

  const { name, description, price, category, stock } = req.body;

  if (name === undefined && description === undefined && price === undefined && category === undefined && stock === undefined) {
    return res.status(400).json({ error: "Güncellenecek en az bir alan gerekli" });
  }

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: "name geçerli bir string olmalıdır" });
    }
    products[productIndex].name = name.trim();
  }

  if (description !== undefined) {
    if (typeof description !== 'string') {
      return res.status(400).json({ error: "description bir string olmalıdır" });
    }
    products[productIndex].description = description.trim();
  }

  if (price !== undefined) {
    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({ error: "price pozitif bir sayı olmalıdır" });
    }
    products[productIndex].price = price;
  }

  if (category !== undefined) {
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `Geçersiz kategori. Geçerli kategoriler: ${VALID_CATEGORIES.join(', ')}` });
    }
    products[productIndex].category = category;
  }

  if (stock !== undefined) {
    if (typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ error: "stock negatif olmayan bir tam sayı olmalıdır" });
    }
    products[productIndex].stock = stock;
  }

  products[productIndex].updatedAt = now();
  res.json(products[productIndex]);
});

// DELETE product
app.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Geçersiz ID formatı" });
  }

  const productIndex = products.findIndex(p => p.id === id);
  if (productIndex === -1) {
    return res.status(404).json({ error: "Ürün bulunamadı" });
  }

  const deleted = products.splice(productIndex, 1)[0];
  res.json({ message: "Ürün silindi", product: deleted });
});

// Reset function for tests
app.resetData = () => {
  products = [
    {
      id: 1,
      name: "Laptop",
      description: "16GB RAM, 512GB SSD, Intel i7 işlemci",
      price: 15000,
      category: "Elektronik",
      stock: 25,
      createdAt: "2026-01-10T08:00:00.000Z",
      updatedAt: "2026-01-10T08:00:00.000Z"
    },
    {
      id: 2,
      name: "Telefon",
      description: "6.7 inç ekran, 128GB depolama, 5G destekli",
      price: 8000,
      category: "Elektronik",
      stock: 100,
      createdAt: "2026-01-20T12:00:00.000Z",
      updatedAt: "2026-01-20T12:00:00.000Z"
    },
    {
      id: 3,
      name: "Kulaklık",
      description: "Kablosuz, aktif gürültü engelleme, 30 saat pil",
      price: 2500,
      category: "Aksesuar",
      stock: 200,
      createdAt: "2026-02-05T16:30:00.000Z",
      updatedAt: "2026-02-05T16:30:00.000Z"
    },
    {
      id: 4,
      name: "Monitör",
      description: "27 inç 4K IPS, HDR destekli, USB-C bağlantı",
      price: 12000,
      category: "Elektronik",
      stock: 15,
      createdAt: "2026-02-15T10:45:00.000Z",
      updatedAt: "2026-02-15T10:45:00.000Z"
    }
  ];
  nextId = 5;
};

module.exports = app;