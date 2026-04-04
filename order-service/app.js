const express = require('express');
const mongoose = require('mongoose');
const Order = require('./models/order');

/**
 * @class OrderServiceApplication
 * @description Sipariş mikroservisinin ana sınıfı. Sadece rotaları ve DB'yi ayarlar.
 */
class OrderServiceApplication {
    constructor() {
        this.app = express();
        this.dbUri = process.env.MONGO_URI || 'mongodb://order-db:27017/order_db';

        this.initializeMiddlewares();
        this.setupRoutes();
        this.connectDB();
    }

    initializeMiddlewares() {
        this.app.use(express.json());
    }

    connectDB() {
        mongoose.connect(this.dbUri)
            .then(() => console.log('Order DB Bağlandı'))
            .catch(err => console.error(' DB Hatası:', err));
    }

    setupRoutes() {
        this.app.post('/', async (req, res) => {
            try {
                const { userId, productId, quantity, status } = req.body;
                const newOrder = new Order({ userId, productId, quantity, status });
                await newOrder.save();
                res.status(201).json(newOrder); 
            } catch (error) {
                res.status(400).json({ error: 'Sipariş oluşturulamadı' });
            }
        });

        this.app.get('/', async (req, res) => {
            try {
                const orders = await Order.find();
                res.status(200).json({ data: orders });
            } catch (error) {
                res.status(500).json({ error: 'Sunucu hatası' });
            }
        });

        this.app.get('/:id', async (req, res) => {
            try {
                const order = await Order.findById(req.params.id);
                if (!order) return res.status(404).json({ error: 'Sipariş bulunamadı' });
                res.status(200).json(order);
            } catch (error) {
                res.status(400).json({ error: 'Geçersiz sipariş ID' });
            }
        });

        this.app.put('/:id', async (req, res) => {
            try {
                const { userId, productId, quantity, status } = req.body;
                const updatedOrder = await Order.findByIdAndUpdate(
                    req.params.id,
                    { userId, productId, quantity, status },
                    { new: true, runValidators: true }
                );
                if (!updatedOrder) return res.status(404).json({ error: 'Sipariş bulunamadı' });
                res.status(200).json(updatedOrder);
            } catch (error) {
                res.status(400).json({ error: 'Güncelleme başarısız' });
            }
        });

        this.app.delete('/:id', async (req, res) => {
            try {
                const deletedOrder = await Order.findByIdAndDelete(req.params.id);
                if (!deletedOrder) return res.status(404).json({ error: 'Sipariş bulunamadı' });
                res.status(200).json({ message: 'Sipariş silindi', order: deletedOrder });
            } catch (error) {
                res.status(400).json({ error: 'Silme işlemi başarısız' });
            }
        });
    }
}

// Sadece Express uygulamasını dışa aktarıyoruz (Testler için mükemmel)
const orderService = new OrderServiceApplication();
module.exports = orderService.app;