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
        this.app.post('/orders', async (req, res) => {
            try {
                const { userId, productId, quantity } = req.body;
                const newOrder = new Order({ userId, productId, quantity });
                await newOrder.save();
                res.status(201).json(newOrder); 
            } catch (error) {
                res.status(400).json({ error: 'Sipariş oluşturulamadı' });
            }
        });

        this.app.get('/orders', async (req, res) => {
            try {
                const orders = await Order.find();
                res.status(200).json({ data: orders });
            } catch (error) {
                res.status(500).json({ error: 'Sunucu hatası' });
            }
        });
    }
}

// Sadece Express uygulamasını dışa aktarıyoruz (Testler için mükemmel)
const orderService = new OrderServiceApplication();
module.exports = orderService.app;