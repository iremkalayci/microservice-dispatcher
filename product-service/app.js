const express = require('express');
const mongoose = require('mongoose');

/**
 * @class ProductService
 * @description Ürün envanterini yöneten mikroservis. 
 * MongoDB (Mongoose) ile kalıcı veri depolama.
 * OOP prensiplerine (Encapsulation) uygun olarak tasarlanmıştır.
 */
class ProductService {
  constructor() {
    this.app = express();
    this.app.use(express.json());
    
    // Sabitler
    this.VALID_CATEGORIES = ['Elektronik', 'Aksesuar', 'Giyim', 'Ev & Yaşam', 'Spor', 'Kitap', 'Diğer'];

    this.defineModels();
    this.setupRoutes();

    // Test ortamı için resetData metodunu app üzerine bağla
    this.app.resetData = this.resetData.bind(this);
    // DB bağlantı metodu
    this.app.connectDB = this.connectDB.bind(this);
  }

  // --- VERİTABANI BAĞLANTISI ---
  async connectDB(uri) {
    const mongoUri = uri || process.env.MONGO_URI || 'mongodb://mongodb:27017/product_db';
    try {
      await mongoose.connect(mongoUri);
      console.log('Product DB: MongoDB bağlantısı başarılı.');
      await this.seedData();
    } catch (err) {
      console.error('Product DB: Bağlantı hatası!', err.message);
    }
  }

  // --- MODEL TANIMLARI ---
  defineModels() {
    // Counter schema for auto-increment id
    const counterSchema = new mongoose.Schema({
      _id: { type: String, required: true },
      seq: { type: Number, default: 0 }
    });
    
    try {
      this.Counter = mongoose.model('ProductCounter');
    } catch {
      this.Counter = mongoose.model('ProductCounter', counterSchema);
    }

    const productSchema = new mongoose.Schema({
      id: { type: Number, unique: true, index: true },
      name: { type: String, required: true },
      description: { type: String, default: '' },
      price: { type: Number, required: true },
      category: { type: String, enum: this.VALID_CATEGORIES, default: 'Diğer' },
      stock: { type: Number, default: 0 },
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
    productSchema.pre('save', async function() {
      if (this.isNew) {
        const counter = await mongoose.model('ProductCounter').findByIdAndUpdate(
          'productId',
          { $inc: { seq: 1 } },
          { returnDocument: 'after', upsert: true }
        );
        this.id = counter.seq;
      }
    });

    try {
      this.Product = mongoose.model('Product');
    } catch {
      this.Product = mongoose.model('Product', productSchema);
    }
  }

  // --- SEED DATA ---
  async seedData() {
    const count = await this.Product.countDocuments();
    if (count === 0) {
      const now = new Date().toISOString();
      const seedProducts = [
        { name: "Laptop", description: "16GB RAM, 512GB SSD", price: 15000, category: "Elektronik", stock: 25, createdAt: now, updatedAt: now },
        { name: "Telefon", description: "6.7 inç ekran, 128GB", price: 8000, category: "Elektronik", stock: 100, createdAt: now, updatedAt: now },
        { name: "Kulaklık", description: "Kablosuz, gürültü engelleyici", price: 2500, category: "Aksesuar", stock: 200, createdAt: now, updatedAt: now },
        { name: "Monitör", description: "27 inç, 4K, IPS panel", price: 12000, category: "Elektronik", stock: 40, createdAt: now, updatedAt: now }
      ];
      
      for (const productData of seedProducts) {
        const product = new this.Product(productData);
        await product.save();
      }
      console.log('Product DB: Seed data yüklendi (4 ürün).');
    }
  }

  // Test ortamı için veriyi sıfırla
  async resetData() {
    await this.Product.deleteMany({});
    await this.Counter.deleteMany({});
    
    const now = new Date().toISOString();
    const seedProducts = [
      { name: "Laptop", description: "16GB RAM, 512GB SSD", price: 15000, category: "Elektronik", stock: 25, createdAt: now, updatedAt: now },
      { name: "Telefon", description: "6.7 inç ekran, 128GB", price: 8000, category: "Elektronik", stock: 100, createdAt: now, updatedAt: now },
      { name: "Kulaklık", description: "Kablosuz, gürültü engelleyici", price: 2500, category: "Aksesuar", stock: 200, createdAt: now, updatedAt: now },
      { name: "Monitör", description: "27 inç, 4K, IPS panel", price: 12000, category: "Elektronik", stock: 40, createdAt: now, updatedAt: now }
    ];
    
    for (const productData of seedProducts) {
      const product = new this.Product(productData);
      await product.save();
    }
  }

  setupRoutes() {
    // 1. Sağlık Kontrolü (RMM Seviye 2)
    this.app.get('/health', (req, res) => {
      const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
      res.status(200).json({ status: 'UP', service: 'product-service', database: dbState });
    });

    // 2. CRUD İşlemleri (HTTP Metotları ile RMM Seviye 2)
    this.app.get('/', this.getAllProducts.bind(this));
    this.app.get('/:id', this.getProductById.bind(this));
    this.app.post('/', this.createProduct.bind(this));
    this.app.put('/:id', this.updateProduct.bind(this));
    this.app.patch('/:id', this.partialUpdateProduct.bind(this));
    this.app.delete('/:id', this.deleteProduct.bind(this));
  }

  // --- MANTIK KATMANI (LOGIC) ---

  async getAllProducts(req, res) {
    try {
      let query = {};

      // Arama
      if (req.query.search) {
        const search = req.query.search.toLowerCase();
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      // Filtreleme
      if (req.query.category) query.category = req.query.category;
      
      // Fiyat filtresi
      if (req.query.minPrice || req.query.maxPrice) {
        query.price = {};
        if (req.query.minPrice) query.price.$gte = parseFloat(req.query.minPrice);
        if (req.query.maxPrice) query.price.$lte = parseFloat(req.query.maxPrice);
      }

      // Stok filtresi
      if (req.query.inStock === 'true') {
        query.stock = { $gt: 0, ...(query.stock || {}) };
      }

      // Sıralama
      let sort = {};
      if (req.query.sortBy) {
        const order = req.query.order === 'desc' ? -1 : 1;
        sort[req.query.sortBy] = order;
      } else {
        sort.id = 1;
      }

      const total = await this.Product.countDocuments(query);

      // Sayfalama
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || total || 10;
      const skip = (page - 1) * limit;
      const totalPages = Math.ceil(total / limit) || 1;

      const products = await this.Product.find(query).sort(sort).skip(skip).limit(limit);

      res.json({
        data: products,
        total: products.length,
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

  async getProductById(req, res) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Geçersiz ID formatı" });

      const product = await this.Product.findOne({ id });
      if (!product) return res.status(404).json({ error: "Ürün bulunamadı" });
      res.json(product);
    } catch (err) {
      res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
    }
  }

  async createProduct(req, res) {
    try {
      const { name, price, category, stock, description } = req.body;
      
      // Validasyonlar
      if (!name || price === undefined) return res.status(400).json({ error: "İsim ve fiyat zorunludur" });
      if (typeof name !== 'string') return res.status(400).json({ error: "İsim metin olmalıdır" });
      if (name.trim().length === 0) return res.status(400).json({ error: "İsim boş olamaz" });
      if (typeof price !== 'number' || isNaN(price)) return res.status(400).json({ error: "Fiyat geçerli bir sayı olmalıdır" });
      if (price < 0) return res.status(400).json({ error: "Fiyat negatif olamaz" });
      if (category && !this.VALID_CATEGORIES.includes(category)) return res.status(400).json({ error: "Geçersiz kategori" });
      if (stock !== undefined) {
        if (typeof stock !== 'number' || !Number.isInteger(stock)) return res.status(400).json({ error: "Stok tam sayı olmalıdır" });
        if (stock < 0) return res.status(400).json({ error: "Stok negatif olamaz" });
      }

      const now = new Date().toISOString();
      const newProduct = new this.Product({
        name: name.trim(),
        description: description || "",
        price,
        category: category || 'Diğer',
        stock: stock || 0,
        createdAt: now,
        updatedAt: now
      });

      await newProduct.save();
      res.status(201).json(newProduct);
    } catch (err) {
      res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
    }
  }

  async updateProduct(req, res) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Geçersiz ID formatı" });

      const product = await this.Product.findOne({ id });
      if (!product) return res.status(404).json({ error: "Ürün bulunamadı" });

      const { name, price, category, stock, description } = req.body;

      // PUT validasyonları — name ve price zorunlu
      if (!name || price === undefined) return res.status(400).json({ error: "İsim ve fiyat zorunludur" });
      if (typeof name !== 'string') return res.status(400).json({ error: "İsim metin olmalıdır" });
      if (name.trim().length === 0) return res.status(400).json({ error: "İsim boş olamaz" });
      if (typeof price !== 'number' || isNaN(price)) return res.status(400).json({ error: "Fiyat geçerli bir sayı olmalıdır" });
      if (price < 0) return res.status(400).json({ error: "Fiyat negatif olamaz" });
      if (category && !this.VALID_CATEGORIES.includes(category)) return res.status(400).json({ error: "Geçersiz kategori" });
      if (stock !== undefined) {
        if (typeof stock !== 'number' || !Number.isInteger(stock)) return res.status(400).json({ error: "Stok tam sayı olmalıdır" });
        if (stock < 0) return res.status(400).json({ error: "Stok negatif olamaz" });
      }

      product.name = name.trim();
      product.description = description !== undefined ? description : product.description;
      product.price = price;
      product.category = category || product.category;
      product.stock = stock !== undefined ? stock : product.stock;
      product.updatedAt = new Date().toISOString();

      await product.save();
      res.json(product);
    } catch (err) {
      res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
    }
  }

  async partialUpdateProduct(req, res) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Geçersiz ID formatı" });

      const product = await this.Product.findOne({ id });
      if (!product) return res.status(404).json({ error: "Ürün bulunamadı" });

      const { name, price, category, stock, description } = req.body;
      const allowedFields = ['name', 'price', 'category', 'stock', 'description'];
      const providedFields = Object.keys(req.body).filter(k => allowedFields.includes(k));
      
      if (providedFields.length === 0) return res.status(400).json({ error: "En az bir alan gerekli" });

      // PATCH validasyonları
      if (name !== undefined) {
        if (typeof name !== 'string') return res.status(400).json({ error: "İsim metin olmalıdır" });
        if (name.trim().length === 0) return res.status(400).json({ error: "İsim boş olamaz" });
        product.name = name.trim();
      }
      if (price !== undefined) {
        if (typeof price !== 'number' || isNaN(price)) return res.status(400).json({ error: "Fiyat geçerli bir sayı olmalıdır" });
        if (price < 0) return res.status(400).json({ error: "Fiyat negatif olamaz" });
        product.price = price;
      }
      if (category !== undefined) {
        if (!this.VALID_CATEGORIES.includes(category)) return res.status(400).json({ error: "Geçersiz kategori" });
        product.category = category;
      }
      if (stock !== undefined) {
        if (typeof stock !== 'number' || !Number.isInteger(stock)) return res.status(400).json({ error: "Stok tam sayı olmalıdır" });
        if (stock < 0) return res.status(400).json({ error: "Stok negatif olamaz" });
        product.stock = stock;
      }
      if (description !== undefined) {
        product.description = description;
      }

      product.updatedAt = new Date().toISOString();
      await product.save();
      res.json(product);
    } catch (err) {
      res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
    }
  }

  async deleteProduct(req, res) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Geçersiz ID formatı" });

      const product = await this.Product.findOneAndDelete({ id });
      if (!product) return res.status(404).json({ error: "Ürün bulunamadı" });

      res.json({ message: "Silindi", product });
    } catch (err) {
      res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
    }
  }
}

const service = new ProductService();
module.exports = service.app;