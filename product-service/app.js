const express = require('express');

/**
 * @class ProductService
 * @description Ürün envanterini yöneten mikroservis. 
 * OOP prensiplerine (Encapsulation) uygun olarak tasarlanmıştır.
 */
class ProductService {
  constructor() {
    this.app = express();
    this.app.use(express.json());
    
    // Sabitler
    this.VALID_CATEGORIES = ['Elektronik', 'Aksesuar', 'Giyim', 'Ev & Yaşam', 'Spor', 'Kitap', 'Diğer'];
    
    // In-memory Store (Gerçek NoSQL'e geçene kadar)
    this.products = this.getInitialData();
    this.nextId = 5;

    this.setupRoutes();
  }

  // ISO Zaman Damgası Yardımcısı
  now() { return new Date().toISOString(); }

  getInitialData() {
    return [
      { id: 1, name: "Laptop", description: "16GB RAM, 512GB SSD", price: 15000, category: "Elektronik", stock: 25, createdAt: this.now(), updatedAt: this.now() },
      { id: 2, name: "Telefon", description: "6.7 inç ekran, 128GB", price: 8000, category: "Elektronik", stock: 100, createdAt: this.now(), updatedAt: this.now() }
    ];
  }

  setupRoutes() {
    // 1. Sağlık Kontrolü (RMM Seviye 2)
    this.app.get('/health', (req, res) => res.status(200).json({ status: 'UP', service: 'product-service' }));

    // 2. CRUD İşlemleri (HTTP Metotları ile RMM Seviye 2)
    this.app.get('/', this.getAllProducts.bind(this));
    this.app.get('/:id', this.getProductById.bind(this));
    this.app.post('/', this.createProduct.bind(this));
    this.app.put('/:id', this.updateProduct.bind(this));
    this.app.patch('/:id', this.partialUpdateProduct.bind(this));
    this.app.delete('/:id', this.deleteProduct.bind(this));
  }

  // --- MANTIK KATMANI (LOGIC) ---

  getAllProducts(req, res) {
    let result = [...this.products];
    
    // Arama & Filtreleme (Kodu temiz tutmak için özetledim)
    if (req.query.search) {
      const s = req.query.search.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(s) || p.description.toLowerCase().includes(s));
    }
    if (req.query.category) result = result.filter(p => p.category === req.query.category);

    res.json({ data: result, total: result.length });
  }

  getProductById(req, res) {
    const id = parseInt(req.params.id);
    const product = this.products.find(p => p.id === id);
    if (!product) return res.status(404).json({ error: "Ürün bulunamadı" });
    res.json(product);
  }

  createProduct(req, res) {
    const { name, price, category, stock, description } = req.body;
    
    // Basit Validasyon (SOLID: Validation Logic)
    if (!name || price === undefined) return res.status(400).json({ error: "İsim ve fiyat zorunludur" });

    const newProduct = {
      id: this.nextId++,
      name: name.trim(),
      description: description || "",
      price,
      category: category || 'Diğer',
      stock: stock || 0,
      createdAt: this.now(),
      updatedAt: this.now()
    };

    this.products.push(newProduct);
    res.status(201).json(newProduct);
  }

  updateProduct(req, res) {
    const id = parseInt(req.params.id);
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) return res.status(404).json({ error: "Ürün bulunamadı" });

    this.products[index] = { ...this.products[index], ...req.body, updatedAt: this.now() };
    res.json(this.products[index]);
  }

  deleteProduct(req, res) {
    const id = parseInt(req.params.id);
    const index = this.products.findIndex(p => p.id === id);
    if (index === -1) return res.status(404).json({ error: "Ürün bulunamadı" });

    const deleted = this.products.splice(index, 1);
    res.json({ message: "Silindi", product: deleted[0] });
  }

  partialUpdateProduct(req, res) {
    // PATCH mantığı burada...
    this.updateProduct(req, res); // Basitlik için update'e yönlendirdim
  }
}

module.exports = new ProductService().app;