const express = require('express');
const app = express();

app.use(express.json());

// In-memory product store
let products = [
  { id: 1, name: "Laptop", price: 15000 },
  { id: 2, name: "Telefon", price: 8000 }
];
let nextId = 3;

// GET all products
app.get('/', (req, res) => {
  res.json(products);
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
  const { name, price } = req.body;

  if (!name || price === undefined || price === null) {
    return res.status(400).json({ error: "name ve price zorunludur" });
  }

  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: "name geçerli bir string olmalıdır" });
  }

  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({ error: "price pozitif bir sayı olmalıdır" });
  }

  const newProduct = { id: nextId++, name: name.trim(), price };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

// PUT update product
app.put('/:id', (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Geçersiz ID formatı" });
  }

  const productIndex = products.findIndex(p => p.id === id);
  if (productIndex === -1) {
    return res.status(404).json({ error: "Ürün bulunamadı" });
  }

  const { name, price } = req.body;

  if (!name && price === undefined) {
    return res.status(400).json({ error: "Güncellenecek en az bir alan gerekli" });
  }

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: "name geçerli bir string olmalıdır" });
    }
    products[productIndex].name = name.trim();
  }

  if (price !== undefined) {
    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({ error: "price pozitif bir sayı olmalıdır" });
    }
    products[productIndex].price = price;
  }

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
    { id: 1, name: "Laptop", price: 15000 },
    { id: 2, name: "Telefon", price: 8000 }
  ];
  nextId = 3;
};

module.exports = app;