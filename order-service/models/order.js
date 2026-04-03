const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    productId: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    status: { type: String, default: 'Hazırlanıyor' } 
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);